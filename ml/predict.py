"""
predict.py - use the saved model on a new patient.

    python ml/predict.py         # runs a demo prediction

    from predict import load_bundle, predict_patient
    predict_patient({"age": 48, "bp": 80, "sc": 1.2, "hemo": 15.4, "htn": "no", ...})

Any feature you leave out is treated as missing and filled in by the model's
imputer (median / most common value from the training data).
"""
from pathlib import Path

import joblib

from prepare import ROOT, clean_frame

DEFAULT_MODEL_PATH = ROOT / "models" / "ckd_model.joblib"

# Four example patients for demos (this script's demo and the Next.js UI's example buttons),
# mildest first - the page shows them in this order, with a 1-4 level mark. With the saved
# model they score about 0%, 33%, 83% and 100%.
_HEALTHY = {"age": 40, "bp": 70, "sg": 1.025, "al": 0, "su": 0, "rbc": "normal",
            "pc": "normal", "pcc": "notpresent", "ba": "notpresent", "bgr": 100,
            "bu": 30, "sc": 0.9, "sod": 142, "pot": 4.4, "hemo": 15.5, "pcv": 46,
            "wc": 7000, "rc": 5.2, "htn": "no", "dm": "no", "cad": "no",
            "appet": "good", "pe": "no", "ane": "no"}
EXAMPLES = {
    "healthy": _HEALTHY,
    # high blood sugar, raised white cells, borderline hemoglobin - but normal kidney tests.
    # (No diabetes or hypertension here: in this dataset none of the 150 healthy patients
    # has either, so the model reads them as strong signs of CKD.)
    "unwell, kidneys normal": {**_HEALTHY, "age": 60, "bp": 85, "sg": 1.020, "bgr": 160, "bu": 38,
                               "sc": 1.0, "hemo": 13.5, "pcv": 41, "wc": 10500, "rc": 4.7},
    "early (mild) CKD": {**_HEALTHY, "age": 58, "bp": 80, "sg": 1.020, "al": 1, "bgr": 120,
                         "bu": 45, "sc": 1.4, "sod": 138, "pot": 4.6, "hemo": 13.0, "pcv": 40,
                         "wc": 8200, "rc": 4.6},
    "advanced CKD": {**_HEALTHY, "age": 62, "bp": 90, "sg": 1.010, "al": 3, "su": 1,
                     "pc": "abnormal", "bu": 80, "sc": 4.5, "sod": 131, "hemo": 9.8, "pcv": 30,
                     "rc": 3.6, "htn": "yes", "dm": "yes", "appet": "poor", "pe": "yes",
                     "ane": "yes"},
}


def load_bundle(path=DEFAULT_MODEL_PATH):
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"{path} not found - run `python ml/train.py` first.")
    return joblib.load(path)


def predict_patient(record: dict, bundle=None, threshold: float = 0.5) -> dict:
    """Return the predicted label and the model's probability of CKD."""
    import pandas as pd
    bundle = bundle or load_bundle()
    X = clean_frame(pd.DataFrame([record]))[bundle["features"]]
    prob = float(bundle["pipeline"].predict_proba(X)[0, 1])
    return {
        "prediction": "CKD" if prob >= threshold else "Not CKD",
        "probability_ckd": prob,
        "missing_features": [c for c in bundle["features"] if X[c].isna().iloc[0]],
    }


if __name__ == "__main__":
    bundle = load_bundle()
    print("Model:", bundle["model_name"])
    for name, rec in EXAMPLES.items():
        r = predict_patient(rec, bundle)
        print(f"{name:24s} -> {r['prediction']:8s} (P(CKD) = {r['probability_ckd']:.2f})")
