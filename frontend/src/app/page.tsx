import PageIntro from "@/components/PageIntro";
import Predictor from "@/components/Predictor";

/** Part 1 - does the patient have CKD now? */
export default function Home() {
  return (
    <>
      <PageIntro
        eyebrow="Part 01 — Diagnosis"
        title="Does this patient have chronic kidney disease?"
        facts={[
          { value: "400", label: "patients" },
          { value: "24", label: "routine tests" },
          { value: "6", label: "algorithms" },
        ]}
        figure="Fig. 1 — The kidney. Each one holds about a million tiny filters, called nephrons."
      >
        Enter a patient&apos;s routine blood and urine test results. A machine-learning model
        trained on 400 patients estimates the probability that the patient has chronic kidney
        disease now.
      </PageIntro>
      <Predictor api="/api" />
    </>
  );
}
