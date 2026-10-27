import type { Metadata } from "next";
import PageIntro from "@/components/PageIntro";
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
      <PageIntro
        eyebrow="Part 02 — Future risk"
        title="Will this patient develop chronic kidney disease?"
        facts={[
          { value: "491", label: "patients" },
          { value: "9 yrs", label: "max follow-up" },
          { value: "21", label: "measurements" },
        ]}
        figure="Fig. 2 — eGFR estimates how much blood the kidneys filter each minute. Below 60 for more than 3 months means CKD stage 3 or worse."
      >
        For an adult who does not have CKD today (eGFR 60 or more), estimate the risk of
        developing CKD stage 3-5 over the coming years. The model was trained on 491 patients
        followed for up to 9 years at a hospital in the United Arab Emirates.
      </PageIntro>
      <Predictor api="/api/future" />
    </>
  );
}
