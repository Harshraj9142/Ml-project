import { fieldLabel, type Meta, type Prediction } from "@/lib/api";

type Props = {
  meta: Meta;
  result: Prediction | null;
  stale: boolean;
  busy: boolean;
  error: string | null;
};

/** Right-hand column: the prediction (or a hint before the first one) and the model's test scores. */
export default function ResultPanel({ meta, result, stale, busy, error }: Props) {
  return (
    <div className="space-y-4">
      <section
        aria-live="polite"
        aria-busy={busy}
        className="rounded-xl border border-border bg-surface p-5"
      >
        <h2 className="text-sm font-medium text-muted">Result</h2>
        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-risk-high-soft px-3 py-2 text-sm text-risk-high">
            {error}
          </p>
        ) : result ? (
          <ResultBody meta={meta} result={result} stale={stale} busy={busy} />
        ) : (
          <p className="mt-3 text-sm text-muted">
            {meta.labels.start} Change any value or load an example, then press{" "}
            <span className="font-medium text-foreground">Predict</span>.
          </p>
        )}
      </section>
      <ModelCard meta={meta} />
    </div>
  );
}

function ResultBody({
  meta,
  result,
  stale,
  busy,
}: {
  meta: Meta;
  result: Prediction;
  stale: boolean;
  busy: boolean;
}) {
  const p = result.probability_ckd;
  const high = result.positive;
  return (
    <div>
      <div className={stale || busy ? "opacity-45 transition-opacity" : "transition-opacity"}>
        <p
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
            high ? "bg-risk-high-soft text-risk-high" : "bg-risk-low-soft text-risk-low"
          }`}
        >
          {high ? <AlertIcon /> : <CheckIcon />}
          {high ? meta.labels.positive : meta.labels.negative}
        </p>
        <p className="mt-4 text-5xl font-semibold tracking-tight tabular-nums">{formatPercent(p)}</p>
        <p className="mt-1 text-sm text-muted">{meta.labels.probability}</p>
        <Meter value={p} high={high} />
        {result.missing_features.length > 0 && (
          <p className="mt-4 text-sm text-muted">
            Not measured, so filled in with a typical value:{" "}
            {result.missing_features.map((key) => fieldLabel(meta, key)).join(", ")}.
          </p>
        )}
      </div>
      {stale && !busy && (
        <p className="mt-4 text-sm font-medium">Values changed - press Predict to update.</p>
      )}
    </div>
  );
}

/** Bar from 0 to 100% with a mark at the 50% cut-off between the two answers. */
function Meter({ value, high }: { value: number; high: boolean }) {
  const percent = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="mt-5">
      <div
        role="meter"
        aria-label="Model score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="relative h-2.5 rounded-full bg-track"
      >
        <div
          className={`h-full rounded-full ${high ? "bg-risk-high" : "bg-risk-low"}`}
          style={{ width: `${Math.max(percent, 1.5)}%` }}
        />
        <div aria-hidden className="absolute -top-1 left-1/2 h-4.5 w-0.5 -translate-x-1/2 rounded bg-foreground/50" />
      </div>
      <div className="mt-1.5 grid grid-cols-3 text-xs text-muted tabular-nums">
        <span>0%</span>
        <span className="text-center">50% cut-off</span>
        <span className="text-right">100%</span>
      </div>
    </div>
  );
}

function ModelCard({ meta }: { meta: Meta }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 text-sm">
      <h2 className="font-medium text-muted">About the model</h2>
      <p className="mt-2">
        <span className="font-medium">{meta.model_name}</span>, {meta.about}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {meta.stats.map((stat) => (
          <div key={stat.label} className="rounded-lg bg-surface-muted px-3 py-2">
            <dt className="text-xs text-muted">{stat.label}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">{meta.stats_note}</p>
    </section>
  );
}

function formatPercent(p: number): string {
  if (p < 0.01) return "<1%";
  if (p > 0.99) return ">99%";
  return `${Math.round(p * 100)}%`;
}

function AlertIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path
        fillRule="evenodd"
        d="M8.48 2.95a1.75 1.75 0 0 1 3.04 0l6.28 11.04A1.75 1.75 0 0 1 16.28 16.6H3.72a1.75 1.75 0 0 1-1.52-2.61L8.48 2.95ZM10 6.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6.5Zm0 7.75a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.78a.75.75 0 0 0-1.22-.88l-3.24 4.5-1.6-1.6a.75.75 0 1 0-1.06 1.06l2.22 2.22a.75.75 0 0 0 1.14-.09l3.76-5.21Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
