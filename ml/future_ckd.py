"""
future_ckd.py - Part 2: predict which patients will DEVELOP chronic kidney disease
(stage 3-5) in the following years, on real hospital data from the UAE.

    python ml/future_ckd.py

Part 1 (train.py) diagnoses CKD that is already there - easy (~99%), because sick
patients' blood tests are clearly abnormal. Here every patient starts WITHOUT CKD
(eGFR >= 60) and the question is who develops it during up to ~9 years of follow-up:
the realistic, harder screening problem.

Data: Al-Shamsi, Regmi & Govender (2018), PLOS ONE 13(6): e0199920 - 491 adults at
Tawam Hospital, Al-Ain, UAE, followed 2008-2017 (CC BY 4.0) -> data/uae_ckd_alshamsi2018.csv
Target: EventCKD35 = 1 if the patient reached CKD stage 3-5 during follow-up (56 of 491, 11.4%).

Only the ML-course classifiers are used. Just 11% of patients develop CKD, so a model
can look 89% "accurate" by always answering "no CKD" - models are judged by ROC-AUC and
recall instead, and logistic regression is also tried with class weights
(class_weight="balanced": a mistake on a rare CKD patient counts about 8x more).

Same 80/20 split idea as train.py: 5-fold CV repeated 10 times on the training set,
the test set is used once at the end.

Outputs
  models/future_ckd_model.joblib        (used by the web app's Part 2 page, via backend/api.py)
  reports/future_model_comparison.csv
  reports/future_ckd_metrics.json
  reports/figures/12_future_model_comparison.png
  reports/figures/13_future_test_results.png
  reports/figures/14_future_risk_factors.png
"""
import argparse
import json
import warnings
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")  # save plots to files, no window needed
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
import sklearn
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (ConfusionMatrixDisplay, RocCurveDisplay, accuracy_score,
                             confusion_matrix, make_scorer, precision_score, recall_score,
                             roc_auc_score)
from sklearn.model_selection import (GridSearchCV, RepeatedStratifiedKFold, cross_validate,
                                     train_test_split)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from prepare import ROOT
from train import RANDOM_STATE, get_models

warnings.filterwarnings("ignore", category=FutureWarning)

TARGET = "EventCKD35"
# not used as inputs: an ID, a duplicate of age, and the follow-up time (only known afterwards)
DROP = ["StudyID", "Age.3.categories", "TimeToEventMonths"]
# column -> readable name (units as in the paper; creatinine in umol/L)
FEATURE_NAMES = {
    "Gender": "Male sex",
    "AgeBaseline": "Age",
    "HistoryDiabetes": "Diabetes",
    "HistoryCHD": "Coronary heart disease",
    "HistoryVascular": "Vascular disease",
    "HistorySmoking": "Smoking",
    "HistoryHTN": "Hypertension",
    "HistoryDLD": "Dyslipidemia",
    "HistoryObesity": "Obesity",
    "DLDmeds": "On cholesterol medicine",
    "DMmeds": "On diabetes medicine",
    "HTNmeds": "On blood-pressure medicine",
    "ACEIARB": "On ACE inhibitor / ARB",
    "CholesterolBaseline": "Cholesterol",
    "TriglyceridesBaseline": "Triglycerides",
    "HgbA1C": "HbA1c (blood sugar control)",
    "CreatnineBaseline": "Creatinine",
    "eGFRBaseline": "eGFR (kidney function)",
    "sBPBaseline": "Systolic blood pressure",
    "dBPBaseline": "Diastolic blood pressure",
    "BMIBaseline": "BMI",
}
# Web form for the Part 2 page: groups of fields, units, words for the 0/1 columns, step sizes
FUTURE_FORM_GROUPS = {
    "Patient": ["Gender", "AgeBaseline", "BMIBaseline"],
    "Medical history": ["HistoryDiabetes", "HistoryHTN", "HistoryCHD", "HistoryVascular",
                        "HistoryDLD", "HistoryObesity", "HistorySmoking"],
    "Medicines": ["DMmeds", "HTNmeds", "ACEIARB", "DLDmeds"],
    "Blood tests and blood pressure": ["eGFRBaseline", "CreatnineBaseline", "HgbA1C",
                                       "CholesterolBaseline", "TriglyceridesBaseline",
                                       "sBPBaseline", "dBPBaseline"],
}
UNITS = {"AgeBaseline": "years", "BMIBaseline": "kg/m²", "eGFRBaseline": "mL/min/1.73 m²",
         "CreatnineBaseline": "µmol/L", "HgbA1C": "%", "CholesterolBaseline": "mmol/L",
         "TriglyceridesBaseline": "mmol/L", "sBPBaseline": "mm Hg", "dBPBaseline": "mm Hg"}
