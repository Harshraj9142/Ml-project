"""
course_models.py - every algorithm from the ML course list, on the CKD data.

    python course_models.py      # run after train.py

Course topic          Where it is in this project
  PLA, SLP            train.py comparison (SLP written from scratch in custom_models.py -
                      the same algorithm as the SLP AND-gate and attendance labs)
  Logistic regression train.py comparison
  Linear regression   train.py comparison (forced into yes/no: CKD if output >= 0.5)
  KNN, Naive Bayes    train.py comparison
  Confusion matrix    here: one per classifier, on the 80 test patients
  k-means, DBSCAN     here: hide the diagnosis and see whether the patients split
                      into CKD / not CKD by themselves

Classifiers use default settings (no tuning) and the same 320/80 split as train.py:
5-fold CV repeated 20 times on the training set (same shuffles as robustness.py),
then one fit on all 320 -> confusion matrix on the 80 untouched test patients.

Outputs
  reports/course_models.csv
  reports/course_clustering.csv
  reports/figures/10_course_confusion_matrices.png
  reports/figures/11_clustering.png
"""
import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # save plots to files, no window needed
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.cluster import DBSCAN, KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import ConfusionMatrixDisplay, confusion_matrix
from sklearn.model_selection import RepeatedStratifiedKFold, cross_validate, train_test_split
from sklearn.neighbors import NearestNeighbors

from prepare import load_data
from train import RANDOM_STATE, SCORING, get_models, make_pipeline


# --------------------------------------------------------------------------- #
# Clustering helpers
# --------------------------------------------------------------------------- #
def median_eps(Z, k=5):
    """DBSCAN's eps by a simple rule of thumb that never looks at the labels: the
    median distance from a patient to its k-th nearest neighbour, so about half the
    patients sit in a 'dense' neighbourhood."""
    return float(np.median(NearestNeighbors(n_neighbors=k).fit(Z).kneighbors(Z)[0][:, -1]))


def describe_groups(groups, y, method):
    """Rows of (method, group, size, CKD, not CKD) + % agreement with the diagnosis
    if each group is labelled with its majority class."""
    rows, agree = [], 0
    for g in sorted(set(groups)):
        in_g = groups == g
        ckd, not_ckd = int(y[in_g].sum()), int((y[in_g] == 0).sum())
        agree += max(ckd, not_ckd)
        name = "noise (outliers)" if g == -1 else f"cluster {g + 1}"
        rows.append({"method": method, "group": name, "patients": ckd + not_ckd,
                     "ckd": ckd, "not_ckd": not_ckd})
    return rows, agree / len(y)


# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/kidney_disease.csv", help="path to the CSV")
    ap.add_argument("--out", default=".", help="folder for reports/")
    ap.add_argument("--repeats", type=int, default=20, help="how many times to repeat 5-fold CV")
    args = ap.parse_args()

    out = Path(args.out)
    fig_dir = out / "reports" / "figures"
    fig_dir.mkdir(parents=True, exist_ok=True)

    X, y = load_data(args.data)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)
    n_train, n_rep = len(X_train), args.repeats

    # 1. Classifiers: repeated CV on the training set + one test-set run ---------
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=n_rep, random_state=RANDOM_STATE)
    fold_sizes = np.array([len(test) for _, test in cv.split(X_train, y_train)])
    print(f"\nClassifiers: 5-fold CV x {n_rep} on {n_train} training patients, "
          f"then tested once on {len(X_test)} patients ...")

    rows, test_preds, fitted = [], {}, {}
    for name, (est, scale, _) in get_models().items():
        pipe = make_pipeline(est, scale)
        res = cross_validate(pipe, X_train, y_train, cv=cv, scoring=SCORING, n_jobs=-1)
        wrong = np.rint((1 - res["test_accuracy"]) * fold_sizes).reshape(n_rep, 5).sum(axis=1)

        pipe.fit(X_train, y_train)
        y_pred = pipe.predict(X_test)
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
        test_preds[name], fitted[name] = y_pred, pipe
        rows.append({"model": name,
                     **{m: res[f"test_{m}"].mean() for m in SCORING},
                     "accuracy_std": res["test_accuracy"].std(),
                     "cv_wrong_of_320": wrong.mean(),
                     "gives_probability": hasattr(est, "predict_proba"),
                     "test_wrong_of_80": int(fp + fn),
                     "test_TP": int(tp), "test_FN": int(fn), "test_FP": int(fp), "test_TN": int(tn)})

    table = pd.DataFrame(rows).set_index("model").sort_values("f1", ascending=False)
    table.round(4).to_csv(out / "reports" / "course_models.csv")
    show = pd.DataFrame({
        "CV accuracy": table["accuracy"].map("{:.3f}".format) + " ± "
                       + table["accuracy_std"].map("{:.3f}".format),
        "CV recall": table["recall"].round(3),
        "CV F1": table["f1"].round(3),
        f"CV wrong (of {n_train})": table["cv_wrong_of_320"].round(1),
        f"test wrong (of {len(X_test)})": table["test_wrong_of_80"],
        "test missed CKD": table["test_FN"],
        "test false alarms": table["test_FP"],
        "gives %": table["gives_probability"].map({True: "yes", False: "no"}),
    })
    print(show.to_string())

    # facts worth quoting in the viva
    slp = fitted["SLP (our own code)"].named_steps["model"]
    print(f"\nSLP on the {n_train} training patients: mistakes per epoch {slp.errors_} "
          f"-> {'converged to 0 errors: the data is linearly separable, like the AND gate'
                if slp.errors_[-1] == 0 else 'did not reach 0 errors (not linearly separable)'}.")
    raw = fitted["Linear Regression"].decision_function(X_test) + 0.5
    print(f"Linear regression outputs on test patients range from {raw.min():.2f} to "
          f"{raw.max():.2f} - not probabilities, which is why it's the wrong tool for yes/no.")

    # 2. Confusion matrices (test set) ------------------------------------------
    names = list(table.index)
    fig, axes = plt.subplots(2, 4, figsize=(16, 8.5))
    for ax, name in zip(axes.ravel(), names):
        ConfusionMatrixDisplay.from_predictions(
            y_test, test_preds[name], display_labels=["Not CKD", "CKD"],
            cmap="Blues", colorbar=False, ax=ax)
        wrong, fn, fp = (int(table.loc[name, c]) for c in ["test_wrong_of_80", "test_FN", "test_FP"])
        ax.set_title(f"{name}\n{wrong} wrong: {fn} missed CKD, "
                     f"{fp} false alarm{'' if fp == 1 else 's'}", fontsize=10)
        ax.grid(False)
    for ax in axes.ravel()[len(names):]:
        ax.axis("off")
    key = axes.ravel()[min(len(names), axes.size - 1)]  # first free box
    key.text(0, 0.95, "How to read each box\n\n"
                      "rows    = the real diagnosis\n"
                      "columns = what the model said\n\n"
                      "top-left     healthy, said healthy\n"
                      "             (TN)\n"
                      "top-right    healthy, said CKD\n"
                      "             = false alarm (FP)\n"
                      "bottom-left  CKD, said healthy\n"
                      "             = MISSED (FN)\n"
                      "bottom-right CKD, said CKD (TP)\n\n"
                      "Missed CKD is the costly mistake.",
             va="top", fontsize=10.5, family="monospace", transform=key.transAxes)
    fig.suptitle(f"Course algorithms on the {len(X_test)} test patients "
                 "(best cross-validated F1 first)", fontsize=14)
    plt.tight_layout()
    plt.savefig(fig_dir / "10_course_confusion_matrices.png", dpi=120); plt.close()

    # 3. Clustering: hide the diagnosis - do the patients split by themselves? ---
    # labels are never shown to the clustering, so all 400 patients are used
    Z = make_pipeline("passthrough", scale=True).fit_transform(X)
    y_all = y.to_numpy()
    km = KMeans(n_clusters=2, n_init=10, random_state=RANDOM_STATE).fit_predict(Z)
    eps = median_eps(Z, k=5)
    db = DBSCAN(eps=eps, min_samples=5).fit_predict(Z)

    # DBSCAN depends a lot on eps -> who gets called an outlier as eps grows?
    sweep = []
    for e in np.round(np.arange(1.0, 5.01, 0.25), 2):
        noise = DBSCAN(eps=e, min_samples=5).fit_predict(Z) == -1
        sweep.append({"eps": e, "ckd": int(y[noise].sum()), "not_ckd": int((y[noise] == 0).sum())})
    sweep = pd.DataFrame(sweep)
    print("\nDBSCAN outliers at different eps (who is 'unusual'?):")
    print(sweep.to_string(index=False))

    km_rows, km_agree = describe_groups(km, y_all, "k-means (k = 2)")
    db_rows, db_agree = describe_groups(db, y_all, f"DBSCAN (eps = {eps:.2f}, min_samples = 5)")
    clusters = pd.DataFrame(km_rows + db_rows)
    clusters.to_csv(out / "reports" / "course_clustering.csv", index=False)
    print(f"\nClustering all {len(X)} patients without showing the diagnosis:")
    print(clusters.to_string(index=False))
    print(f"If each group is named after its majority class, it matches the real diagnosis for "
          f"{km_agree:.1%} (k-means) and {db_agree:.1%} (DBSCAN) of patients "
          f"(the classifiers above: ~96-99%).")

    # chart: the same 400 patients drawn 3 times, squashed from 24 tests to 2 axes (PCA),
    # plus how DBSCAN's outliers change with eps
    P = PCA(n_components=2, random_state=RANDOM_STATE).fit_transform(Z)
    sns.set_theme(style="whitegrid")
    fig, axes = plt.subplots(2, 2, figsize=(14, 11))
    axes = axes.ravel()
    for ax in axes[1:3]:
        ax.sharex(axes[0]); ax.sharey(axes[0])

    def draw(ax, masks, labels, colors, title, markers=None):
        for i, (sel, label, color) in enumerate(zip(masks, labels, colors)):
            m = (markers or {}).get(i, "o")
            ax.scatter(P[sel, 0], P[sel, 1], s=18, color=color, alpha=0.7,
                       lw=0 if m == "o" else 1, marker=m, label=label)
        ax.set(title=title, xlabel="PCA axis 1", ylabel="PCA axis 2")
        ax.legend(loc="upper right", fontsize=9, frameon=True)

    def group_label(rows, i):
        r = rows[i]
        return f"{r['group']}: {r['ckd']} CKD, {r['not_ckd']} not CKD"

    draw(axes[0], [y_all == 1, y_all == 0],
         [f"CKD ({int(y_all.sum())})", f"Not CKD ({int((y_all == 0).sum())})"],
         ["#c0504d", "#4f81bd"], "Real diagnosis (hidden from clustering)")
    draw(axes[1], [km == g for g in sorted(set(km))],
         [group_label(km_rows, i) for i in range(len(km_rows))],
         ["#8064a2", "#f79646"], f"k-means, 2 clusters - matches {km_agree:.0%}")
    db_groups = sorted(set(db))
    palette = iter(["#9bbb59", "#8064a2", "#f79646", "#4bacc6"])
    db_colors = ["#7f7f7f" if g == -1 else next(palette, "#4bacc6") for g in db_groups]
    draw(axes[2], [db == g for g in db_groups],
         [group_label(db_rows, i) for i in range(len(db_rows))],
         db_colors, f"DBSCAN (eps = {eps:.2f}) - dense group vs outliers - matches {db_agree:.0%}",
         markers={i: ("x" if g == -1 else "o") for i, g in enumerate(db_groups)})

    ax = axes[3]
    ax.plot(sweep["eps"], sweep["ckd"], "-o", color="#c0504d", ms=5, label="outliers who have CKD")
    ax.plot(sweep["eps"], sweep["not_ckd"], "-o", color="#4f81bd", ms=5,
            label="outliers who are healthy")
    ax.axvline(eps, color="#7f7f7f", ls="--", lw=1)
    ax.text(eps, ax.get_ylim()[1] * 0.97, f" eps used = {eps:.2f}", va="top", color="#595959")
    ax.set(title="DBSCAN outliers as eps grows: the 'unusual' patients are the CKD ones",
           xlabel="eps (how close counts as a neighbour)", ylabel="patients marked as outliers")
    ax.legend(loc="upper right", fontsize=9, frameon=True)

    # zoom past the few most extreme patients so the rest aren't squashed together
    lo, hi = np.percentile(P, [0.5, 99.5], axis=0)
    pad = 0.08 * (hi - lo)
    axes[0].set(xlim=(lo[0] - pad[0], hi[0] + pad[0]), ylim=(lo[1] - pad[1], hi[1] + pad[1]))
    hidden = int((((P < lo - pad) | (P > hi + pad)).any(axis=1)).sum())
    zoom_note = f"; {hidden} extreme patient(s) outside the view" if hidden else ""

    fig.suptitle("Clustering: hide the diagnosis - do patients group into CKD / not CKD by "
                 f"themselves?\n(24 tests squashed to 2 axes with PCA, for drawing only{zoom_note})")
    plt.tight_layout(); plt.savefig(fig_dir / "11_clustering.png", dpi=120); plt.close()

    print(f"\nSaved tables -> {out / 'reports' / 'course_models.csv'}, "
          f"{out / 'reports' / 'course_clustering.csv'}")
    print(f"Saved charts -> {fig_dir / '10_course_confusion_matrices.png'}, "
          f"{fig_dir / '11_clustering.png'}")


if __name__ == "__main__":
    main()
