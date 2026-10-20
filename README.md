# Chronic Kidney Disease (CKD) Prediction

Predict whether a patient has chronic kidney disease from 24 routine clinical
measurements (blood tests, urine tests, medical history), using classical
machine-learning models in scikit-learn, with a Streamlit web app for live predictions.

## Project structure

```
ckd-project/
├── data/
│   └── kidney_disease.csv     <- you download this (see data/README.md)
├── prepare.py                 data loading + cleaning (shared by training and app)
├── train.py                   EDA -> model comparison -> tuning -> evaluation -> save
├── predict.py                 predict for one new patient
├── app.py                     Streamlit web app
├── requirements.txt
├── models/ckd_model.joblib    created by train.py
└── reports/                   created by train.py
    ├── figures/01..08_*.png   charts for your report / slides
    ├── model_comparison.csv
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
# 3. try the saved model from the terminal
python predict.py
# 4. launch the web app
streamlit run app.py
```

Train and run the app in the same environment: a model saved with one
scikit-learn version may not load in another.

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
   scaling for distance/linear models. All inside a scikit-learn `Pipeline`, so nothing
   is learned from the test data (no leakage).
5. **Model comparison** - Logistic Regression, KNN, SVM, Decision Tree, Random Forest,
   Gradient Boosting (+ XGBoost if installed) with 5-fold stratified cross-validation.
6. **Tuning** - GridSearchCV on the best model, optimising F1.
7. **Evaluation** - accuracy, precision, **recall** (missing a sick patient is the costly
   error), F1, ROC-AUC, confusion matrix, ROC curve.
8. **Explainability** - feature importance chart.
9. **Deployment** - saved with joblib, served through a Streamlit form.

## Results

Reference run on the included dataset (scikit-learn 1.9; other versions can differ
slightly - use the numbers from your own `reports/model_comparison.csv` and `reports/metrics.json`).

5-fold cross-validation on the 320 training patients:

| Model | CV accuracy | CV recall | CV F1 | CV ROC-AUC |
|---|---|---|---|---|
| SVM | 0.994 ± 0.008 | 0.990 | 0.995 | 1.000 |
| Random Forest | 0.991 ± 0.012 | 1.000 | 0.993 | 0.999 |
| Logistic Regression | 0.991 ± 0.012 | 0.995 | 0.993 | 1.000 |
| Gradient Boosting | 0.984 ± 0.024 | 0.995 | 0.988 | 0.998 |
| Decision Tree | 0.966 ± 0.006 | 0.970 | 0.973 | 0.964 |
| KNN | 0.956 ± 0.015 | 0.930 | 0.964 | 0.995 |

Best model after tuning: **SVM (linear kernel, C = 0.1)**.
Test set (80 patients): accuracy 0.988, precision 1.000, recall 0.980, F1 0.990, ROC-AUC 0.999
(one CKD patient missed, no false alarms).

Most important features: hemoglobin, urine specific gravity, packed cell volume,
hypertension, serum creatinine, diabetes, albumin - consistent with how CKD is
diagnosed clinically (anemia, dilute urine, protein in urine, raised creatinine).

## Limitations (say these in your viva)

- Only 400 patients from one region; the test set is just 80 patients, so one
  mistake moves accuracy by over 1 point. Report CV mean +/- std alongside the test score.
- CKD vs not-CKD is very separable here (hemoglobin, creatinine, specific gravity, albumin),
  so 97-100% accuracy is common and does **not** mean it would work this well in a hospital.
- Healthy patients have far fewer missing values than CKD patients, so missingness itself
  leaks some signal.
- Not a medical device; for learning only.

## Ideas to extend

- SHAP explanations per prediction in the app (`pip install shap`)
- Train on a second CKD dataset and test on the other (external validation)
- Lightweight model using only the top 6-8 features (fewer form fields)
- FastAPI endpoint + React/Next.js front end, or deploy the Streamlit app on Streamlit Community Cloud
