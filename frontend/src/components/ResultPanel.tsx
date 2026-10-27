import type { ReactNode } from "react";
import { AlertIcon, CheckIcon, Icon } from "@/components/Icons";
import { KidneyMark } from "@/components/Kidney";
import { fieldLabel, type Meta, type Prediction } from "@/lib/api";

type Props = {
  meta: Meta;
  result: Prediction | null;
  stale: boolean;
  busy: boolean;
  error: string | null;
  children?: ReactNode; // extra cards between the result and the model card (Part 2: kidney stages)
};

/** Right-hand column: the model's interpretation (or a hint before the first one), then the model card. */
export default function ResultPanel({ meta, result, stale, busy, error, children }: Props) {
  return (
    <div className="space-y-5">
      <section aria-live="polite" aria-busy={busy} className="rounded-md border border-border bg-surface">
        <h2 className="border-b border-border px-5 py-2.5 font-mono text-xs tracking-[0.14em] text-muted uppercase">
          Interpretation
        </h2>
        {error ? (
          <p role="alert" className="m-5 rounded-sm bg-risk-high-soft px-3 py-2 text-sm text-risk-high">
            {error}
          </p>
        ) : result ? (
          // key: a new result remounts, so the stamp lands again
          <ResultBody
            key={`${result.prediction}-${result.probability_ckd}`}
            meta={meta}
            result={result}
            stale={stale}
            busy={busy}
          />
        ) : (
          <div className="px-5 py-9 text-center">
            <KidneyMark className="mx-auto h-11 w-auto text-border-strong" />
            <p className="mt-3 font-serif text-lg font-semibold">Awaiting results</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
              {meta.labels.start} Load a sample case or change any value, then press{" "}
              <span className="font-medium text-foreground">Predict</span>.
            </p>
          </div>
        )}
      </section>
      {children}
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
  const fieldCount = meta.groups.reduce((n, group) => n + group.fields.length, 0);
  const dim = stale || busy ? "opacity-45" : "";
  return (
    <div>
      <div className={`px-5 pt-6 pb-5 transition-opacity ${dim}`}>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <p className="text-6xl leading-none font-semibold tracking-tight">{formatPercent(p)}</p>
          <p
            className={`stamp mt-1 inline-flex items-center gap-1.5 rounded-sm border-2 px-2.5 py-1 font-mono text-sm font-semibold tracking-wider uppercase ring-1 ring-current ring-offset-2 ring-offset-surface ${
              high ? "border-risk-high text-risk-high" : "border-risk-low text-risk-low"
            }`}
          >
            {high ? <AlertIcon /> : <CheckIcon />}
            {high ? meta.labels.positive : meta.labels.negative}
          </p>
        </div>
        <p className="mt-2 text-sm text-muted">{meta.labels.probability}</p>
        <Meter value={p} high={high} />
      </div>
      <div className="space-y-3 border-t border-border px-5 py-4 text-sm">
        {stale && !busy && (
          <p className="flex items-center gap-2 rounded-sm bg-accent-soft px-3 py-2 font-medium">
            <Icon name="reset" className="size-4 shrink-0" />
            Values changed - press Predict to update.
          </p>
        )}
        {result.missing_features.length > 0 ? (
          <div className={dim}>
            <p className="font-medium">
              Not measured, so filled in with a typical value ({result.missing_features.length}):
            </p>
            <p className="mt-1 text-muted">
              {result.missing_features.map((key) => fieldLabel(meta, key)).join(", ")}.
            </p>
          </div>
        ) : (
          <p className={`flex items-center gap-2 text-muted ${dim}`}>
            <CheckIcon className="size-4 shrink-0 text-risk-low" />
            All {fieldCount} measurements were used.
          </p>
        )}
      </div>
    </div>
  );
}

/** Bar from 0 to 100% with a mark at the 50% cut-off between the two answers. */
function Meter({ value, high }: { value: number; high: boolean }) {
  const percent = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="mt-6">
      <div
        role="meter"
        aria-label="Model score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className={`relative h-2.5 rounded-full ${high ? "bg-risk-high-track" : "bg-risk-low-track"}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${high ? "bg-risk-high" : "bg-risk-low"}`}
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
        <div aria-hidden className="absolute -top-1.5 left-1/2 h-5.5 w-0.5 -translate-x-1/2 rounded bg-foreground/70" />
      </div>
      <div className="mt-2 grid grid-cols-3 font-mono text-[0.6875rem] text-muted tabular-nums">
        <span>0%</span>
        <span className="text-center">50% cut-off</span>
        <span className="text-right">100%</span>
      </div>
    </div>
  );
}

function ModelCard({ meta }: { meta: Meta }) {
  return (
    <section className="rounded-md border border-border bg-surface">
      <h2 className="border-b border-border px-5 py-2.5 font-mono text-xs tracking-[0.14em] text-muted uppercase">
        Model
      </h2>
      <div className="px-5 py-4 text-sm">
        <p className="font-serif text-lg leading-snug font-semibold">{meta.model_name}</p>
        <p className="mt-0.5 text-muted">{meta.about.charAt(0).toUpperCase() + meta.about.slice(1)}</p>
        <dl className="mt-4 divide-y divide-border border-y border-border">
          {meta.stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline justify-between py-2">
              <dt className="font-mono text-xs tracking-wide text-muted uppercase">{stat.label}</dt>
              <dd className="font-mono text-base font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-muted">{meta.stats_note}</p>
      </div>
    </section>
  );
}

function formatPercent(p: number): string {
  if (p < 0.01) return "<1%";
  if (p > 0.99) return ">99%";
  return `${Math.round(p * 100)}%`;
}
