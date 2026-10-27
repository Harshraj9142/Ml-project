// Typical adult reference ranges, shown next to each lab test like on a printed lab report,
// so values outside them can be flagged H (high) / L (low) while you type. Labs differ
// slightly; these are common textbook values. They are only a reading aid - the model
// itself never sees them.
//
// Only lab tests get a range. Medical history, medicines, age and sex are answers, not
// results, and Part 1's "blood pressure" is left out because the dataset doesn't say
// whether it is systolic or diastolic.

type NumberRange = {
  text: string; // as printed in the Reference column
  min?: number; // below this -> L
  max?: number; // above this -> H
  below?: number; // normal only when below this ("< 5.7"), so this value or more -> H
};
type ChoiceRange = { text: string; normal: string }; // any other answer -> abnormal

const RANGES: Record<string, NumberRange | ChoiceRange> = {
  // Part 1 - UCI dataset units
  sg: { text: "1.005–1.030", min: 1.005, max: 1.03 },
  al: { text: "0", max: 0 },
  su: { text: "0", max: 0 },
  rbc: { text: "normal", normal: "normal" },
  pc: { text: "normal", normal: "normal" },
  pcc: { text: "not present", normal: "notpresent" },
  ba: { text: "not present", normal: "notpresent" },
  bgr: { text: "70–140", min: 70, max: 140 },
  bu: { text: "15–40", min: 15, max: 40 },
  sc: { text: "0.6–1.2", min: 0.6, max: 1.2 },
  sod: { text: "135–145", min: 135, max: 145 },
  pot: { text: "3.5–5.0", min: 3.5, max: 5 },
  hemo: { text: "12.0–17.0", min: 12, max: 17 },
  pcv: { text: "36–50", min: 36, max: 50 },
  wc: { text: "4000–11000", min: 4000, max: 11000 },
  rc: { text: "4.0–6.0", min: 4, max: 6 },
  // Part 2 - UAE dataset units
  BMIBaseline: { text: "18.5–24.9", min: 18.5, max: 24.9 },
  eGFRBaseline: { text: "≥ 60", min: 60 },
  CreatnineBaseline: { text: "53–106", min: 53, max: 106 },
  HgbA1C: { text: "< 5.7", below: 5.7 },
  CholesterolBaseline: { text: "< 5.2", below: 5.2 },
  TriglyceridesBaseline: { text: "< 1.7", below: 1.7 },
  sBPBaseline: { text: "< 120", below: 120 },
  dBPBaseline: { text: "< 80", below: 80 },
};

export type Flag = "high" | "low" | "abnormal" | null;

export function referenceText(key: string): string | null {
  return RANGES[key]?.text ?? null;
}

/** H / L / abnormal for one form value, or null when it is in range, empty, or has no range. */
export function flagFor(key: string, value: string): Flag {
  const range = RANGES[key];
  const text = value.trim();
  if (!range || text === "") return null;
  if ("normal" in range) return text === range.normal ? null : "abnormal";
  const v = Number(text);
  if (Number.isNaN(v)) return null;
  if (range.min !== undefined && v < range.min) return "low";
  if (range.max !== undefined && v > range.max) return "high";
  if (range.below !== undefined && v >= range.below) return "high";
  return null;
}
