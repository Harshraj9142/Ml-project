import type { Metadata } from "next";
import type { ReactNode } from "react";
import FlowChart from "@/components/FlowChart";
import { AlertIcon, CheckIcon } from "@/components/Icons";
import ModelLedger, { Verdict } from "@/components/ModelLedger";
import PageIntro from "@/components/PageIntro";
import PageTransition from "@/components/PageTransition";
import ReportFigure from "@/components/ReportFigure";
import { SigmoidFigure } from "@/components/Sigmoid";
import { CANDIDATES, FINAL, FUTURE, TOP_WEIGHTS, WORKED } from "@/lib/evidence";

export const metadata: Metadata = {
  title: "Method",
  description:
    "Why the CKD predictor uses logistic regression, why the other course algorithms were not chosen, how logistic regression works, and the full path from raw data to a prediction.",
};

const SECTIONS = [
  { id: "needs", title: "What the model has to do" },
  { id: "comparison", title: "Six algorithms, one fair test" },
  { id: "why-not", title: "Why not the others?" },
  { id: "how-it-works", title: "How logistic regression works" },
  { id: "flow", title: "The full flow, from data to answer" },
  { id: "part-2", title: "Part 2: the same choice, one twist" },
];

const NEEDS = [
  {
    title: "Few mistakes",
    text: "Above all, few missed CKD patients. A missed patient goes home without treatment; a false alarm only costs one more test.",
  },
  {
    title: "Says how sure it is",
    text: "A percentage, not just yes or no. 51% and 99% should not look the same to a doctor.",
  },
  {
    title: "Shows its reasons",
    text: "We can see which tests pushed the answer towards CKD and which pushed it away.",
  },
  {
    title: "Simple and fast",
    text: "Trains in about a second and answers with one formula, simple enough to write by hand (we did: ml/logistic_regression.py).",
  },
];

const [CHOSEN] = CANDIDATES;

