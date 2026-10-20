"""
robustness.py - is the winning model really the best, or just lucky?

    python robustness.py                 # run after train.py
    python robustness.py --repeats 50    # more repeats = steadier answer, but slower

train.py compares the models with ONE 5-fold cross-validation. With only 320
training patients, a different shuffle of the patients can change the ranking.
Here the same comparison is repeated many times (default 20) with different
shuffles, counting how many patients each model gets wrong and how often it
comes first.

Uses the same 320 training patients as train.py - the 80 test patients stay untouched.

Outputs
  reports/robustness_check.csv
  reports/figures/09_robustness_check.png
"""
import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # save plots to files, no window needed
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.model_selection import RepeatedStratifiedKFold, cross_validate, train_test_split

from prepare import load_data
from train import RANDOM_STATE, SCORING, get_models, make_pipeline


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/kidney_disease.csv", help="path to the CSV")
    ap.add_argument("--out", default=".", help="folder for reports/")
    ap.add_argument("--repeats", type=int, default=20, help="how many times to repeat 5-fold CV")
    args = ap.parse_args()

    out = Path(args.out)
    fig_dir = out / "reports" / "figures"
    fig_dir.mkdir(parents=True, exist_ok=True)

    # same split as train.py -> same 320 training patients
    X, y = load_data(args.data)
    X_train, _, y_train, _ = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)
    n_train, n_rep = len(X_train), args.repeats

    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=n_rep, random_state=RANDOM_STATE)
    fold_sizes = np.array([len(test) for _, test in cv.split(X_train, y_train)])
    print(f"\nRepeating 5-fold CV {n_rep} times on {n_train} training patients "
          f"({5 * n_rep} fits per model) ...")

    # 1. Run the comparison n_rep times -----------------------------------------
    f1_runs, wrong_runs, rows = {}, {}, []
    for name, (est, scale, _) in get_models().items():
        res = cross_validate(make_pipeline(est, scale), X_train, y_train,
                             cv=cv, scoring=SCORING, n_jobs=-1)
        # each repeat tests every training patient exactly once -> patients wrong per repeat
        wrong = np.rint((1 - res["test_accuracy"]) * fold_sizes).reshape(n_rep, 5).sum(axis=1)
        wrong_runs[name] = wrong
        f1_runs[name] = res["test_f1"].reshape(n_rep, 5).mean(axis=1)
        row = {"model": name}
        for m in SCORING:
            row[m] = res[f"test_{m}"].mean()
            row[f"{m}_std"] = res[f"test_{m}"].std()
        row.update(wrong_mean=wrong.mean(), wrong_std=wrong.std(),
                   wrong_min=wrong.min(), wrong_max=wrong.max())
        rows.append(row)

    # 2. Who came first in each repeat? (highest F1, same rule as train.py; ties share the win)
    f1 = pd.DataFrame(f1_runs)
    is_best = np.isclose(f1.to_numpy(), f1.max(axis=1).to_numpy()[:, None])
    wins = (is_best / is_best.sum(axis=1, keepdims=True)).sum(axis=0)

    table = pd.DataFrame(rows).set_index("model")
    table["wins"] = pd.Series(wins, index=f1.columns)
    table = table.sort_values("f1", ascending=False)
    table.round(4).to_csv(out / "reports" / "robustness_check.csv")

    show = pd.DataFrame({
        "accuracy": table["accuracy"].map("{:.3f}".format) + " ± "
                    + table["accuracy_std"].map("{:.3f}".format),
        "recall": table["recall"].round(3),
        "f1": table["f1"].round(4),
        f"wrong (of {n_train})": table["wrong_mean"].round(1),
        f"1st place (of {n_rep})": table["wins"].round(1),
    })
    print(show.to_string())

    # 3. Is the leader clearly ahead, or a tie? ---------------------------------
    # rule of thumb: "clearly ahead" = beats the runner-up in at least 3 out of 4 repeats
    first, second = table.index[:2]
    ahead = int((f1[first] > f1[second] + 1e-9).sum())
    behind = int((f1[first] < f1[second] - 1e-9).sum())
    print(f"\n{first} vs {second}: {table.loc[first, 'wrong_mean']:.1f} vs "
          f"{table.loc[second, 'wrong_mean']:.1f} patients wrong on average; {first} ahead in "
          f"{ahead}, behind in {behind}, tied in {n_rep - ahead - behind} of {n_rep} repeats.")
    if ahead >= 0.75 * n_rep:
        print(f"-> {first} beats {second} in at least 3 of 4 repeats: it is consistently ahead.")
    else:
        print(f"-> {first} beats {second} in fewer than 3 of 4 repeats: "
              "treat them as tied on this data.")

    # 4. Chart: mistakes per repeat (left) + how often each model won (right) ----
    sns.set_theme(style="whitegrid")
    order = list(table.index)[::-1]  # best model at the top
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5), sharey=True,
                                   gridspec_kw={"width_ratios": [2, 1]})
    rng = np.random.default_rng(RANDOM_STATE)
    for i, name in enumerate(order):
        w = wrong_runs[name]
        jitter = rng.uniform(-0.28, 0.28, len(w))  # spread out repeats with the same count
        ax1.scatter(w, i + jitter, s=24, color="#4f81bd", alpha=0.5, lw=0)
        ax1.plot([w.mean()] * 2, [i - 0.32, i + 0.32], color="#1f1f1f", lw=2.5)
    ax1.set(yticks=range(len(order)), yticklabels=order, xlim=(-0.5, None),
            xlabel=f"patients wrong (out of {n_train})",
            title=f"Mistakes: each dot = one of {n_rep} repeats, line = average")

    won = [table.loc[n, "wins"] for n in order]
    ax2.barh(range(len(order)), won, color="#4f81bd", height=0.6)
    for i, v in enumerate(won):
        ax2.text(v + n_rep * 0.02, i, f"{round(v, 1):g}", va="center")
    ax2.set(xlim=(0, n_rep), xlabel=f"times ranked 1st by F1 (out of {n_rep})",
            title="How often each model won")
    fig.suptitle("Robustness check: does the model ranking hold up with different shuffles?")
    plt.tight_layout(); plt.savefig(fig_dir / "09_robustness_check.png", dpi=120); plt.close()

    print(f"\nSaved table -> {out / 'reports' / 'robustness_check.csv'}")
    print(f"Saved chart -> {fig_dir / '09_robustness_check.png'}")


if __name__ == "__main__":
    main()
