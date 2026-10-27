import Predictor from "@/components/Predictor";

/** Part 1 - does the patient have CKD now? */
export default function Home() {
  return (
    <>
      <header className="mb-8">
        <p className="text-sm font-medium text-accent">Part 1 · Diagnosis</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          CKD Risk Predictor
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Enter a patient&apos;s routine blood and urine test results. A machine-learning model
          trained on 400 patients estimates the probability that the patient has chronic kidney
          disease now.
        </p>
      </header>
      <Predictor api="/api" />
    </>
  );
}
