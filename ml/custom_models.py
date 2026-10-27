"""
custom_models.py - two course algorithms written by hand, so they plug into the
same scikit-learn Pipeline as the library models.

  SingleLayerPerceptron        the SLP from the AND-gate / attendance labs, trained with PLA
  LinearRegressionClassifier   linear regression forced to answer yes/no (CKD if output >= 0.5)

Neither gives a probability, only a yes/no (and a raw score), so train.py never
picks them as the final model - the app needs a % risk.
"""
import numpy as np
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.linear_model import LinearRegression


class SingleLayerPerceptron(ClassifierMixin, BaseEstimator):
    """The single-layer perceptron from the AND-gate lab, written from scratch.

        output = 1 if (w . x + b) >= 0 else 0           (step activation)
        on every mistake:  w += lr * (target - output) * x,  b += lr * (target - output)

    That update rule is PLA, the Perceptron Learning Algorithm. If the classes can be
    split by a straight line (like the AND gate), PLA is guaranteed to reach 0 errors.
    """

    def __init__(self, lr=0.1, epochs=100, random_state=None):
        self.lr = lr
        self.epochs = epochs
        self.random_state = random_state

    def fit(self, X, y):
        X, y = np.asarray(X, dtype=float), np.asarray(y)
        rng = np.random.default_rng(self.random_state)
        self.classes_ = np.array([0, 1])
        self.w_, self.b_ = np.zeros(X.shape[1]), 0.0
        self.errors_ = []  # mistakes in each pass over the data (epoch)
        for _ in range(self.epochs):
            errors = 0
            for i in rng.permutation(len(X)):
                output = 1 if X[i] @ self.w_ + self.b_ >= 0 else 0
                if output != y[i]:
                    self.w_ += self.lr * (y[i] - output) * X[i]
                    self.b_ += self.lr * (y[i] - output)
                    errors += 1
            self.errors_.append(errors)
            if errors == 0:  # every training patient right -> converged
                break
        return self

    def decision_function(self, X):
        return np.asarray(X, dtype=float) @ self.w_ + self.b_

    def predict(self, X):
        return (self.decision_function(X) >= 0).astype(int)


class LinearRegressionClassifier(ClassifierMixin, BaseEstimator):
    """Linear regression used for a yes/no question: predict a number for each
    patient (target 1 = CKD, 0 = not), then call it CKD if the number is >= 0.5."""

    def fit(self, X, y):
        self.classes_ = np.array([0, 1])
        self.reg_ = LinearRegression().fit(X, y)
        return self

    def decision_function(self, X):
        return self.reg_.predict(X) - 0.5

    def predict(self, X):
        return (self.decision_function(X) >= 0).astype(int)
