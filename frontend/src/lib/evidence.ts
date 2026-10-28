// The numbers on the Method page, copied from the files the ML scripts write. reports/ is
// not in git (the scripts re-create it), so the website keeps its own copy - re-copy these,
// and the figures in src/figures/, if you change the scripts and run them again.
//   robustness.py      -> reports/robustness_check.csv  (5-fold cross-validation, repeated 20 times)
//   course_models.py   -> reports/course_models.csv     (final exam on the 80 test patients)
//   train.py           -> reports/metrics.json          (the tuned model the website uses)
//   future_ckd.py      -> reports/future_model_comparison.csv, reports/future_ckd_metrics.json

export type Candidate = {
  name: string;
  avgWrong: number; // training patients wrong (out of 320), averaged over the 20 repeats
  fewest: number; // fewest wrong in any of the 20 repeats
  most: number; // most wrong in any of the 20 repeats
  wins: number; // times it had the best F1 score, out of 20 (a tie counts half)
  examWrong: number; // wrong out of the 80 test patients, on default settings
  givesPercent: boolean; // can it say how sure it is?
  verdict: string;
};

/** Part 1, best first. */
export const CANDIDATES: Candidate[] = [
  { name: "Logistic Regression", avgWrong: 2.95, fewest: 1, most: 6, wins: 11, examWrong: 1, givesPercent: true, verdict: "Chosen" },
  { name: "SLP", avgWrong: 3.75, fewest: 1, most: 7, wins: 5.5, examWrong: 3, givesPercent: false, verdict: "Runner-up" },
  { name: "PLA (Perceptron)", avgWrong: 4.25, fewest: 1, most: 10, wins: 3.5, examWrong: 0, givesPercent: false, verdict: "Yes / no only" },
  { name: "Linear Regression", avgWrong: 11.15, fewest: 8, most: 17, wins: 0, examWrong: 5, givesPercent: false, verdict: "Wrong tool" },
  { name: "Naive Bayes", avgWrong: 12, fewest: 12, most: 12, wins: 0, examWrong: 2, givesPercent: true, verdict: "More mistakes" },
  { name: "KNN", avgWrong: 12.45, fewest: 10, most: 15, wins: 0, examWrong: 3, givesPercent: true, verdict: "More mistakes" },
];

/** Part 1: the tuned logistic regression (C = 10) on the 80 test patients. */
export const FINAL = {
  C: 10,
  tested: 80,
  right: 78,
  accuracy: "97.5%",
  recall: "96%", // 48 of 50 CKD patients found
  precision: "100%", // no false alarms
  missed: 2,
  falseAlarms: 0,
};

/** Part 2: future CKD, compared by 5-fold cross-validation repeated 10 times. */
export const FUTURE = {
  shareWithCkd: "about 1 in 9", // 11.5% of patients went on to develop CKD
  baselineAccuracy: "88.5%", // "always no CKD" - right for everyone who stayed healthy, nobody caught
  plainRecall: "21%",
  balancedRecall: "69%",
  balancedAuc: "0.85",
  naiveBayesRecall: "68%",
  naiveBayesAuc: "0.83",
  C: 0.1,
  tested: 99,
  testCkd: 11,
  caught: 9,
  falseAlarms: 11,
  testAuc: "0.91",
};

/**
 * The mildest and the most severe sample case from Part 1 (Case 01 and Case 04), worked
 * through by the saved model: each test's part of
 * the score is its weight x its (filled-in, scaled) value. The three biggest parts are listed;
 * the other 21 tests are added up together.
 */
export const WORKED = [
  {
    name: "Case 01 · Healthy",
    parts: [
      { test: "Urine specific gravity", value: "1.025", part: -3.9 },
      { test: "Hemoglobin", value: "15.5 g/dL", part: -2.95 },
      { test: "Packed cell volume", value: "46%", part: -2.18 },
    ],
    rest: -4.89,
    bias: 4.88,
    z: -9.04,
    p: "0.01%",
    positive: false,
  },
  {
    name: "Case 04 · Advanced CKD",
    parts: [
      { test: "Urine specific gravity", value: "1.010", part: 4.13 },
      { test: "Albumin in urine", value: "3 of 5", part: 3.63 },
      { test: "Hypertension", value: "yes", part: 2.76 },
    ],
    rest: 16.19,
    bias: 4.88,
    z: 31.59,
    p: ">99.99%",
    positive: true,
  },
];

/** The tests with the biggest weights, and which way each one pushes the answer. */
export const TOP_WEIGHTS = [
  { test: "Urine specific gravity", weight: -2.86, towardsCkdWhen: "low" },
  { test: "Hypertension", weight: 2.76, towardsCkdWhen: "yes" },
  { test: "Hemoglobin", weight: -2.74, towardsCkdWhen: "low" },
  { test: "Appetite", weight: 2.67, towardsCkdWhen: "poor" },
  { test: "Packed cell volume", weight: -2.51, towardsCkdWhen: "low" },
  { test: "Diabetes mellitus", weight: 2.41, towardsCkdWhen: "yes" },
  { test: "Albumin in urine", weight: 2.21, towardsCkdWhen: "high" },
  { test: "Serum creatinine", weight: 2.2, towardsCkdWhen: "high" },
];
