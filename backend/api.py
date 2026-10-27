"""
api.py - a small web API around the saved models, for the Next.js UI in web/.

    uvicorn api:app --reload --port 8000      # run from the project folder, after train.py
                                              # (and future_ckd.py for the Part 2 page)

Part 1 - does the patient have CKD now? (models/ckd_model.joblib, from train.py)
    GET  /api/meta             model name + test scores, the form fields (groups, labels,
                               units, yes/no options, starting values), example patients
    POST /api/predict          {"record": {"age": 48, "sc": 1.2, "htn": "no", ...}}

Part 2 - will the patient develop CKD later? (models/future_ckd_model.joblib, from future_ckd.py)
    GET  /api/future/meta      same shape as /api/meta
    POST /api/future/predict   {"record": {"AgeBaseline": 60, "HistoryDiabetes": "yes", ...}}

Both predict calls answer {"prediction": ..., "positive": true/false,
"probability_ckd": 0.83, "missing_features": [...]}. A missing field or null means
"not measured" and is filled in by the model's imputer.

Part 1 uses the same cleaning (prepare.py) and saved model (predict.py) as app.py, so the
Streamlit app and the Next.js UI always give the same answer. Restart after re-training.
"""
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from predict import EXAMPLES, load_bundle, predict_patient
from prepare import BINARY_MAPS, FEATURE_INFO, FORM_GROUPS, FORM_STEP

FUTURE_MODEL_PATH = Path(__file__).parent / "models" / "future_ckd_model.joblib"
OPTION_LABELS = {"notpresent": "not present"}  # nicer text on the form buttons

app = FastAPI(title="CKD Risk Predictor API")
bundle = load_bundle()  # Part 1 - stops with "run `python train.py` first" if there is no model yet
future = joblib.load(FUTURE_MODEL_PATH) if FUTURE_MODEL_PATH.exists() else None  # Part 2


class PredictRequest(BaseModel):
    # field -> number or text ('yes', 'normal', ...); missing / null = not measured
    record: dict[str, float | str | None]


def percent(x: float) -> str:
    return f"{x * 100:.1f}%"


def check_fields(record: dict, features: list[str]) -> None:
    unknown = sorted(set(record) - set(features))
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown fields: {', '.join(unknown)}")


# --------------------------------------------------------------------------- #
# Part 1 - diagnosis
# --------------------------------------------------------------------------- #
def field_spec(key: str) -> dict:
    """Everything the UI needs to draw one Part 1 form field."""
    name, unit = FEATURE_INFO[key]
    default = bundle["defaults"][key]  # typical value of a patient without CKD
    if key in BINARY_MAPS:
        options = list(BINARY_MAPS[key])  # first option = encoded 0
        return {"key": key, "label": name, "unit": unit, "kind": "choice",
                "options": [{"value": o, "label": OPTION_LABELS.get(o, o)} for o in options],
                "default": options[int(round(default))]}
    step, decimals = FORM_STEP.get(key, (1, 0))
    return {"key": key, "label": name, "unit": unit, "kind": "number",
            "step": step, "decimals": decimals, "default": round(default, decimals)}


@app.get("/api/meta")
def meta():
    m = bundle["metrics"]
    return {
        "model_name": bundle["model_name"],
        "about": f"tested on {m['n_test']} patients it never saw during training.",
        "stats": [{"label": "Accuracy", "value": percent(m["test_accuracy"])},
                  {"label": "Recall", "value": percent(m["test_recall"])},
                  {"label": "ROC-AUC", "value": f"{m['test_roc_auc']:.3f}"}],
        "stats_note": "Recall = the share of CKD patients the model catches. "
                      "Missing a sick patient is the costly mistake.",
        "labels": {"positive": "Likely CKD", "negative": "Unlikely CKD",
                   "probability": "model probability of chronic kidney disease",
                   "start": "The form starts with typical values of patients without CKD."},
        "groups": [{"name": group, "fields": [field_spec(k) for k in keys]}
                   for group, keys in FORM_GROUPS.items()],
        "examples": EXAMPLES,
    }


@app.post("/api/predict")
def predict(req: PredictRequest):
    check_fields(req.record, bundle["features"])
    result = predict_patient(req.record, bundle)
    return {**result, "positive": result["prediction"] == "CKD"}


# --------------------------------------------------------------------------- #
# Part 2 - future risk
# --------------------------------------------------------------------------- #
def require_future() -> dict:
    if future is None:
        raise HTTPException(status_code=503, detail="The Part 2 model is missing - run "
                            "`python future_ckd.py`, then restart the API.")
    return future


@app.get("/api/future/meta")
def future_meta():
    m = require_future()["metrics"]
    return {
        "model_name": future["model_name"],
        "about": f"tested on {m['n_test']} patients it never saw during training "
                 f"({m['n_test_ckd']} of them developed CKD).",
        "stats": [{"label": "ROC-AUC", "value": f"{m['test_roc_auc']:.3f}"},
                  {"label": "Recall", "value": percent(m["test_recall"])},
                  {"label": "Precision", "value": percent(m["test_precision"])}],
        "stats_note": "Recall = the share of future CKD patients the model flags. Only about 1 in 9 "
                      "patients develops CKD, so the model accepts some false alarms to catch them; "
                      "the score ranks patients by risk but overstates the true chance.",
        "labels": {"positive": "Higher risk", "negative": "Lower risk",
                   "probability": "model risk score for developing CKD (stage 3-5) during follow-up",
                   "start": "The form starts with typical values of patients who stayed free of CKD."},
        "groups": future["groups"],
        "examples": future["examples"],
    }


def to_number(value, words: list[str] | None) -> float | None:
    """'yes' / 'male' -> 1, 'no' / 'female' -> 0, numbers stay numbers, anything else -> None."""
    if value is None:
        return None
    if words is not None and isinstance(value, str):
        word = value.strip().lower()
        return float(words.index(word)) if word in words else None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


@app.post("/api/future/predict")
def future_predict(req: PredictRequest):
    b = require_future()
    check_fields(req.record, b["features"])
    row = {c: to_number(req.record.get(c), b["choices"].get(c)) for c in b["features"]}
    X = pd.DataFrame([row], columns=b["features"], dtype=float)
    prob = float(b["pipeline"].predict_proba(X)[0, 1])
    return {
        "prediction": "Higher risk" if prob >= 0.5 else "Lower risk",
        "positive": prob >= 0.5,
        "probability_ckd": prob,
        "missing_features": [c for c in b["features"] if row[c] is None],
    }