/** Part 3 - why logistic regression, how it works, and how the whole project fits together. */
export default function Method() {
  return (
    <PageTransition>
      <PageIntro
        eyebrow="Part 03 — Method"
        title="Why logistic regression?"
        facts={[
          { value: "6", label: "algorithms compared" },
          { value: "20", label: "repeat checks" },
          { value: `${FINAL.right}/${FINAL.tested}`, label: "final exam right" },
        ]}
        figure="Fig. 3 — The sigmoid. Logistic regression adds the test results up into one score, z, and this S-curve turns the score into a probability: far left is near 0%, far right near 100%, and a score of exactly 0 gives 50%."
        Drawing={SigmoidFigure}
      >
        We trained six algorithms from the course on the same patients and kept the one that
        makes the fewest mistakes and can also say how sure it is. This page shows the evidence,
        how the chosen model turns test results into a percentage, and the full path from the raw
        data to the answer on screen.
      </PageIntro>

      <Contents />

      <div className="space-y-8">
        <Sheet index={0}>
          <Text>
            Before comparing algorithms, we wrote down what a good CKD model needs. Every
            candidate was judged on these four points.
          </Text>
          <ol className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {NEEDS.map((need, i) => (
              <li key={need.title} className="bg-surface px-4 py-4">
                <span className="font-mono text-xs font-semibold text-brand">0{i + 1}</span>
                <p className="mt-2 font-serif text-lg leading-snug font-semibold">{need.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{need.text}</p>
              </li>
            ))}
          </ol>
        </Sheet>

        <Sheet index={1}>
          <Text>
            Every algorithm learned from the same 320 patients and was marked on patients it had
            not seen. This is <Term>5-fold cross-validation</Term>: split the 320 into 5 parts,
            learn from 4, test on the 5th, and rotate until every part has been the test once. One
            shuffle can be lucky, so <Code>robustness.py</Code> repeated the whole check 20 times
            with different shuffles. Finally, each algorithm sat a <Term>final exam</Term> on the
            80 patients locked away at the very start.
          </Text>
          <div>
            <ModelLedger />
            <p className="mt-3 max-w-4xl text-xs leading-relaxed text-muted">
              <b className="font-semibold text-foreground">Mistakes on average:</b> patients wrong
              out of the 320, averaged over the 20 repeats.{" "}
              <b className="font-semibold text-foreground">Won:</b> how often an algorithm had the
              best F1 score (a balance of finding CKD and avoiding false alarms); a tie counts as
              half. <b className="font-semibold text-foreground">Final exam:</b> every algorithm on
              its default settings. The tuned model the website uses (C = {FINAL.C}) got{" "}
              {FINAL.tested - FINAL.right} wrong there, see section E.
            </p>
          </div>
          <ReportFigure
            file="09_robustness_check.png"
            number={4}
            alt="Robustness check. Average patients wrong out of 320 over 20 repeats: logistic regression 2.95, SLP 3.75, PLA 4.25, linear regression 11.15, naive Bayes 12, KNN 12.45. Times ranked first out of 20: logistic regression 11, SLP 5.5, PLA 3.5, the other three 0."
          >
            The same 20 repeats as a chart. Left: each dot is one repeat and the black line is the
            average, so further left means fewer mistakes. Right: how often each algorithm came
            first.
          </ReportFigure>
          <ReportFigure
            file="10_course_confusion_matrices.png"
            number={5}
            alt="Six confusion matrices for the 80 test patients. Wrong answers: logistic regression 1, SLP 3, PLA 0, linear regression 5, naive Bayes 2, KNN 3. Almost every mistake is a missed CKD patient; only SLP made a false alarm."
          >
            The final exam for every algorithm. Each box is a confusion matrix: rows are the real
            diagnosis, columns are what the model said. The bottom-left number is the costly one:
            CKD patients the model called healthy.
          </ReportFigure>
        </Sheet>

        <Sheet index={2}>
          <Text>
            Every algorithm here learned something useful: even the weakest got about 96% right.
            The choice comes down to the four needs in section A.
          </Text>
          <article className="rounded-md border border-l-4 border-border border-l-brand bg-brand-soft/50 px-5 py-4">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h3 className="font-serif text-xl font-semibold tracking-tight">{CHOSEN.name}</h3>
              <Verdict chosen>{CHOSEN.verdict}</Verdict>
            </header>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed">
              Adds the tests up with a weight for each, then the sigmoid turns the total into a
              probability. It meets all four needs:
            </p>
            <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <Tick>
                Fewest mistakes: {CHOSEN.avgWrong} of 320 on average, and never more than{" "}
                {CHOSEN.most} in any repeat.
              </Tick>
              <Tick>Came first in {CHOSEN.wins} of 20 repeats, more than any other.</Tick>
              <Tick>Gives a percentage, which the website shows on the result card.</Tick>
              <Tick>Its weights show which tests mattered (section D).</Tick>
            </ul>
          </article>
          <div className="grid gap-4 md:grid-cols-2">
            <Rejected
              name="SLP"
              verdict="Runner-up"
              does="Our own perceptron from the AND-gate lab: the same weighted sum, but with a step instead of the S-curve, so the answer is only yes or no."
              evidence="3.75 wrong on average · won 5.5 of 20 · no %"
            >
              Very close on mistakes, but it can&apos;t say how sure it is. It also stops learning
              as soon as every training patient is right, so it keeps the first line that works,
              not the safest one, and that line depends on the order it saw the patients in.
            </Rejected>
            <Rejected
              name="PLA (Perceptron)"
              verdict="Yes / no only"
              does="scikit-learn's version of the same perceptron learning rule."
              evidence="0 wrong of 80 on the exam · 4.25 on average · up to 10"
            >
              It got all 80 final-exam patients right, but that is one split. Over 20 repeats it
              made more mistakes than logistic regression (4.25 against 2.95), went up to 10 wrong
              in one repeat, and came first only 3.5 times. Like SLP, it gives no percentage.
            </Rejected>
            <Rejected
              name="Linear Regression"
              verdict="Wrong tool"
              does="Fits the best straight line through numbers. It is made for predicting amounts, like a price or a blood value."
              evidence="11.15 wrong on average · missed 5 of 50 on the exam"
            >
              Its output is not a probability. On the 80 test patients it answered anything from
              −0.59 to 1.69, and 25 answers fell outside 0 to 1: what would 169% CKD mean? We had
              to cut it at 0.5 by hand, and it still missed 5 of the 50 CKD patients.
            </Rejected>
            <Rejected
              name="Naive Bayes"
              verdict="More mistakes"
              does="Works out the chance of CKD from each test on its own, then multiplies the chances together."
              evidence="12 wrong on average · never came first"
            >
              It assumes the tests are unrelated. In kidney disease they are not: hemoglobin,
              packed cell volume and red blood cell count all drop together, so it counts the same
              clue three times. It gives a percentage, but makes four times as many mistakes.
            </Rejected>
            <Rejected
              name="KNN"
              verdict="More mistakes"
              does="Has no formula. It keeps every training patient and copies the majority answer of the 5 most similar ones."
              evidence="12.45 wrong on average · never came first"
            >
              With 24 tests, &ldquo;most similar&rdquo; gets blurry, and filled-in empty boxes
              blur it more. It made the most mistakes, has to search every stored patient for each
              prediction, and can&apos;t say which tests mattered.
            </Rejected>
            <Rejected
              name="k-means and DBSCAN"
              verdict="Not classifiers"
              does="Clustering: they put patients who look alike into groups, without ever seeing the diagnosis."
              evidence="k-means group 1: 193 of 193 CKD · DBSCAN outliers: 164 of 164 CKD"
            >
              They never see the diagnosis, so they can&apos;t learn to give one. We used them to
              check something else: do CKD patients stand apart by themselves? They do. k-means
              made a group of 193 patients who all had CKD, and the 164 patients DBSCAN called
              unusual all had CKD too (Fig. 6).
            </Rejected>
          </div>
          <ReportFigure
            file="11_clustering.png"
            number={6}
            alt="Four panels. The 400 patients squashed to two axes: with the real diagnosis, with the two k-means groups (matching the diagnosis for 86%), with DBSCAN's dense group and outliers (78%), and the number of DBSCAN outliers as eps grows. Healthy patients form one tight cluster; CKD patients are spread around it."
          >
            Clustering with the diagnosis hidden. Healthy patients (blue, top left) form one tight
            group and CKD patients are spread out around it. k-means and DBSCAN find this split by
            themselves, agreeing with the real diagnosis for 86% and 78% of patients.
          </ReportFigure>
        </Sheet>

        <Sheet index={3}>
          <Text>
            Logistic regression does four simple things. The first three happen for every patient
            the website checks; the fourth happens once, during training.
          </Text>
          <ol className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2">
            <HowStep n={1} title="Add up a score" formula="z = w1·x1 + w2·x2 + … + w24·x24 + b">
              Multiply each test result by its weight and add them all up, plus a starting value
              called the bias. A positive weight pushes towards CKD, a negative one away from it.
            </HowStep>
            <HowStep n={2} title="Squash it with the sigmoid" formula="p = 1 / (1 + e^(−z))">
              The S-curve (Fig. 3, at the top of the page) turns any score into a number between 0
              and 1: the probability of CKD.
            </HowStep>
            <HowStep n={3} title="Decide" formula="CKD if p ≥ 0.5">
              50% or more means likely CKD. This is the percentage and the stamp you see on the
              result card.
            </HowStep>
            <HowStep n={4} title="Learn the weights" formula="w ← w − learning rate × gradient">
              Start every weight at 0. Measure how wrong the probabilities are on the 320 training
              patients (the log-loss), nudge each weight to be a little less wrong (gradient
              descent), and repeat thousands of times. The setting C = {FINAL.C} stops any weight
              from growing too big.
            </HowStep>
          </ol>

          <div>
            <h3 className="font-serif text-lg font-semibold">Worked example: the mildest and the most severe case</h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
              The saved model working through Case 01 and Case 04 from the Part 1 page. Each part is
              a test&apos;s weight × its value (after filling in and scaling). The website rounds
              the answers to &lt;1% and &gt;99%.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {WORKED.map((example) => (
                <Slip key={example.name} example={example} />
              ))}
            </div>
          </div>

          <ReportFigure
            file="18_logistic_regression_scratch.png"
            number={7}
            alt="Two charts. Left: the log-loss falling from 0.69 at the first epoch to about 0.01 after 20,000 epochs. Right: the 80 test patients' scores on the sigmoid curve, CKD patients near probability 1 and healthy patients near 0, with two patients close to the 0.5 line."
          >
            Logistic regression written from scratch in <Code>ml/logistic_regression.py</Code>.
            Left: the loss falls as the weights are nudged, from 0.69 (pure guessing) to almost 0.
            Right: every test patient on the S-curve. CKD patients (red) sit top right, healthy
            ones (blue) bottom left, and only two land near the 50% line. This hand-written version
            gives the same answer as scikit-learn&apos;s for all 80 test patients.
          </ReportFigure>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <ReportFigure
              file="08_feature_importance.png"
              number={8}
              alt="Bar chart of the 12 biggest weights by size: urine specific gravity 2.86, hypertension 2.76, hemoglobin 2.74, appetite 2.67, packed cell volume 2.51, diabetes mellitus 2.41, albumin in urine 2.21, serum creatinine 2.20, then red blood cell count, blood glucose, blood urea and sugar in urine at about 1.3 to 1.4."
            >
              The size of each weight: the bigger it is, the more that test moves the score. The
              top ones are the tests doctors use to spot kidney disease.
            </ReportFigure>
            <div className="rounded-md border border-border">
              <h3 className="border-b border-border bg-surface-muted px-4 py-2 font-mono text-[0.6875rem] tracking-[0.12em] text-muted uppercase">
                Pushes towards CKD when
              </h3>
              <ul className="divide-y divide-border">
                {TOP_WEIGHTS.map((w) => (
                  <li key={w.test} className="flex items-baseline justify-between gap-3 px-4 py-2 text-sm">
                    <span>{w.test}</span>
                    <span className="shrink-0 font-mono text-xs">
                      <b className="font-semibold">{w.towardsCkdWhen}</b>{" "}
                      <span className="text-muted tabular-nums">{signed(w.weight)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Sheet>

        <Sheet index={4}>
          <Text>
            Training happens once and saves what it learned into a file. The website never trains
            again: for each patient it loads that file and does one sum and one sigmoid, which is
            why the answer is instant.
          </Text>
          <FlowChart />
          <div className="grid items-center gap-6 border-t border-border pt-6 md:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <h3 className="font-serif text-lg font-semibold">Final exam of the model the website uses</h3>
              <p className="mt-1 text-sm text-muted">
                Step A7: logistic regression with C = {FINAL.C}, on the {FINAL.tested} patients it
                had never seen.
              </p>
              <dl className="mt-4 divide-y divide-border border-y border-border">
                <Result label="Accuracy" value={FINAL.accuracy} note={`${FINAL.right} of ${FINAL.tested} right`} />
                <Result label="Recall" value={FINAL.recall} note="48 of 50 CKD patients found" />
                <Result label="Precision" value={FINAL.precision} note="no false alarms" />
                <Result label="Missed" value={String(FINAL.missed)} note="CKD patients called healthy" />
              </dl>
            </div>
            <ReportFigure
              file="06_confusion_matrix.png"
              number={9}
              alt="Confusion matrix of the final model on 80 test patients: 30 not-CKD patients predicted not CKD, 0 false alarms, 2 CKD patients predicted not CKD, 48 CKD patients predicted CKD."
            >
              The same exam as a confusion matrix: all 30 healthy patients called healthy, 48 of 50
              CKD patients found.
            </ReportFigure>
          </div>
        </Sheet>

        <Sheet index={5}>
          <Text>
            Part 2 asks a harder question: will a patient who is fine today develop CKD in the
            coming years? The same algorithms were compared on 491 patients from a hospital in the
            UAE, and logistic regression won again, with one change.
          </Text>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-[auto_auto_minmax(0,1fr)]">
            <BigNumber value={FUTURE.baselineAccuracy} label="accuracy of always saying “no CKD”" />
            <BigNumber value="0" label="future CKD patients it catches" />
            <p className="col-span-2 bg-surface px-5 py-4 text-sm leading-relaxed sm:col-span-1">
              <b className="font-semibold">The trap.</b> Only {FUTURE.shareWithCkd} patients went on
              to develop CKD, so a &ldquo;model&rdquo; that always answers no is right{" "}
              {FUTURE.baselineAccuracy} of the time and helps nobody. That is why Part 2 is judged
              on <Term>recall</Term> (how many future CKD patients are caught) and{" "}
              <Term>ROC-AUC</Term> (how well it ranks risky patients above safe ones), not on
              accuracy.
            </p>
          </div>
          <Text>
            <b className="font-semibold">The fix: balanced logistic regression.</b> Plain logistic
            regression learned that &ldquo;no&rdquo; is usually right and caught only{" "}
            {FUTURE.plainRecall} of future CKD patients. With <Code>class_weight=&quot;balanced&quot;</Code>,
            each CKD patient counts about 8 times as much while it learns, and it caught{" "}
            {FUTURE.balancedRecall}. Naive Bayes came close on recall ({FUTURE.naiveBayesRecall})
            but ranks patients less well (ROC-AUC {FUTURE.naiveBayesAuc} against{" "}
            {FUTURE.balancedAuc}), and it has the same &ldquo;tests are unrelated&rdquo; problem as
            in Part 1. We also removed the follow-up time column: it is only known years later, so
            using it would be cheating.
          </Text>
          <Text>
            <b className="font-semibold">Final exam</b> on {FUTURE.tested} unseen patients (C ={" "}
            {FUTURE.C}): it caught {FUTURE.caught} of the {FUTURE.testCkd} who developed CKD, with a
            ROC-AUC of {FUTURE.testAuc}. The price is {FUTURE.falseAlarms} false alarms, a fair trade
            for screening, where a false alarm means one more check-up. Its accuracy (86.9%) is
            even a little lower than always saying no (88.9% on these patients), and it is still
            far more useful.
          </Text>
          <ReportFigure
            file="12_future_model_comparison.png"
            number={10}
            alt="Two bar charts for the Part 2 models. ROC-AUC: balanced logistic regression 0.85, logistic regression 0.85, linear regression 0.84, naive Bayes 0.83, KNN 0.78, SLP 0.76, PLA 0.72, always-no baseline 0.50. Recall: balanced logistic regression 0.69, naive Bayes 0.68, SLP 0.30, PLA 0.27, logistic regression 0.21, linear regression 0.14, KNN 0.09, baseline 0."
          >
            Part 2 compared. Left: ROC-AUC, where 0.5 is a coin toss and 1 is perfect. Right:
            recall, the share of future CKD patients caught. The red bar, balanced logistic
            regression, is best on both; the grey baseline always says &ldquo;no CKD&rdquo;.
          </ReportFigure>
        </Sheet>
      </div>

      <section aria-labelledby="conclusion" className="mt-12 border-l-4 border-brand pl-5 sm:pl-7">
        <h2 id="conclusion" className="font-mono text-xs tracking-[0.14em] text-brand uppercase">
          Conclusion
        </h2>
        <p className="mt-3 max-w-4xl font-serif text-2xl leading-snug font-semibold text-balance sm:text-[1.75rem]">
          We use logistic regression because, across 20 repeated tests, it made the fewest mistakes
          of the six course algorithms, it is the only top performer that gives a probability, and
          its weights show which tests drove each answer.
        </p>
      </section>
    </PageTransition>
  );
}

const letter = (index: number) => String.fromCharCode(65 + index);

/** The list of sections under the title, each a link down to it. */
function Contents() {
  return (
    <nav aria-label="On this page" className="mb-8 overflow-hidden rounded-md border border-border bg-surface shadow-sheet">
      <h2 className="border-b border-border px-5 py-2.5 font-mono text-xs tracking-[0.14em] text-muted uppercase">
        Contents
      </h2>
      <ol className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section, i) => (
          <li key={section.id} className="bg-surface">
            <a
              href={`#${section.id}`}
              className="flex items-baseline gap-3 px-5 py-3 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            >
              <span className="font-mono text-sm font-semibold text-brand">{letter(i)}</span>
              <span className="text-sm font-medium">{section.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** One lettered section of the report, on its own sheet. */
function Sheet({ index, children }: { index: number; children: ReactNode }) {
  const { id, title } = SECTIONS[index];
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 rounded-md border border-border bg-surface shadow-sheet">
      <h2 id={`${id}-title`} className="flex items-baseline gap-3 border-b border-border px-5 py-3.5">
        <span className="font-mono text-sm font-semibold text-brand">{letter(index)}</span>
        <span className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">{title}</span>
      </h2>
      <div className="space-y-7 px-5 py-6 sm:px-6">{children}</div>
    </section>
  );
}

function Text({ children }: { children: ReactNode }) {
  return <p className="max-w-3xl leading-relaxed">{children}</p>;
}

/** A technical term, the first time it is explained. */
function Term({ children }: { children: ReactNode }) {
  return <b className="font-semibold">{children}</b>;
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-sm bg-surface-muted px-1 py-px font-mono text-[0.85em]">{children}</code>;
}

function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand" />
      <span>{children}</span>
    </li>
  );
}

/** An algorithm that wasn't chosen: what it does, why not, and the numbers behind that. */
function Rejected({
  name,
  verdict,
  does,
  evidence,
  children,
}: {
  name: string;
  verdict: string;
  does: string;
  evidence: string;
  children: ReactNode; // why not
}) {
  return (
    <article className="flex flex-col rounded-md border border-border px-5 py-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-serif text-lg font-semibold tracking-tight">{name}</h3>
        <Verdict>{verdict}</Verdict>
      </header>
      <p className="mt-2 text-sm leading-relaxed text-muted">{does}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed">
        <b className="font-semibold">Why not: </b>
        {children}
      </p>
      <p className="mt-4 border-t border-dashed border-border-strong pt-2.5 font-mono text-[0.6875rem] tracking-wide text-muted">
        {evidence}
      </p>
    </article>
  );
}

function HowStep({ n, title, formula, children }: { n: number; title: string; formula: string; children: ReactNode }) {
  return (
    <li className="bg-surface px-5 py-4">
      <p className="flex items-baseline gap-3">
        <span className="font-mono text-xs font-semibold text-brand">0{n}</span>
        <span className="font-serif text-lg font-semibold">{title}</span>
      </p>
      <p className="mt-2 overflow-x-auto rounded-sm bg-surface-muted px-3 py-2 font-mono text-sm whitespace-nowrap">
        {formula}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </li>
  );
}

/** A worked example, laid out like a calculation slip: the biggest parts, the rest, the bias, the total. */
function Slip({ example }: { example: (typeof WORKED)[number] }) {
  return (
    <div className="rounded-md border border-border bg-surface-muted/50 px-4 py-4">
      <p className="font-medium">{example.name}</p>
      <table className="mt-3 w-full font-mono text-xs sm:text-sm">
        <caption className="sr-only">How the score for {example.name} adds up</caption>
        <tbody className="[&_td]:py-1 [&_td:last-child]:text-right [&_td:last-child]:tabular-nums">
          {example.parts.map((part) => (
            <tr key={part.test}>
              <td>
                {part.test} <span className="text-muted">({part.value})</span>
              </td>
              <td>{signed(part.part)}</td>
            </tr>
          ))}
          <tr>
            <td className="text-muted">The other 21 tests</td>
            <td>{signed(example.rest)}</td>
          </tr>
          <tr>
            <td className="text-muted">Bias b</td>
            <td>{signed(example.bias)}</td>
          </tr>
          <tr className="border-t border-foreground/60 font-semibold">
            <td className="pt-2!">Score z</td>
            <td className="pt-2!">{signed(example.z)}</td>
          </tr>
          <tr className="font-semibold">
            <td>p = sigmoid(z)</td>
            <td>{example.p}</td>
          </tr>
        </tbody>
      </table>
      <p
        className={`mt-3 inline-flex items-center gap-1.5 rounded-sm border-2 px-2 py-0.5 font-mono text-xs font-semibold tracking-wider uppercase ${
          example.positive ? "border-risk-high text-risk-high" : "border-risk-low text-risk-low"
        }`}
      >
        {example.positive ? <AlertIcon /> : <CheckIcon />}
        {example.positive ? "Likely CKD" : "Not CKD"}
      </p>
    </div>
  );
}

function Result({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="font-mono text-xs tracking-wide text-muted uppercase">{label}</dt>
      <dd className="text-right">
        <span className="font-mono text-base font-semibold tabular-nums">{value}</span>
        <span className="ml-2 text-xs text-muted">{note}</span>
      </dd>
    </div>
  );
}

/** A big number with its label, for the Part 2 trap. */
function BigNumber({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="font-mono text-3xl font-semibold">{value}</p>
      <p className="mt-1 max-w-[11rem] text-xs leading-snug text-muted">{label}</p>
    </div>
  );
}

/** A score part with its sign, using a real minus sign. */
function signed(n: number): string {
  return `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(2)}`;
}
