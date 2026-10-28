"use client";

import { Flow } from "@/components/Kidney";
import { useSettled } from "@/lib/motion";

// The plot inside a 352 x 248 box: the score z runs from -8 to +8 left to right, the
// probability from 0 (bottom) to 1 (top).
const LEFT = 52;
const RIGHT = 328;
const TOP = 36; // p = 1
const BOTTOM = 196; // p = 0
const x = (z: number) => LEFT + ((z + 8) / 16) * (RIGHT - LEFT);
const y = (p: number) => BOTTOM - p * (BOTTOM - TOP);

/** The S-curve itself: p = 1 / (1 + e^-z), in 64 short steps. */
const CURVE = Array.from({ length: 65 }, (_, i) => {
  const z = -8 + i * 0.25;
  return `${i === 0 ? "M" : "L"}${x(z).toFixed(1)} ${y(1 / (1 + Math.exp(-z))).toFixed(1)}`;
}).join(" ");

/** Line drawing for the Method page header: the sigmoid draws itself in, then a score runs along it. */
export function SigmoidFigure({ caption }: { caption: string }) {
  const settled = useSettled(3300); // the draw-in has finished
  return (
    <figure className="text-muted">
      <svg
        viewBox="0 0 352 248"
        role="img"
        aria-label="The sigmoid S-curve: a very negative score gives a probability near 0, a score of 0 gives 0.5, and a very positive score gives a probability near 1"
        // where the background pulse starts (HeroGrid): the point where the curve crosses 50%
        data-pulse-origin={`${(x(0) / 352).toFixed(2)} ${(y(0.5) / 248).toFixed(2)}`}
        className={`w-full max-w-[22rem] ${settled ? "" : "draw-in"}`}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* axes with their tick marks, then the curve */}
        <path
          pathLength={1}
          d={`M${LEFT} 28 V${BOTTOM} H336 M48 ${TOP} H${LEFT} M48 ${y(0.5)} H${LEFT} M${LEFT} ${BOTTOM} V200 M${x(0)} ${BOTTOM} V200 M${RIGHT} ${BOTTOM} V200`}
          strokeWidth={1.25}
        />
        <path pathLength={1} d={CURVE} strokeWidth={2.5} className="text-brand" />
        {/* the 50% cut-off, and the score 0 that lands exactly on it (lines, not paths, so they
            stay dashed instead of drawing in) */}
        <g strokeWidth={0.75} strokeDasharray="3 4">
          <line x1={LEFT} y1={y(0.5)} x2={RIGHT} y2={y(0.5)} />
          <line x1={x(0)} y1={y(0.5)} x2={x(0)} y2={BOTTOM} />
        </g>
        <g stroke="none" fill="currentColor" fontFamily="var(--font-plex-mono)" fontSize={11} letterSpacing={0.6}>
          <text x={LEFT} y={18} textAnchor="middle">P(CKD)</text>
          <text x={44} y={TOP + 4} textAnchor="end">1</text>
          <text x={44} y={y(0.5) + 4} textAnchor="end">0.5</text>
          <text x={44} y={BOTTOM + 4} textAnchor="end">0</text>
          <text x={LEFT} y={214} textAnchor="middle">−8</text>
          <text x={x(0)} y={214} textAnchor="middle">0</text>
          <text x={RIGHT} y={214} textAnchor="middle">+8</text>
          <text x={x(0)} y={238} textAnchor="middle">SCORE z</text>
          <text x={LEFT + 8} y={y(0.5) - 7}>50% CUT-OFF</text>
          <text x={RIGHT} y={58} textAnchor="end" className="text-brand">LIKELY CKD</text>
          <text x={LEFT + 8} y={182}>NOT CKD</text>
        </g>
        {/* once drawn: a patient's score slides along the curve */}
        <g className={settled ? "motion-reduce:hidden" : "flow"} stroke="none">
          <Flow path={CURVE} seconds={4} className="text-brand" />
        </g>
      </svg>
      <figcaption className="mt-3 max-w-[22rem] border-t border-border pt-2 text-sm">{caption}</figcaption>
    </figure>
  );
}
