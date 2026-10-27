"""
train.py - full training pipeline for CKD prediction.

    python train.py --data data/kidney_disease.csv

Steps
  1. Load + clean data                (prepare.py)
  2. EDA plots                        -> reports/figures/
  3. Stratified 80/20 train/test split
  4. Compare the 6 course classifiers with 5-fold cross-validation (train set only)
  5. Tune the best one that gives a probability, with GridSearchCV
  6. Evaluate once on the held-out test set
  7. Explain the model (which features matter most)
  8. Save model bundle + metrics      -> models/, reports/

Imputation and scaling live INSIDE the scikit-learn Pipeline, so they are
learned from training folds only (no data leakage into the test set).
"""
import argparse
import json
import warnings
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")  # save plots to files, no window needed
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression, Perceptron
from sklearn.metrics import (ConfusionMatrixDisplay, RocCurveDisplay, accuracy_score,
                             classification_report, f1_score, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import (GridSearchCV, StratifiedKFold, cross_validate,
                                     train_test_split)
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from custom_models import LinearRegressionClassifier, SingleLayerPerceptron
from prepare import BINARY_COLS, FEATURE_INFO, FEATURES, NUMERIC_COLS, load_data

warnings.filterwarnings("ignore", category=FutureWarning)
RANDOM_STATE = 42
SCORING = {"accuracy": "accuracy", "precision": "precision",
           "recall": "recall", "f1": "f1", "roc_auc": "roc_auc"}


# --------------------------------------------------------------------------- #
# Models to compare - only the classifiers from the ML course list:
# (estimator, needs feature scaling?, grid for tuning)
# --------------------------------------------------------------------------- #
def get_models():
    return {
        "Logistic Regression": (
            LogisticRegression(max_iter=2000), True,
            {"model__C": [0.01, 0.1, 1, 10]}),
        "KNN": (
            KNeighborsClassifier(), True,
            {"model__n_neighbors": [3, 5, 7, 9, 11], "model__weights": ["uniform", "distance"]}),
        "Naive Bayes": (
            GaussianNB(), False,
            {"model__var_smoothing": [1e-9, 1e-7, 1e-5, 1e-3]}),
        "PLA (Perceptron)": (
            Perceptron(random_state=RANDOM_STATE), True,
            {"model__eta0": [0.1, 1.0], "model__penalty": [None, "l2"]}),
        "SLP (our own code)": (
            SingleLayerPerceptron(random_state=RANDOM_STATE), True,
            {"model__epochs": [10, 50, 100]}),
        "Linear Regression": (
            LinearRegressionClassifier(), True,
            {}),
    }


def make_pipeline(estimator, scale: bool) -> Pipeline:
    numeric_steps = [("impute", SimpleImputer(strategy="median"))]
    if scale:
        numeric_steps.append(("scale", StandardScaler()))
    preprocess = ColumnTransformer([
        ("num", Pipeline(numeric_steps), NUMERIC_COLS),
        ("bin", SimpleImputer(strategy="most_frequent"), BINARY_COLS),
    ])
    return Pipeline([("prep", preprocess), ("model", estimator)])


def feature_importance(model: Pipeline, X_test, y_test):
    """Importance per original feature.

    Linear models (logistic regression) -> |coefficient| on scaled inputs;
    others (KNN, Naive Bayes) -> permutation importance measured with log-loss
    (F1/accuracy are too coarse when the model is near-perfect).
    """
    est = model.named_steps["model"]
    # the ColumnTransformer outputs columns in NUMERIC_COLS + BINARY_COLS order == FEATURES
    if hasattr(est, "coef_") and np.ndim(est.coef_) == 2 and est.coef_.shape[1] == len(FEATURES):
        return pd.Series(np.abs(est.coef_[0]), index=FEATURES), "|coefficient| (scaled inputs)"
    pi = permutation_importance(model, X_test, y_test, scoring="neg_log_loss", n_repeats=20,
                                random_state=RANDOM_STATE, n_jobs=-1)
    return (pd.Series(pi.importances_mean, index=FEATURES),
            "increase in log-loss when shuffled")


# --------------------------------------------------------------------------- #
# EDA
# --------------------------------------------------------------------------- #
def run_eda(X: pd.DataFrame, y: pd.Series, fig_dir: Path):
    sns.set_theme(style="whitegrid")
    df = X.assign(target=y.map({1: "CKD", 0: "Not CKD"}))

    # class balance
    ax = df["target"].value_counts().plot.bar(color=["#c0504d", "#4f81bd"], rot=0)
    ax.set(title="Class balance", ylabel="Patients", xlabel="")
    plt.tight_layout(); plt.savefig(fig_dir / "01_class_balance.png", dpi=120); plt.close()

    # missing values
    miss = (X.isna().mean() * 100).sort_values(ascending=False)
    ax = miss.plot.bar(color="#7f7f7f", figsize=(10, 4))
    ax.set(title="Missing values per feature", ylabel="% missing")
    plt.tight_layout(); plt.savefig(fig_dir / "02_missing_values.png", dpi=120); plt.close()

    # correlation heatmap
    corr = X.assign(target=y).corr()
    plt.figure(figsize=(12, 10))
    sns.heatmap(corr, cmap="RdBu_r", center=0, annot=False, square=True)
    plt.title("Feature correlation (target: 1 = CKD)")
    plt.tight_layout(); plt.savefig(fig_dir / "03_correlation.png", dpi=120); plt.close()

    # key clinical features by class
    key = ["hemo", "sc", "sg", "pcv", "al", "bu"]
    fig, axes = plt.subplots(2, 3, figsize=(13, 7))
    for ax, col in zip(axes.ravel(), key):
        sns.boxplot(data=df, x="target", y=col, ax=ax, hue="target", legend=False,
                    palette={"CKD": "#c0504d", "Not CKD": "#4f81bd"})
        name, unit = FEATURE_INFO[col]
        ax.set(title=name, xlabel="", ylabel=unit)
    plt.suptitle("Key lab values: CKD vs not CKD")
    plt.tight_layout(); plt.savefig(fig_dir / "04_key_features_by_class.png", dpi=120); plt.close()

    print("Top correlations with target:")
    print(corr["target"].drop("target").abs().sort_values(ascending=False).head(8).round(3))


# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/kidney_disease.csv", help="path to the CSV")
    ap.add_argument("--out", default=".", help="folder for models/ and reports/")
    args = ap.parse_args()

    out = Path(args.out)
    fig_dir = out / "reports" / "figures"
    model_dir = out / "models"
    fig_dir.mkdir(parents=True, exist_ok=True)
    model_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load + clean ---------------------------------------------------------
    X, y = load_data(args.data)
    print(f"\nLoaded {len(X)} patients, {X.shape[1]} features | "
          f"CKD: {int(y.sum())}, not CKD: {int((y == 0).sum())}")

    # 2. EDA -----------------------------------------------------------------
    run_eda(X, y, fig_dir)

    # 3. Split ---------------------------------------------------------------
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)
    print(f"\nTrain: {len(X_train)}  Test: {len(X_test)}")

    # 4. Compare models with 5-fold CV on the training set ----------------------
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    models = get_models()
    rows = []
    for name, (est, scale, _) in models.items():
        res = cross_validate(make_pipeline(est, scale), X_train, y_train,
                             cv=cv, scoring=SCORING, n_jobs=-1)
        row = {"model": name}
        for m in SCORING:
            row[m] = res[f"test_{m}"].mean()
            row[f"{m}_std"] = res[f"test_{m}"].std()
        rows.append(row)
    comp = pd.DataFrame(rows).sort_values(["f1", "recall", "roc_auc"], ascending=False)
    comp.to_csv(out / "reports" / "model_comparison.csv", index=False)
    print("\n5-fold CV on training set (mean):")
    print(comp[["model", *SCORING]].round(4).to_string(index=False))

    ax = comp.set_index("model")[["accuracy", "recall", "f1", "roc_auc"]].plot.barh(figsize=(9, 5))
    ax.set(title="Model comparison (5-fold CV)", xlabel="score", xlim=(min(0.8, comp["f1"].min() - 0.05), 1.0))
    plt.tight_layout(); plt.savefig(fig_dir / "05_model_comparison.png", dpi=120); plt.close()

    # 5. Tune the best model -------------------------------------------------
    # the app shows the risk as a %, so the final model must give a probability;
    # PLA, SLP and linear regression only give yes/no (or a raw score)
    ranked = list(comp["model"])
    best_name = next(n for n in ranked if hasattr(models[n][0], "predict_proba"))
    if best_name != ranked[0]:
        print(f"\n{ranked[0]} scored highest but can't give a probability -> using {best_name}")
    est, scale, grid = models[best_name]
    print(f"\nBest in CV: {best_name} -> tuning with GridSearchCV ...")
    search = GridSearchCV(make_pipeline(est, scale), grid, cv=cv, scoring="f1", n_jobs=-1)
    search.fit(X_train, y_train)
    model = search.best_estimator_
    print("Best params:", search.best_params_, f"| CV F1 = {search.best_score_:.4f}")

    # 6. Final evaluation on the untouched test set --------------------------
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    metrics = {
        "model": best_name,
        "best_params": {k.replace("model__", ""): v for k, v in search.best_params_.items()},
        "test_accuracy": accuracy_score(y_test, y_pred),
        "test_precision": precision_score(y_test, y_pred),
        "test_recall": recall_score(y_test, y_pred),
        "test_f1": f1_score(y_test, y_pred),
        "test_roc_auc": roc_auc_score(y_test, y_prob),
        "n_train": len(X_train), "n_test": len(X_test),
    }
    print("\nTest-set results:")
    print(classification_report(y_test, y_pred, target_names=["Not CKD", "CKD"], digits=3))

    ConfusionMatrixDisplay.from_predictions(y_test, y_pred, display_labels=["Not CKD", "CKD"],
                                            cmap="Blues")
    plt.title(f"Confusion matrix - {best_name} (test set)")
    plt.tight_layout(); plt.savefig(fig_dir / "06_confusion_matrix.png", dpi=120); plt.close()

    RocCurveDisplay.from_predictions(y_test, y_prob, name=best_name)
    plt.plot([0, 1], [0, 1], "k--", lw=1)
    plt.title("ROC curve (test set)")
    plt.tight_layout(); plt.savefig(fig_dir / "07_roc_curve.png", dpi=120); plt.close()

    # 7. Explainability: which features matter most --------------------------
    imp, how = feature_importance(model, X_test, y_test)
    imp = imp.sort_values()
    imp.index = [FEATURE_INFO[c][0] for c in imp.index]
    ax = imp.tail(12).plot.barh(color="#4f81bd", figsize=(8, 5))
    ax.set(title=f"Top features - {best_name}", xlabel=how)
    plt.tight_layout(); plt.savefig(fig_dir / "08_feature_importance.png", dpi=120); plt.close()
    metrics["top_features"] = imp.sort_values(ascending=False).head(8).round(4).to_dict()
    print("Top features:", ", ".join(imp.sort_values(ascending=False).head(6).index))

    # 8. Save ----------------------------------------------------------------
    # typical values of NON-CKD training patients: the web form starts from a
    # healthy baseline and you change the values you want to test
    healthy = X_train[y_train == 0]
    defaults = {c: float(healthy[c].median()) for c in NUMERIC_COLS}
    defaults.update({c: float(healthy[c].mode().iloc[0]) for c in BINARY_COLS})
    bundle = {
        "pipeline": model,
        "model_name": best_name,
        "features": FEATURES,
        "defaults": defaults,          # used to pre-fill the web form
        "sklearn_version": sklearn.__version__,
        "metrics": metrics,
    }
    joblib.dump(bundle, model_dir / "ckd_model.joblib")
    with open(out / "reports" / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2, default=float)

    print(f"Saved model  -> {model_dir / 'ckd_model.joblib'}")
    print(f"Saved charts -> {fig_dir}/")
    if metrics["test_accuracy"] >= 0.98:
        print("\nNote: near-perfect scores are normal on this small, clean-cut dataset. "
              "Report CV mean +/- std too, and don't claim it would work this well on real hospital data.")


if __name__ == "__main__":
    main()
