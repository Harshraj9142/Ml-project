# Chronic Kidney Disease (CKD) Prediction

Predict whether a patient has chronic kidney disease from 24 routine clinical
measurements (blood tests, urine tests, medical history), using only the algorithms
from our ML course (scikit-learn, plus a perceptron written from scratch), with a
Next.js web app for live predictions (and a simpler Streamlit version).

## Project structure

```
ckd-project/
├── data/
│   └── kidney_disease.csv     <- you download this (see data/README.md)
├── prepare.py                 data loading + cleaning (shared by training and app)
├── custom_models.py           SLP written from scratch (PLA rule) + linear regression as a yes/no classifier
├── train.py                   EDA -> model comparison -> tuning -> evaluation -> save
├── robustness.py              repeats the model comparison 20x - is the winner just lucky?
├── course_models.py           confusion matrix for every algorithm + k-means / DBSCAN clustering
├── predict.py                 predict for one new patient
├── api.py                     web API (FastAPI) around the saved model, used by web/
├── web/                       Next.js 16 web app (the user interface)
│   ├── src/app/page.tsx         the page
│   ├── src/components/          Predictor (loads + predicts), PatientForm, ResultPanel
│   ├── src/lib/api.ts           talks to api.py
│   └── next.config.ts           forwards /api/* to api.py
├── app.py                     simpler Streamlit web app (same model)
├── requirements.txt
├── models/ckd_model.joblib    created by train.py
└── reports/                   created by the scripts above
    ├── figures/01..11_*.png   charts for your report / slides
    ├── model_comparison.csv
    ├── robustness_check.csv
    ├── course_models.csv
    ├── course_clustering.csv
    └── metrics.json
```

## Setup and run

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 1. put the dataset at data/kidney_disease.csv  (see data/README.md)
# 2. train - prints CV comparison + test results, saves model and charts
python train.py
# 3. check the model ranking isn't luck - repeats the CV comparison 20 times (~1 min)
python robustness.py
# 4. confusion matrix for every algorithm + k-means / DBSCAN clustering (~30 s)
python course_models.py
# 5. try the saved model from the terminal
python predict.py
```

Train and run the app in the same environment: a model saved with one
scikit-learn version may not load in another.

## Web app (Next.js)

The web app has two parts that run at the same time, each in its own terminal:

```
browser -> Next.js app (web/, port 3000) -> Python API (api.py, port 8000) -> saved model
```

```bash
# terminal 1 - the Python API (from the project folder, after train.py)
source .venv/bin/activate
uvicorn api:app --reload --port 8000

