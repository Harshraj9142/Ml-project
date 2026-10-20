"""
prepare.py - load and clean the Chronic Kidney Disease (CKD) dataset.

Works with either version of the same 400-patient dataset:
  * Kaggle  "kidney_disease.csv"  (has an 'id' column, target named 'classification')
  * UCI     CSV export            (target named 'class')

The raw file is messy: tabs and spaces inside values ('\tno', 'ckd\t', '\t43'),
'?' for missing values, and numbers stored as text. Everything is fixed here so
the training script and the app share exactly the same cleaning.
"""
from pathlib import Path

import numpy as np
import pandas as pd

NUMERIC_COLS = ["age", "bp", "sg", "al", "su", "bgr", "bu", "sc",
                "sod", "pot", "hemo", "pcv", "wc", "rc"]

# Each yes/no-style column -> how its text values become 0/1.
# The first label in each map is 0 (the "normal" value).
BINARY_MAPS = {
    "rbc":   {"normal": 0, "abnormal": 1},
    "pc":    {"normal": 0, "abnormal": 1},
    "pcc":   {"notpresent": 0, "present": 1},
    "ba":    {"notpresent": 0, "present": 1},
    "htn":   {"no": 0, "yes": 1},
    "dm":    {"no": 0, "yes": 1},
    "cad":   {"no": 0, "yes": 1},
    "appet": {"good": 0, "poor": 1},
    "pe":    {"no": 0, "yes": 1},
    "ane":   {"no": 0, "yes": 1},
}
BINARY_COLS = list(BINARY_MAPS)
FEATURES = NUMERIC_COLS + BINARY_COLS
TARGET = "class"

# Readable names + units, used for plots and the web form.
FEATURE_INFO = {
    "age":   ("Age", "years"),
    "bp":    ("Blood pressure", "mm Hg"),
    "sg":    ("Urine specific gravity", ""),
    "al":    ("Albumin in urine", "0-5"),
    "su":    ("Sugar in urine", "0-5"),
    "rbc":   ("Red blood cells (urine)", ""),
    "pc":    ("Pus cells", ""),
    "pcc":   ("Pus cell clumps", ""),
    "ba":    ("Bacteria", ""),
    "bgr":   ("Blood glucose (random)", "mg/dL"),
    "bu":    ("Blood urea", "mg/dL"),
    "sc":    ("Serum creatinine", "mg/dL"),
    "sod":   ("Sodium", "mEq/L"),
    "pot":   ("Potassium", "mEq/L"),
    "hemo":  ("Hemoglobin", "g/dL"),
    "pcv":   ("Packed cell volume", "%"),
    "wc":    ("White blood cell count", "cells/cumm"),
    "rc":    ("Red blood cell count", "millions/cmm"),
    "htn":   ("Hypertension", ""),
    "dm":    ("Diabetes mellitus", ""),
    "cad":   ("Coronary artery disease", ""),
    "appet": ("Appetite", ""),
    "pe":    ("Pedal edema", ""),
    "ane":   ("Anemia", ""),
}

# How the web forms (app.py, and api.py for the Next.js UI) group and step the fields.
FORM_GROUPS = {
    "Vitals": ["age", "bp"],
    "Urine test": ["sg", "al", "su", "rbc", "pc", "pcc", "ba"],
    "Blood test": ["bgr", "bu", "sc", "sod", "pot", "hemo", "pcv", "wc", "rc"],
    "Medical history": ["htn", "dm", "cad", "appet", "pe", "ane"],
}
# numeric field -> (step size, decimals shown); fields not listed step by 1 with no decimals
FORM_STEP = {"sg": (0.005, 3), "al": (1, 0), "su": (1, 0), "sc": (0.1, 1), "pot": (0.1, 1),
             "hemo": (0.1, 1), "rc": (0.1, 1), "wc": (100, 0)}

_MISSING_TOKENS = {"?", "", "nan", "<na>", "none"}
_ALREADY_ENCODED = {"0": 0, "1": 1, "0.0": 0, "1.0": 1}


def _tidy_one(value):
    if pd.isna(value):
        return np.nan
    value = str(value).strip().lower()
    return np.nan if value in _MISSING_TOKENS else value


def _tidy_text(series: pd.Series) -> pd.Series:
    """Lower-case, strip tabs/spaces, and turn '?' or blanks into NaN."""
    return series.astype(object).map(_tidy_one)


def clean_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Return a numeric DataFrame with exactly FEATURES as float columns.

    Accepts raw rows from the CSV or a dict-like record from the app
    (numbers or text such as 'yes'/'no'). Unknown or missing values -> NaN,
    which the model's imputer fills in later.
    """
    df = df.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]

    out = pd.DataFrame(index=df.index)
    for col in NUMERIC_COLS:
        raw = df[col] if col in df else pd.Series(np.nan, index=df.index)
        out[col] = pd.to_numeric(_tidy_text(raw), errors="coerce").astype("float64")
    for col, mapping in BINARY_MAPS.items():
        raw = df[col] if col in df else pd.Series(np.nan, index=df.index)
        text = _tidy_text(raw)
        # text labels ('yes', 'abnormal', ...) or already-encoded 0/1 both work
        mapped = text.map(lambda v: mapping.get(v, _ALREADY_ENCODED.get(v, np.nan))
                          if isinstance(v, str) else np.nan)
        out[col] = mapped.astype("float64")
    return out[FEATURES]


def clean_target(series: pd.Series) -> pd.Series:
    """'ckd' -> 1, 'notckd' -> 0 (handles stray tabs/dots like 'ckd\\t')."""
    s = _tidy_text(series).map(lambda v: v.replace(".", "") if isinstance(v, str) else v)
    return s.map({"ckd": 1, "notckd": 0})


def load_data(path: str | Path):
    """Read the CSV and return (X, y) ready for scikit-learn."""
    df = pd.read_csv(path)
    df.columns = [str(c).strip().lower() for c in df.columns]
    if "classification" in df.columns:
        df = df.rename(columns={"classification": TARGET})
    if TARGET not in df.columns:
        raise ValueError(f"No 'class' or 'classification' column in {path}. "
                         f"Columns found: {list(df.columns)}")
    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        raise ValueError(f"These expected columns are missing from {path}: {missing}")

    y = clean_target(df[TARGET])
    if y.isna().all():
        raise ValueError(
            "Couldn't read any 'ckd' / 'notckd' labels. This looks like a pre-encoded copy "
            "of the data - use the raw kidney_disease.csv "
            "(kaggle.com/datasets/mansoordaku/ckdisease) or the UCI version instead.")
    keep = y.notna()
    if (~keep).any():
        print(f"Dropping {int((~keep).sum())} row(s) with an unreadable class label.")
    X = clean_frame(df.loc[keep])
    y = y.loc[keep].astype(int)
    return X.reset_index(drop=True), y.reset_index(drop=True)


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "data/kidney_disease.csv"
    X, y = load_data(path)
    print("Shape:", X.shape)
    print("Class counts (1 = CKD):\n", y.value_counts())
    print("Missing values per column:\n", X.isna().sum().sort_values(ascending=False))
