`kidney_disease.csv` is already included (the raw Kaggle version, copied from
https://github.com/Shuyib/chronic-kidney-disease-kaggle, which downloads it from Kaggle).

Original sources, if you want to fetch it yourself:
- Kaggle: https://www.kaggle.com/datasets/mansoordaku/ckdisease
- UCI (original source, CC BY 4.0 - credit it in your report): https://archive.ics.uci.edu/dataset/336/chronic+kidney+disease
  - or in Python: `pip install ucimlrepo` then
    `from ucimlrepo import fetch_ucirepo; fetch_ucirepo(id=336).data.original.to_csv("data/kidney_disease.csv", index=False)`

400 patients, 24 features, target = `ckd` / `notckd`. The raw file has messy values
(tabs, `?`, numbers stored as text) - `prepare.py` cleans all of that.

---

`uae_ckd_alshamsi2018.csv` (Part 2, used by `future_ckd.py`) - 491 adults with or at
high risk of cardiovascular disease, Tawam Hospital, Al-Ain, UAE, followed 2008-2017.
Converted to CSV from the paper's supporting data file (S2), unchanged otherwise.
Target `EventCKD35` = 1 if the patient developed CKD stage 3-5 during follow-up (56 of 491).
`Gender`: 1 = male, 0 = female. Creatinine is in umol/L.

Source (CC BY 4.0 - credit it in your report): Al-Shamsi S, Regmi D, Govender RD (2018).
Chronic kidney disease in patients at high risk of cardiovascular disease in the United
Arab Emirates: A population-based study. PLOS ONE 13(6): e0199920.
https://doi.org/10.1371/journal.pone.0199920
