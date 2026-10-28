"""
logistic_regression.py - logistic regression written from scratch, so every line of the
final model can be explained.

    python ml/logistic_regression.py     # run after train.py

The web app uses scikit-learn's LogisticRegression (chosen and tuned in train.py). This
file builds the same algorithm by hand with NumPy, trains it on the same 320 training
patients, and checks it gives the same answers on the same 80 test patients.

How logistic regression works
  1. score      z = w1*x1 + w2*x2 + ... + w24*x24 + b    (the same formula as linear regression)
  2. sigmoid    p = 1 / (1 + e^(-z))                      squashes any score into 0..1 = P(CKD)
  3. loss       log-loss: how wrong the probabilities are (a confident wrong answer costs a lot)
  4. learning   gradient descent: nudge every weight a little in the direction that lowers
                the loss, thousands of times
  5. answer     CKD if p >= 0.5

Outputs
  reports/figures/18_logistic_regression_scratch.png
"""
import matplotlib
matplotlib.use("Agg")  # save plots to files, no window needed
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score
from sklearn.model_selection import train_test_split

from predict import EXAMPLES, load_bundle
from prepare import FEATURE_INFO, FEATURES, ROOT, clean_frame, load_data
from train import RANDOM_STATE, make_pipeline


def sigmoid(z):
    """The S-curve: any score -> a number between 0 and 1.
    (clip: very large scores would overflow e^(-z); the answer there is 0 or 1 anyway)"""
    return 1 / (1 + np.exp(-np.clip(z, -500, 500)))


def log_loss(y, p):
    """Average of -[y*log(p) + (1-y)*log(1-p)]. Small when p is close to the true answer y.
    (clip: log(0) is minus infinity)"""
    p = np.clip(p, 1e-12, 1 - 1e-12)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


class LogisticRegressionFromScratch:
    """Logistic regression trained with gradient descent.

    lr      learning rate: how big each nudge to the weights is
    epochs  how many times to go over all the training patients
    C       the same setting train.py tuned (C = 10): it adds a small penalty for big
            weights, weaker when C is larger. scikit-learn uses the same rule, so with the
            same C both models learn the same weights.
    """

    def __init__(self, lr=1.0, epochs=20000, C=10.0):
        self.lr = lr
        self.epochs = epochs
        self.C = C

    def fit(self, X, y):
        n, n_features = X.shape
        self.w = np.zeros(n_features)  # one weight per test, all starting at 0
        self.b = 0.0                   # the bias
        self.losses = []               # the loss after each epoch, to watch it learn
        for _ in range(self.epochs):
            p = sigmoid(X @ self.w + self.b)  # 1-2. current probability for every patient
            error = p - y                     # how far off each one is (+ = too high)
            self.losses.append(log_loss(y, p))
            # 3-4. gradient = the direction in which the loss grows; step the other way
            grad_w = X.T @ error / n + self.w / (self.C * n)  # + the penalty for big weights
            grad_b = error.mean()
            self.w -= self.lr * grad_w
            self.b -= self.lr * grad_b
        return self

    def predict_proba(self, X):
        return sigmoid(X @ self.w + self.b)

    def predict(self, X):
        return (self.predict_proba(X) >= 0.5).astype(int)  # 5. CKD if p >= 0.5