CHOICE_WORDS = {"Gender": ["female", "male"]}  # word for 0, word for 1; other 0/1 columns: no / yes
FORM_LABELS = {"Gender": "Sex"}  # form label when it differs from FEATURE_NAMES (used in charts)
# numeric field -> (step size, decimals shown); fields not listed step by 1 with no decimals
FUTURE_FORM_STEP = {"BMIBaseline": (0.1, 1), "HgbA1C": (0.1, 1), "CholesterolBaseline": (0.1, 1),
                    "TriglyceridesBaseline": (0.01, 2)}

SCORING = {"roc_auc": "roc_auc", "recall": "recall",
           "precision": make_scorer(precision_score, zero_division=0),
           "accuracy": "accuracy", "balanced_accuracy": "balanced_accuracy"}


def get_future_models():
    """The six course classifiers (from train.py) + logistic regression with class weights.
    (estimator, needs scaling?, grid for tuning)"""
    models = get_models()
    models["Logistic Regression (balanced)"] = (
        LogisticRegression(max_iter=2000, class_weight="balanced"), True,
        {"model__C": [0.01, 0.1, 1, 10]})
    return models


def make_pipeline(estimator, scale: bool) -> Pipeline:
    """All columns are numbers or 0/1 here: fill gaps with the median, then scale."""
    steps = [("impute", SimpleImputer(strategy="median"))]
    if scale:
        steps.append(("scale", StandardScaler()))
    return Pipeline(steps + [("model", estimator)])


