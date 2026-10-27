// Where an eGFR value sits on the KDIGO kidney-function scale (G1 -> G5). The bar runs
// from 0 to 120 mL/min/1.73 m² with each stage as wide as its eGFR range; one colour,
// stronger = less kidney function.
const MAX = 120;

const STAGES = [
  { code: "G5", from: 0, to: 15, name: "kidney failure", color: "bg-stage-6" },
  { code: "G4", from: 15, to: 30, name: "severely decreased", color: "bg-stage-5" },
  { code: "G3b", from: 30, to: 45, name: "moderately to severely decreased", color: "bg-stage-4" },
  { code: "G3a", from: 45, to: 60, name: "mildly to moderately decreased", color: "bg-stage-3" },
  { code: "G2", from: 60, to: 90, name: "mildly decreased", color: "bg-stage-2" },
  { code: "G1", from: 90, to: MAX, name: "normal or high", color: "bg-stage-1" },
];

const pct = (egfr: number) => `${(Math.min(Math.max(egfr, 0), MAX) / MAX) * 100}%`;

/** Live card on the Part 2 page: the eGFR typed into the form, placed on the CKD stages. */
export default function GfrStages({ value, unit }: { value: string; unit: string }) {
  const egfr = value.trim() === "" ? null : Number(value);
  const known = egfr !== null && !Number.isNaN(egfr);
  const stage = known ? STAGES.find((s) => egfr < s.to) ?? STAGES[STAGES.length - 1] : null;

  return (
    <section className="rounded-md border border-border bg-surface shadow-sheet">
      <h2 className="border-b border-border px-5 py-2.5 font-mono text-xs tracking-[0.14em] text-muted uppercase">
        Kidney function today
      </h2>
      <div className="px-5 py-4">
        {known && stage ? (
          <p className="text-sm">
            <span className="font-mono text-2xl font-semibold">{egfr}</span>{" "}
            <span className="font-mono text-xs text-muted">{unit}</span>
            <span className="mt-1 block">
              Stage <span className="font-semibold">{stage.code}</span>
              <span className="text-muted"> - {stage.name}</span>
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted">Enter an eGFR value to place it on the scale.</p>
        )}

        {/* the bracket over G3a-G5: the outcome Part 2 predicts */}
        <div className="mt-5 flex items-end" aria-hidden>
          <div className="border-x border-t border-border-strong px-1 pb-1 text-center" style={{ width: pct(60) }}>
            <span className="relative -top-2.5 bg-surface px-1 font-mono text-[0.625rem] tracking-wide text-muted uppercase">
              CKD stage 3-5
            </span>
          </div>
        </div>

        <div className="relative mt-1.5">
          <div className="flex h-3 gap-0.5" role="img" aria-label={stageSummary(egfr, known)}>
            {STAGES.map((s) => (
              <div
                key={s.code}
                title={`${s.code}: eGFR ${s.from}-${s.to === MAX ? "120+" : s.to - 1}, ${s.name}`}
                className={`${s.color} first:rounded-l-sm last:rounded-r-sm`}
                style={{ width: pct(s.to - s.from) }}
              />
            ))}
          </div>
          {known && (
            <div
              aria-hidden
              className="absolute -top-1.5 h-6 w-0.5 -translate-x-1/2 rounded bg-foreground transition-[left] duration-300"
              style={{ left: pct(egfr) }}
            />
          )}
        </div>
        <div aria-hidden className="relative mt-1.5 h-4 font-mono text-[0.625rem] text-muted">
          {STAGES.map((s) => (
            <span
              key={s.code}
              className="absolute -translate-x-1/2"
              style={{ left: `calc(${pct(s.from)} + ${pct(s.to - s.from)} / 2)` }}
            >
              {s.code}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Stages from the KDIGO guideline. G1-G2 count as CKD only with other signs of kidney
          damage; every patient in this dataset started at G1-G2.
        </p>
      </div>
    </section>
  );
}

function stageSummary(egfr: number | null, known: boolean): string {
  if (!known || egfr === null) return "Kidney function stages G5 to G1; no eGFR entered yet";
  const stage = STAGES.find((s) => egfr < s.to) ?? STAGES[STAGES.length - 1];
  return `eGFR ${egfr}: stage ${stage.code}, ${stage.name}`;
}