def main():
    # 1. Same data, same split and same preparation as train.py ------------------
    X, y = load_data(ROOT / "data" / "kidney_disease.csv")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)
    # fill empty boxes (median / most common answer) + scale - learned from training data only
    prep = make_pipeline("passthrough", scale=True).fit(X_train)
    Z_train, Z_test = prep.transform(X_train), prep.transform(X_test)

    # 2. Train our own logistic regression ----------------------------------------
    bundle = load_bundle()  # the web app's model, for the comparison below
    C = bundle["metrics"]["best_params"]["C"]
    model = LogisticRegressionFromScratch(C=C).fit(Z_train, y_train.to_numpy())
    print(f"\nTrained on {len(Z_train)} patients: loss {model.losses[0]:.3f} at the start "
          f"-> {model.losses[-1]:.3f} after {model.epochs} epochs")

    # 3. Final exam on the 80 test patients -----------------------------------------
    y_pred = model.predict(Z_test)
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    print(f"\nTest set ({len(y_test)} patients):")
    print(f"  accuracy {accuracy_score(y_test, y_pred):.1%} | recall {recall_score(y_test, y_pred):.1%} "
          f"| precision {precision_score(y_test, y_pred):.1%}")
    print(f"  caught {tp} of {tp + fn} CKD patients, {fp} false alarms")

    # 4. Same answers as scikit-learn's model (the one the web app uses)? ------------
    p_ours = model.predict_proba(Z_test)
    p_sklearn = bundle["pipeline"].predict_proba(X_test)[:, 1]
    same = ((p_ours >= 0.5) == (p_sklearn >= 0.5)).mean()
    print(f"\nCompared with scikit-learn's LogisticRegression (C = {C}):")
    print(f"  same answer for {same:.0%} of test patients, "
          f"probabilities differ by at most {np.abs(p_ours - p_sklearn).max():.3f}")
    weights = pd.DataFrame({
        "ours": model.w,
        "scikit-learn": bundle["pipeline"].named_steps["model"].coef_[0],
    }, index=[FEATURE_INFO[c][0] for c in FEATURES])
    print("\nLargest weights (+ pushes towards CKD, - away from it):")
    print(weights.reindex(weights["ours"].abs().sort_values(ascending=False).index)
          .head(8).round(2).to_string())

    # 5. One patient, step by step ---------------------------------------------------
    record = EXAMPLES["CKD-looking"]
    x = prep.transform(clean_frame(pd.DataFrame([record])))[0]  # same filling + scaling
    parts = pd.Series(model.w * x, index=[FEATURE_INFO[c][0] for c in FEATURES])
    z = parts.sum() + model.b
    print("\nThe 'CKD-looking' example patient:")
    print("  biggest parts of the score (weight x scaled value):")
    for name, value in parts.reindex(parts.abs().sort_values(ascending=False).index).head(5).items():
        print(f"    {name:24s} {value:+6.2f}")
    print(f"  score z = sum of all 24 parts + bias = {parts.sum():.2f} + ({model.b:.2f}) = {z:.2f}")
    print(f"  sigmoid(z) = 1 / (1 + e^({-z:.2f})) = {sigmoid(z):.4f} -> "
          f"{'CKD' if sigmoid(z) >= 0.5 else 'not CKD'}")

    # 6. Chart: the loss going down, and where the test patients land on the S-curve --
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    axes[0].plot(range(1, model.epochs + 1), model.losses, color="#4f81bd")
    axes[0].set(xscale="log", xlabel="epoch (log scale)", ylabel="log-loss",
                title="Learning: the loss goes down as the weights are nudged")
    scores = Z_test @ model.w + model.b
    curve = np.linspace(min(scores.min(), -10), max(scores.max(), 10), 300)
    axes[1].plot(curve, sigmoid(curve), color="#555555", lw=1.5, label="sigmoid")
    for label, value, color in [("CKD", 1, "#c0504d"), ("not CKD", 0, "#4f81bd")]:
        mask = y_test.to_numpy() == value
        axes[1].scatter(scores[mask], sigmoid(scores[mask]), color=color, s=22, alpha=0.8,
                        label=f"test patients: {label}")
    axes[1].axhline(0.5, color="#7f7f7f", ls="--", lw=1)
    axes[1].set(xlabel="score z = w·x + b", ylabel="P(CKD)",
                title="Each test patient's score through the sigmoid (dashed = 0.5 cut-off)")
    axes[1].legend(loc="center right")
    fig.suptitle("Logistic regression written from scratch (ml/logistic_regression.py)")
    plt.tight_layout()
    fig_path = ROOT / "reports" / "figures" / "18_logistic_regression_scratch.png"
    plt.savefig(fig_path, dpi=120); plt.close()
    print(f"\nSaved chart -> {fig_path}")


if __name__ == "__main__":
    main()
