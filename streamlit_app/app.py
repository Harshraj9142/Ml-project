"""
app.py - Streamlit web app for CKD risk prediction.

    streamlit run app.py
"""
import streamlit as st

from predict import load_bundle, predict_patient
from prepare import BINARY_MAPS, FEATURE_INFO, FORM_GROUPS, FORM_STEP

st.set_page_config(page_title="CKD Risk Predictor", layout="wide")


@st.cache_resource
def get_bundle():
    return load_bundle()


try:
    bundle = get_bundle()
except FileNotFoundError as e:
    st.error(str(e))
    st.stop()

defaults = bundle["defaults"]
m = bundle["metrics"]

st.title("Chronic Kidney Disease Risk Predictor")
st.caption(
    f"Model: **{bundle['model_name']}** - test accuracy {m['test_accuracy']:.1%}, "
    f"recall {m['test_recall']:.1%}, ROC-AUC {m['test_roc_auc']:.3f} "
    f"(on {m['n_test']} held-out patients). Fields start at typical values for "
    "patients without CKD - change them and press Predict."
)

with st.form("patient"):
    record = {}
    left, right = st.columns(2)
    for i, (group, feats) in enumerate(FORM_GROUPS.items()):
        with (left if i % 2 == 0 else right):
            st.subheader(group)
            for f in feats:
                name, unit = FEATURE_INFO[f]
                label = f"{name} ({unit})" if unit else name
                if f in BINARY_MAPS:
                    options = list(BINARY_MAPS[f])          # first option = encoded 0
                    record[f] = st.selectbox(label, options, index=int(round(defaults[f])), key=f)
                else:
                    step, decimals = FORM_STEP.get(f, (1, 0))
                    record[f] = st.number_input(label, value=float(defaults[f]), step=float(step),
                                                format=f"%.{decimals}f", min_value=0.0, key=f)
    submitted = st.form_submit_button("Predict", type="primary")

if submitted:
    result = predict_patient(record, bundle)
    p = result["probability_ckd"]
    if result["prediction"] == "CKD":
        st.error(f"### Likely CKD - model probability {p:.0%}")
    else:
        st.success(f"### Unlikely CKD - model probability {p:.0%}")
    st.progress(p)

st.divider()
st.caption("Student ML project for learning purposes only - not a medical diagnosis. "
           "Anyone worried about kidney health should see a doctor.")