def web_form(X_train: pd.DataFrame, y_train: pd.Series) -> dict:
    """What the web app's Part 2 page needs: the form fields (starting at the typical
    values of patients who stayed free of CKD), the yes/no words, and two example patients."""
    choices = {c: CHOICE_WORDS.get(c, ["no", "yes"])
               for c in X_train.columns if set(X_train[c].dropna().unique()) <= {0, 1}}

    def typical(group: pd.DataFrame) -> dict:  # median for numbers, most common answer for yes/no
        record = {}
        for c in X_train.columns:
            if c in choices:
                record[c] = choices[c][int(group[c].mode().iloc[0])]
            else:
                record[c] = round(float(group[c].median()), FUTURE_FORM_STEP.get(c, (1, 0))[1])
        return record

    stayed, developed = typical(X_train[y_train == 0]), typical(X_train[y_train == 1])
    groups = []
    for name, cols in FUTURE_FORM_GROUPS.items():
        fields = []
        for c in cols:
            field = {"key": c, "label": FORM_LABELS.get(c, FEATURE_NAMES[c]),
                     "unit": UNITS.get(c, ""), "default": stayed[c]}
            if c in choices:
                field.update(kind="choice", options=[{"value": w, "label": w} for w in choices[c]])
            else:
                step, decimals = FUTURE_FORM_STEP.get(c, (1, 0))
                field.update(kind="number", step=step, decimals=decimals)
            fields.append(field)
        groups.append({"name": name, "fields": fields})
    assert sorted(c for cols in FUTURE_FORM_GROUPS.values() for c in cols) == sorted(X_train.columns)
    return {"choices": choices, "groups": groups,
            "examples": {"typical patient who stayed CKD-free": stayed,
                         "typical patient who developed CKD": developed}}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=ROOT / "data" / "uae_ckd_alshamsi2018.csv", help="path to the CSV")
    ap.add_argument("--out", default=ROOT, help="folder for models/ and reports/")
    ap.add_argument("--repeats", type=int, default=10, help="how many times to repeat 5-fold CV")
    args = ap.parse_args()

    out = Path(args.out)
    fig_dir = out / "reports" / "figures"
    model_dir = out / "models"
    fig_dir.mkdir(parents=True, exist_ok=True)
    model_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load ----------------------------------------------------------------
    df = pd.read_csv(args.data)
    df.columns = [c.strip() for c in df.columns]
    X = df.drop(columns=DROP + [TARGET])
    y = df[TARGET].astype(int)
    print(f"\nLoaded {len(X)} patients, {X.shape[1]} features | developed CKD: {int(y.sum())} "
          f"({y.mean():.1%}), did not: {int((y == 0).sum())}")

    # 2. Split (stratified: same 11% CKD share in train and test) ------------
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)
    print(f"Train: {len(X_train)} ({int(y_train.sum())} CKD)  Test: {len(X_test)} ({int(y_test.sum())} CKD)")

    # 3. Compare models: 5-fold CV repeated on the training set -------------
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=args.repeats, random_state=RANDOM_STATE)
    models = get_future_models()
    candidates = {"Always 'no CKD' (baseline)": (DummyClassifier(strategy="most_frequent"), False, {})}
    candidates.update(models)
    rows = []
    for name, (est, scale, _) in candidates.items():
        res = cross_validate(make_pipeline(est, scale), X_train, y_train,
                             cv=cv, scoring=SCORING, n_jobs=-1)
        row = {"model": name, "gives_probability": hasattr(est, "predict_proba")}
        for m in SCORING:
            row[m] = res[f"test_{m}"].mean()
            row[f"{m}_std"] = res[f"test_{m}"].std()
        rows.append(row)
    comp = pd.DataFrame(rows).sort_values("roc_auc", ascending=False)
    comp.round(4).to_csv(out / "reports" / "future_model_comparison.csv", index=False)
    print(f"\n5-fold CV x {args.repeats} on the training set (mean):")
    print(comp[["model", "roc_auc", "recall", "precision", "accuracy", "balanced_accuracy"]]
          .round(3).to_string(index=False))

    # the perceptron can't separate these patients with a straight line (unlike Part 1)
    slp = make_pipeline(get_models()["SLP (our own code)"][0], True).fit(X_train, y_train)
    errs = slp.named_steps["model"].errors_
    print(f"\nSLP mistakes in its last 5 of {len(errs)} epochs: {errs[-5:]} -> "
          + ("reached 0: linearly separable" if errs[-1] == 0
             else "never reaches 0: NOT linearly separable (Part 1 data reached 0 in 3 epochs)"))

    # chart: ROC-AUC and recall for every model
    sns.set_theme(style="whitegrid")
    order = list(comp["model"])[::-1]
    fig, axes = plt.subplots(1, 2, figsize=(13, 5.5), sharey=True)
    for ax, metric, label in [(axes[0], "roc_auc", "ROC-AUC (0.5 = coin toss, 1 = perfect)"),
                              (axes[1], "recall", "Recall (share of future CKD patients caught)")]:
        vals = comp.set_index("model").loc[order, metric]
        errs_ = comp.set_index("model").loc[order, f"{metric}_std"]
        colors = ["#c0504d" if "balanced" in n else "#9e9e9e" if "baseline" in n else "#4f81bd"
                  for n in order]
        ax.barh(range(len(order)), vals, xerr=errs_, color=colors, height=0.6,
                error_kw={"elinewidth": 1, "ecolor": "#555555"})
        for i, (v, e) in enumerate(zip(vals, errs_)):  # label just past the spread line
            ax.text(min(v + e + 0.02, 0.94), i, f"{v:.2f}", va="center", fontsize=9)
        ax.set(xlim=(0, 1), xlabel=label, yticks=range(len(order)), yticklabels=order)
    axes[0].axvline(0.5, color="#555555", ls="--", lw=1)
    fig.suptitle(f"Part 2 - predicting future CKD: 5-fold CV x {args.repeats} on "
                 f"{len(X_train)} training patients (bar = mean, line = spread)")
    plt.tight_layout(); plt.savefig(fig_dir / "12_future_model_comparison.png", dpi=120); plt.close()

    # 4. Pick + tune: best ROC-AUC among models that give a probability ------
    ranked = [n for n in comp["model"] if n in models and hasattr(models[n][0], "predict_proba")]
    best_name = ranked[0]
    est, scale, grid = models[best_name]
    print(f"\nBest model that gives a probability: {best_name} -> tuning with GridSearchCV ...")
    search = GridSearchCV(make_pipeline(est, scale), grid, cv=cv, scoring="roc_auc", n_jobs=-1)
    search.fit(X_train, y_train)
    model = search.best_estimator_
    print("Best params:", search.best_params_, f"| CV ROC-AUC = {search.best_score_:.3f}")

    # 5. Final evaluation on the untouched test set --------------------------
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    metrics = {
        "model": best_name,
        "best_params": {k.replace("model__", ""): v for k, v in search.best_params_.items()},
        "cv_roc_auc": float(search.best_score_),
        "test_roc_auc": roc_auc_score(y_test, y_prob),
        "test_recall": recall_score(y_test, y_pred),
        "test_precision": precision_score(y_test, y_pred, zero_division=0),
        "test_accuracy": accuracy_score(y_test, y_pred),
        "test_accuracy_always_no_ckd": float((y_test == 0).mean()),
        "test_TP": int(tp), "test_FN": int(fn), "test_FP": int(fp), "test_TN": int(tn),
        "n_train": len(X_train), "n_test": len(X_test), "n_test_ckd": int(y_test.sum()),
    }
    print(f"\nTest set ({len(X_test)} patients, {int(y_test.sum())} developed CKD):")
    print(f"  ROC-AUC {metrics['test_roc_auc']:.3f} | recall {metrics['test_recall']:.3f} "
          f"(caught {tp} of {tp + fn}) | precision {metrics['test_precision']:.3f} "
          f"({fp} false alarms) | accuracy {metrics['test_accuracy']:.3f} "
          f"(always 'no CKD' would score {metrics['test_accuracy_always_no_ckd']:.3f})")

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    ConfusionMatrixDisplay.from_predictions(y_test, y_pred, ax=axes[0], colorbar=False, cmap="Blues",
                                            display_labels=["No CKD", "Developed CKD"])
    axes[0].set_title(f"Confusion matrix (test set)\ncaught {tp} of {tp + fn} future CKD patients, "
                      f"{fp} false alarms", fontsize=10)
    axes[0].grid(False)
    RocCurveDisplay.from_predictions(y_test, y_prob, name=best_name, ax=axes[1])
    axes[1].plot([0, 1], [0, 1], "k--", lw=1)
    axes[1].set_title("ROC curve (test set)", fontsize=10)
    fig.suptitle(f"Part 2 - {best_name} on {len(X_test)} test patients")
    plt.tight_layout(); plt.savefig(fig_dir / "13_future_test_results.png", dpi=120); plt.close()

    # 6. Which baseline factors raise the risk of developing CKD? -------------
    est = model.named_steps["model"]
    if hasattr(est, "coef_"):  # logistic regression: signed weights on scaled inputs
        imp = pd.Series(est.coef_[0], index=X.columns)
        xlabel = "weight in the model (right = raises risk, left = lowers risk)"
    else:
        pi = permutation_importance(model, X_test, y_test, scoring="roc_auc", n_repeats=20,
                                    random_state=RANDOM_STATE, n_jobs=-1)
        imp = pd.Series(pi.importances_mean, index=X.columns)
        xlabel = "drop in ROC-AUC when the feature is shuffled"
    imp.index = [FEATURE_NAMES.get(c, c) for c in imp.index]
    top = imp.reindex(imp.abs().sort_values().index).tail(12)
    ax = top.plot.barh(color=["#c0504d" if v > 0 else "#4f81bd" for v in top], figsize=(9, 5.5))
    ax.axvline(0, color="#555555", lw=1)
    ax.set(title=f"Part 2 - what predicts developing CKD: {best_name}", xlabel=xlabel)
    plt.tight_layout(); plt.savefig(fig_dir / "14_future_risk_factors.png", dpi=120); plt.close()
    metrics["top_factors"] = top.iloc[::-1].round(3).to_dict()
    print("Top factors:", ", ".join(f"{k} ({v:+.2f})" for k, v in list(metrics["top_factors"].items())[:6]))

    # 7. Save the model + what the web app's Part 2 page needs ---------------
    bundle = {
        "pipeline": model,
        "model_name": best_name,
        "features": list(X.columns),
        **web_form(X_train, y_train),  # form fields, yes/no words, example patients
        "sklearn_version": sklearn.__version__,
        "metrics": metrics,
    }
    joblib.dump(bundle, model_dir / "future_ckd_model.joblib")
    with open(out / "reports" / "future_ckd_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2, default=float)
    print(f"\nSaved -> {model_dir / 'future_ckd_model.joblib'}, "
          f"{out / 'reports' / 'future_model_comparison.csv'}, "
          f"{out / 'reports' / 'future_ckd_metrics.json'}, charts 12-14 in {fig_dir}/")


if __name__ == "__main__":
    main()
