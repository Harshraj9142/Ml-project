"""
api.py - a small web API around the saved model, for the Next.js UI in web/.

    uvicorn api:app --reload --port 8000      # run from the project folder, after train.py

    GET  /api/meta     model name + test scores, the form fields (groups, labels, units,
                       yes/no options, starting values) and the example patients
    POST /api/predict  {"record": {"age": 48, "sc": 1.2, "htn": "no", ...}}
                       -> {"prediction": "Not CKD", "probability_ckd": 0.02, "missing_features": [...]}

Uses the same cleaning (prepare.py) and saved model (predict.py) as app.py, so the
Streamlit app and the Next.js UI always give the same answer. Restart it after re-training.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from predict import EXAMPLES, load_bundle, predict_patient
from prepare import BINARY_MAPS, FEATURE_INFO, FORM_GROUPS, FORM_STEP

OPTION_LABELS = {"notpresent": "not present"}  # nicer text on the form buttons

app = FastAPI(title="CKD Risk Predictor API")
bundle = load_bundle()  # stops with "run `python train.py` first" if there is no model yet


class PredictRequest(BaseModel):
    # field -> number or text ('yes', 'normal', ...); a missing field or null means
    # "not measured" and is filled in by the model's imputer
    record: dict[str, float | str | None]


def field_spec(key: str) -> dict:
    """Everything the UI needs to draw one form field."""
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
        "metrics": {"accuracy": m["test_accuracy"], "precision": m["test_precision"],
                    "recall": m["test_recall"], "roc_auc": m["test_roc_auc"], "n_test": m["n_test"]},
        "groups": [{"name": group, "fields": [field_spec(k) for k in keys]}
                   for group, keys in FORM_GROUPS.items()],
        "examples": EXAMPLES,
    }


@app.post("/api/predict")
def predict(req: PredictRequest):
    unknown = sorted(set(req.record) - set(bundle["features"]))
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown fields: {', '.join(unknown)}")
    return predict_patient(req.record, bundle)