# terminal 2 - the Next.js app
cd web
npm install          # first time only (needs Node.js 20.9 or newer)
npm run dev
```

Then open http://localhost:3000. Restart terminal 1 after re-training the model.

If `npm install` fails with `EACCES ... _cacache`, your npm cache has files owned by root
(an old npm bug). Fix it once with `sudo chown -R $(id -u):$(id -g) ~/.npm`, then retry.

The older Streamlit version still works on its own: `streamlit run app.py`.

## Algorithms (course list only)

| Course topic | Where it is used |
|---|---|
| PLA | scikit-learn `Perceptron`, compared in `train.py` |
| SLP (AND-gate / attendance labs) | our own perceptron in `custom_models.py`, compared in `train.py` |
| Logistic regression | compared in `train.py` - **the final model** |
| Linear regression | compared in `train.py`, forced to yes/no (CKD if output >= 0.5) |
| KNN | compared in `train.py` |
| Naive Bayes | Gaussian Naive Bayes, compared in `train.py` |
| k-means | `course_models.py` - clustering with the diagnosis hidden |
| DBSCAN | `course_models.py` - clustering with the diagnosis hidden |
| Confusion matrix | `train.py` (final model) and `course_models.py` (every classifier) |

## Dataset

UCI Chronic Kidney Disease dataset - 400 patients from India (250 CKD, 150 not CKD),
24 features, many missing values.

| Group | Features |
|---|---|
| Vitals | age, bp (blood pressure) |
| Urine test | sg (specific gravity), al (albumin), su (sugar), rbc, pc (pus cells), pcc (pus cell clumps), ba (bacteria) |
| Blood test | bgr (glucose), bu (urea), sc (serum creatinine), sod, pot, hemo (hemoglobin), pcv (packed cell volume), wc (WBC count), rc (RBC count) |
| History | htn (hypertension), dm (diabetes), cad (coronary artery disease), appet (appetite), pe (pedal edema), ane (anemia) |
| Target | class: ckd / notckd |

## Method

1. **Cleaning** - strip stray tabs/spaces, turn `?` into missing, convert text numbers to
   floats, encode yes/no-style columns as 0/1, target `ckd` -> 1.
2. **EDA** - class balance, missing-value chart, correlation heatmap, key lab values by class.
3. **Split** - stratified 80/20 train/test (test set untouched until the end).
4. **Pipeline** - median imputation (numbers), most-frequent imputation (categories),
   scaling. All inside a scikit-learn `Pipeline`, so nothing is learned from the test
   data (no leakage).
5. **Model comparison** - the six course classifiers (PLA, SLP, Logistic Regression,
   Linear Regression, KNN, Naive Bayes) with 5-fold stratified cross-validation.
   `robustness.py` repeats this 20 times with different shuffles to check the ranking isn't luck.
6. **Model choice + tuning** - the app shows the risk as a percentage, so the final model
   must give a probability. PLA, SLP and linear regression only answer yes/no, so the best
   of Logistic Regression, KNN and Naive Bayes is chosen and tuned with GridSearchCV (optimising F1).
7. **Evaluation** - accuracy, precision, **recall** (missing a sick patient is the costly
   error), F1, ROC-AUC, confusion matrix, ROC curve.
8. **Explainability** - size of each feature's coefficient in the logistic regression.
9. **Clustering** - k-means and DBSCAN on all patients with the diagnosis hidden: do
   patients group into CKD / not CKD by themselves?
10. **Deployment** - saved with joblib, served by a FastAPI web API (`api.py`) to a Next.js
    web app (`web/`); a simpler Streamlit form (`app.py`) uses the same model.

## Results

Reference run on the included dataset (scikit-learn 1.9; other versions can differ
slightly - use the numbers from your own files in `reports/`).

Course classifiers - 5-fold CV repeated 20 times on the 320 training patients
(`robustness.py`), then each fitted once and tested on the 80 test patients
(`course_models.py`), all with default settings:

| Algorithm | Gives a %? | CV accuracy | CV recall | CV wrong (of 320) | Ranked 1st (of 20) | Test: missed CKD | Test: false alarms |
|---|---|---|---|---|---|---|---|
| **Logistic Regression** | yes | 0.991 ± 0.015 | 0.992 | 3.0 | 11 | 1 | 0 |
| SLP (our own code) | no | 0.988 ± 0.015 | 0.986 | 3.8 | 5.5 | 2 | 1 |
| PLA (Perceptron) | no | 0.987 ± 0.017 | 0.984 | 4.2 | 3.5 | 0 | 0 |
| Linear Regression | no | 0.965 ± 0.022 | 0.946 | 11.2 | 0 | 5 | 0 |
| Naive Bayes | yes | 0.962 ± 0.019 | 0.940 | 12.0 | 0 | 2 | 0 |
| KNN | yes | 0.961 ± 0.020 | 0.939 | 12.4 | 0 | 3 | 0 |

(A shared 1st place counts as half. In the single 5-fold run in `train.py`, PLA came
first - F1 0.995 vs 0.993 - which is why the 20-repeat check matters.)

- Logistic Regression, SLP and PLA - all straight-line models - are within about one
  patient of each other: effectively tied. Linear regression, Naive Bayes and KNN make
  about 4x more mistakes.
- Among the models that give a probability, **Logistic Regression is clearly best**
  (3 mistakes vs 12 for Naive Bayes and KNN), so it is the final model.

**Final model: Logistic Regression, tuned to C = 10.**
Test set (80 patients): accuracy 0.975, precision 1.000, recall 0.960, F1 0.980, ROC-AUC 1.000
(2 of 50 CKD patients missed, no false alarms). ROC-AUC 1.000 means every CKD patient got a
higher risk score than every healthy patient - the 2 missed ones fall below the 0.5 cut-off.
(With the default C = 1 it missed 1 test patient instead of 2 - a one-patient difference.)

Most important features (biggest coefficients): urine specific gravity, hypertension,
hemoglobin, appetite, packed cell volume, diabetes, albumin, serum creatinine - consistent
with how CKD is diagnosed clinically (dilute urine, anemia, protein in urine, raised
creatinine; diabetes and high blood pressure are its main causes).

Course-algorithm findings (`course_models.py`, charts `10_course_confusion_matrices.png`
and `11_clustering.png`):

- The from-scratch SLP converges in 3 epochs (15 -> 7 -> 0 mistakes): the training data
  is **linearly separable, like the AND gate**, which is why straight-line models do so well.
- PLA got all 80 test patients right but is only 3rd over 20 CV repeats: one small test
  set can flatter a model, so models are ranked by cross-validation.
- Linear regression outputs range from -0.59 to 1.69 - not probabilities, so it's the wrong
  tool for a yes/no question (logistic regression fixes this with the sigmoid).
- Almost every mistake, for every model, is a missed CKD patient rather than a false alarm.
- Clustering, with the diagnosis hidden: k-means (k = 2) finds a pure-CKD group (193 patients)
  and a group with all 150 healthy patients plus 57 CKD patients whose results look closer to
  normal - 86% agreement with the diagnosis. DBSCAN finds one dense group; for every eps from
  1.75 to 5, every patient it marks as an outlier has CKD - healthy patients look alike, CKD
  patients are each abnormal in their own way.

## Limitations (say these in your viva)

- Only 400 patients from one region; the test set is just 80 patients, so one
  mistake moves accuracy by over 1 point. Report CV mean +/- std alongside the test score.
- CKD vs not-CKD is very separable here (hemoglobin, creatinine, specific gravity, albumin),
  so 96-100% accuracy is common and does **not** mean it would work this well in a hospital.
- The top three models are within about one patient of each other (see the 20-repeat check),
  so "Logistic Regression is best" means "best of the models that give a probability", not
  a general rule.
- Healthy patients have far fewer missing values than CKD patients, so missingness itself
  leaks some signal.
- Not a medical device; for learning only.

## Ideas to extend

- Show each feature's contribution (coefficient x value) for every prediction in the app
- Choose a lower cut-off than 0.5 with cross-validation, to catch more CKD patients
- Lightweight model using only the top 6-8 features (fewer form fields)
- Train on a second CKD dataset and test on the other (external validation)
- Deploy the Streamlit app on Streamlit Community Cloud
