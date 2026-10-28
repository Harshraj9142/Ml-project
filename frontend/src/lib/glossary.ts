// One or two plain-English sentences for every item on the form, shown in the (i) note next
// to it: what the test measures and why it matters for the kidneys. Like the reference
// ranges in ranges.ts, they are only a reading aid - the model never sees them.

const ABOUT: Record<string, string> = {
  // Part 1 - UCI dataset
  age: "The patient's age in years. Kidney function slowly declines with age, so CKD is more common in older adults.",
  bp: "Blood pressure in mm Hg. High blood pressure damages the kidneys, and damaged kidneys raise blood pressure further. No reference range is shown because the dataset doesn't say whether this is the systolic or diastolic reading.",
  sg: "How concentrated the urine is compared with pure water (1.000). Healthy kidneys concentrate or dilute urine as needed; damaged kidneys lose this ability, so the value stays close to 1.010.",
  al: "Protein (albumin) in the urine, graded 0 to 5 on a dipstick. Healthy kidney filters keep albumin in the blood, so any leak into the urine is an early sign of kidney damage.",
  su: "Sugar (glucose) in the urine, graded 0 to 5 on a dipstick. It usually means blood sugar is high, as in uncontrolled diabetes - the most common cause of CKD.",
  rbc: "Red blood cells seen in the urine under a microscope. Abnormal amounts can mean bleeding from damaged kidney filters or elsewhere in the urinary tract.",
  pc: "White blood cells (pus cells) seen in the urine under a microscope. Abnormal amounts usually point to an infection or inflammation of the kidneys or urinary tract.",
  pcc: "White blood cells stuck together in clumps in the urine - a sign of a stronger infection or inflammation.",
  ba: "Bacteria found in the urine sample, which usually suggests a urinary tract infection.",
  bgr: "Blood sugar measured at any time of day, without fasting. Repeatedly high values suggest diabetes, the most common cause of CKD.",
  bu: "Urea is a waste product made when the body breaks down protein, and the kidneys remove it. It builds up in the blood when the kidneys filter less.",
  sc: "Creatinine is a waste product of normal muscle activity that the kidneys filter out at a steady rate. A high level is one of the clearest signs that the kidneys are filtering less.",
  sod: "The main salt in the blood. The kidneys keep it in balance, so advanced kidney disease can push it out of range.",
  pot: "A salt that the kidneys remove from the blood. It can build up in kidney disease, and very high levels can upset the heart's rhythm.",
  hemo: "The protein in red blood cells that carries oxygen. Healthy kidneys make erythropoietin, the hormone that tells the bone marrow to make red blood cells, so low hemoglobin (anemia) is common in CKD.",
  pcv: "The share of the blood made up of red blood cells (also called hematocrit). A low value means anemia, which is common in CKD.",
  wc: "The number of infection-fighting white blood cells per cubic millimeter of blood. A high count usually means an infection or inflammation.",
  rc: "The number of red blood cells, in millions per cubic millimeter of blood. A low count means anemia, which is common in CKD.",
  htn: "Has the patient been diagnosed with high blood pressure? It is the second most common cause of CKD.",
  dm: "Has the patient been diagnosed with diabetes? It is the most common cause of CKD.",
  cad: "Narrowed arteries supplying the heart. Heart and kidney disease share risk factors and often occur together.",
  appet: "Whether the patient's appetite is good or poor. In advanced CKD, waste products build up in the blood and can cause nausea and a poor appetite.",
  pe: "Swelling of the feet and ankles. It happens when the kidneys can't remove enough salt and water from the body.",
  ane: "Has the patient been diagnosed with anemia (too few red blood cells)? It is common in CKD because damaged kidneys make less erythropoietin.",
  // Part 2 - UAE dataset
  Gender: "The patient's sex, as recorded at the start of the study.",
  AgeBaseline: "Age at the start of the study. The risk of developing CKD rises with age.",
  BMIBaseline: "Body-mass index: weight in kilograms divided by height in meters squared. Excess weight raises the risk of diabetes and high blood pressure, the two main causes of CKD.",
  HistoryDiabetes: "Diagnosed with diabetes before the study began. Diabetes is the most common cause of CKD.",
  HistoryHTN: "Diagnosed with high blood pressure before the study began. It is the second most common cause of CKD.",
  HistoryCHD: "Narrowed arteries supplying the heart. Heart and kidney disease share risk factors and often occur together.",
  HistoryVascular: "A history of disease in the blood vessels, such as a stroke or poor circulation in the legs. Damaged vessels elsewhere often go together with damage to the small vessels in the kidneys.",
  HistoryDLD: "Dyslipidemia: unhealthy levels of cholesterol or other fats in the blood, which damage blood vessels over time.",
  HistoryObesity: "Diagnosed with obesity, usually meaning a BMI of 30 or more.",
  HistorySmoking: "Whether the patient has a history of smoking. Smoking damages blood vessels, including the small ones inside the kidneys.",
  DMmeds: "Taking medicine to lower blood sugar.",
  HTNmeds: "Taking medicine to lower blood pressure.",
  ACEIARB: "ACE inhibitors and ARBs are blood-pressure medicines that also reduce protein leaking into the urine, so doctors often give them to patients whose kidneys are at risk.",
  DLDmeds: "Taking medicine to lower cholesterol, such as a statin.",
  eGFRBaseline: "Estimated glomerular filtration rate: roughly how much blood the kidneys clean each minute, calculated from creatinine, age and sex. Below 60 for more than 3 months means CKD stage 3 or worse.",
  CreatnineBaseline: "A waste product of muscle activity that the kidneys filter out, here in µmol/L (88.4 µmol/L = 1 mg/dL). A higher level means the kidneys are filtering less.",
  HgbA1C: "Average blood sugar over the past 2-3 months. 5.7-6.4% is prediabetes and 6.5% or more is diabetes.",
  CholesterolBaseline: "Total cholesterol in the blood. High levels damage blood vessels, including those in the kidneys.",
  TriglyceridesBaseline: "A type of fat in the blood. It is often high in people with diabetes or obesity.",
  sBPBaseline: "The top number of a blood pressure reading: the pressure in the arteries while the heart beats.",
  dBPBaseline: "The bottom number of a blood pressure reading: the pressure in the arteries while the heart rests between beats.",
};

export function aboutText(key: string): string | null {
  return ABOUT[key] ?? null;
}
