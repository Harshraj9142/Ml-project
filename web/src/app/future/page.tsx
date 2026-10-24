import type { Metadata } from "next";
import Predictor from "@/components/Predictor";

export const metadata: Metadata = {
  title: "Future CKD Risk",
  description:
    "Estimate the risk that an adult without CKD today develops chronic kidney disease (stage 3-5) in the coming years.",
};

/** Part 2 - will the patient develop CKD in the coming years? */
export default function FutureRisk() {
  return (
    <>
      <header className="mb-8">
        <p className="text-sm font-medium text-accent">Part 2 · Prediction</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Future CKD Risk
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          For an adult who does not have CKD today (eGFR 60 or more), estimate the risk of
          developing CKD stage 3-5 over the coming years. The model was trained on 491 patients
          followed for up to 9 years at a hospital in the United Arab Emirates.
        </p>
      </header>
      <Predictor api="/api/future" />
    </>
  );
}
