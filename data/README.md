`kidney_disease.csv` is already included (the raw Kaggle version, copied from
https://github.com/Shuyib/chronic-kidney-disease-kaggle, which downloads it from Kaggle).

Original sources, if you want to fetch it yourself:
- Kaggle: https://www.kaggle.com/datasets/mansoordaku/ckdisease
- UCI (original source, CC BY 4.0 - credit it in your report): https://archive.ics.uci.edu/dataset/336/chronic+kidney+disease
  - or in Python: `pip install ucimlrepo` then
    `from ucimlrepo import fetch_ucirepo; fetch_ucirepo(id=336).data.original.to_csv("data/kidney_disease.csv", index=False)`

400 patients, 24 features, target = `ckd` / `notckd`. The raw file has messy values
(tabs, `?`, numbers stored as text) - `prepare.py` cleans all of that.
