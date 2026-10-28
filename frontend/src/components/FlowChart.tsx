type Step = { title: string; text: string; file: string };

const TRAINING: Step[] = [
  {
    title: "Raw data",
    text: "400 patients: 24 routine test results each, plus the doctor's diagnosis (CKD or not).",
    file: "data/kidney_disease.csv",
  },
  {
    title: "Clean",
    text: "\"?\" becomes an empty box, text numbers become real numbers, yes / no becomes 1 / 0.",
    file: "ml/prepare.py",
  },
  {
    title: "Split",
    text: "320 patients to learn from. 80 are locked away for the final exam, with the same share of CKD.",
    file: "ml/train.py · train_test_split",
  },
  {
    title: "Fill in and scale",
    text: "Empty boxes get a typical (median) value. Every test is put on the same scale, so no test counts more just because its numbers are bigger.",
    file: "ml/train.py · make_pipeline",
  },
  {
    title: "Compare",
    text: "All six algorithms, 5-fold cross-validation on the 320. robustness.py repeats it 20 times.",
    file: "ml/train.py · ml/robustness.py",
  },
  {
    title: "Tune",
    text: "GridSearchCV tries C = 0.01, 0.1, 1 and 10 for logistic regression and keeps 10.",
    file: "ml/train.py · GridSearchCV",
  },
  {
    title: "Final exam",
    text: "The 80 locked-away patients, seen for the first time: 78 right.",
    file: "ml/train.py",
  },
  {
    title: "Save",
    text: "The fill-in values, the scaling, the 24 weights and the bias go into one file.",
    file: "models/ckd_model.joblib",
  },
];

const PREDICTION: Step[] = [
  {
    title: "Fill in the form",
    text: "Type the test results, or load a sample case. Boxes can be left empty.",
    file: "frontend · PatientForm.tsx",
  },
  {
    title: "Send",
    text: "The page turns the boxes into numbers (empty = null) and posts them to /api/predict.",
    file: "frontend · lib/api.ts",
  },
  {
    title: "Forward",
    text: "Next.js passes every /api request on to the Python server.",
    file: "frontend · next.config.ts",
  },
  {
    title: "Check",
    text: "The API makes sure every field is one the model knows.",
    file: "backend/api.py",
  },
  {
    title: "Clean",
    text: "The same clean-up as in training, so the model sees data in the same form.",
    file: "ml/predict.py · ml/prepare.py",
  },
  {
    title: "Run the saved model",
    text: "From the file saved in step A8: fill in, scale, score z, sigmoid. Nothing is trained here.",
    file: "models/ckd_model.joblib",
  },
  {
    title: "Show the answer",
    text: "50% or more means likely CKD. The page shows the percentage, the stamp and the score bar.",
    file: "frontend · ResultPanel.tsx",
  },
];

/** The whole journey: training (run once) beside prediction (every Predict click). */
export default function FlowChart() {
  return (
    <div className="grid gap-x-10 gap-y-10 md:grid-cols-2">
      <Column code="A" title="Training" when="Run once: python ml/train.py" steps={TRAINING} />
      <Column code="B" title="Prediction" when="Every time you press Predict" steps={PREDICTION} />
    </div>
  );
}

function Column({ code, title, when, steps }: { code: string; title: string; when: string; steps: Step[] }) {
  return (
    <div>
      <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border-strong pb-2">
        <span className="font-serif text-xl font-semibold tracking-tight">{title}</span>
        <span className="ml-auto font-mono text-[0.6875rem] tracking-wide text-muted">{when}</span>
      </h3>
      <ol className="mt-5">
        {steps.map((step, i) => (
          <li key={step.title} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0">
            {/* the thread joining one step to the next */}
            {i < steps.length - 1 && (
              <span aria-hidden className="absolute top-9 bottom-0 left-[1.125rem] w-px bg-border-strong" />
            )}
            <span className="flex size-9 items-center justify-center rounded-sm border border-border-strong bg-surface font-mono text-xs font-semibold text-brand">
              {code}
              {i + 1}
            </span>
            <div className="pt-1">
              <p className="font-medium">{step.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{step.text}</p>
              <p className="mt-1.5 font-mono text-[0.6875rem] tracking-wide text-foreground/80">{step.file}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
