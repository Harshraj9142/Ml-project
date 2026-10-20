import Predictor from "@/components/Predictor";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-sm font-medium text-accent">Chronic kidney disease screening</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          CKD Risk Predictor
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Enter a patient&apos;s routine blood and urine test results. A machine-learning model
          trained on 400 patients estimates the probability of chronic kidney disease.
        </p>
      </header>

      <Predictor />

      <footer className="mt-12 border-t border-border pt-6 text-sm text-muted">
        Student machine-learning project for learning purposes only - not a medical diagnosis.
        Anyone worried about their kidney health should see a doctor.
      </footer>
    </main>
  );
}
