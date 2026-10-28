import type { ReactNode } from "react";
import { CANDIDATES } from "@/lib/evidence";

// Columns: algorithm | mistakes on average (bar) | won | final exam | gives a %.
// On phones each row stacks: the algorithm, its bar, then the three numbers side by side.
const COLUMNS =
  "grid-cols-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_4.5rem_5.5rem_4.5rem] lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_5.5rem_7rem_5.5rem]";
const SCALE = 14; // the bars run from 0 to 14 mistakes

/** The six classifiers side by side, best first; the chosen one is drawn in kidney red. */
export default function ModelLedger() {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div
        aria-hidden
        className={`${COLUMNS} hidden gap-x-4 border-b border-border bg-surface-muted px-5 py-2 font-mono text-[0.6875rem] tracking-[0.12em] text-muted uppercase sm:grid`}
      >
        <span>Algorithm</span>
        <span>Mistakes on average (of 320)</span>
        <span>Won (of 20)</span>
        <span>Final exam (wrong of 80)</span>
        <span>Gives a %</span>
      </div>
      <ul className="divide-y divide-border">
        {CANDIDATES.map((model) => {
          const chosen = model.verdict === "Chosen";
          return (
            <li
              key={model.name}
              className={`${COLUMNS} grid gap-x-4 gap-y-2.5 px-5 py-3.5 sm:items-center ${chosen ? "bg-brand-soft/60" : ""}`}
            >
              <div className="col-span-3 flex items-baseline justify-between gap-3 sm:col-span-1 sm:block">
                <p className={chosen ? "font-semibold" : "font-medium"}>{model.name}</p>
                <p className="sm:mt-1">
                  <Verdict chosen={chosen}>{model.verdict}</Verdict>
                </p>
              </div>
              {/* the bar starts at a hairline zero line; its number sits at the tip */}
              <div className="col-span-3 flex items-center gap-2 border-l border-border-strong sm:col-span-1">
                <span className="sr-only">Mistakes on average:</span>
                <span
                  aria-hidden
                  className={`fill-in h-2 rounded-r-[4px] ${chosen ? "bg-brand" : "bg-bar-quiet"}`}
                  style={{ width: `${(model.avgWrong / SCALE) * 85}%` }}
                />
                <span className="font-mono text-sm tabular-nums">{model.avgWrong.toFixed(2)}</span>
              </div>
              <Stat label="Won (of 20)" value={String(model.wins)} />
              <Stat label="Exam wrong" value={String(model.examWrong)} />
              <Stat label="Gives a %" value={model.givesPercent ? "Yes" : "No"} quiet={!model.givesPercent} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * A number in the table. On phones it carries its own short label, since the header row is
 * hidden there; the numbers sit on the bottom line, so they stay level even if a label wraps.
 */
function Stat({ label, value, quiet = false }: { label: string; value: string; quiet?: boolean }) {
  return (
    <p className="flex flex-col justify-between">
      <span className="block font-mono text-[0.625rem] tracking-[0.12em] text-muted uppercase sm:sr-only">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${quiet ? "text-muted" : ""}`}>{value}</span>
    </p>
  );
}

/** An algorithm's verdict. The chosen one is stamped on, like the verdict on the result card. */
export function Verdict({ chosen = false, children }: { chosen?: boolean; children: ReactNode }) {
  return (
    <span
      className={`font-mono text-[0.6875rem] tracking-wider uppercase ${
        chosen ? "inline-block -rotate-2 rounded-sm border-2 border-brand px-1.5 font-semibold text-brand" : "text-muted"
      }`}
    >
      {children}
    </span>
  );
}
