"use client";

import { useEffect, useState } from "react";

// A kidney seen from the front, drawn with its hilum (the notch where vessels and ureter
// join) on the right. All shapes share one 200 x 240 coordinate box.
const OUTLINE =
  "M108 22 C60 18 30 60 32 118 C34 178 66 222 112 218 C148 214 166 188 158 162 C152 144 136 138 136 120 C136 102 152 96 158 78 C166 50 146 24 108 22 Z";

/** Filled kidney for the logo. */
export function KidneyMark({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="20 10 160 220" className={className}>
      <path d={OUTLINE} fill="currentColor" />
      <path
        d="M134 120 C118 112 104 100 96 86 M134 120 C112 120 96 120 82 120 M134 120 C118 128 104 140 96 154"
        fill="none"
        stroke="var(--surface)"
        strokeWidth={9}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Line drawing for the page header: the kidney draws itself in, with a few labelled parts. */
export function KidneyFigure({ caption }: { caption: string }) {
  // Once the draw-in has finished, drop the animation classes so the finished drawing stays put
  // (otherwise a window resize or a full-page screenshot can restart it half-drawn).
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 3300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <figure className="text-muted">
      <svg
        viewBox="-62 6 352 244"
        role="img"
        aria-label="Line drawing of a kidney, with its cortex, renal artery and vein, and ureter labelled"
        // where the background pulse starts (HeroGrid): the middle of the kidney, as a fraction of the drawing
        data-pulse-origin="0.45 0.47"
        className={`w-full max-w-[22rem] ${settled ? "" : "draw-in"}`}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* outer edge, cortex boundary, calyces, ureter, artery + vein, label leader lines */}
        <path pathLength={1} d={OUTLINE} strokeWidth={2.5} className="text-brand" />
        <path pathLength={1} d="M106 40 C70 38 49 72 50 118 C51 164 74 200 110 200 C134 200 146 184 142 168" strokeWidth={1.25} />
        <path
          pathLength={1}
          d="M136 120 C118 112 104 98 94 80 M136 120 C114 120 96 120 78 120 M136 120 C118 128 104 142 94 160"
          strokeWidth={1.5}
        />
        <path pathLength={1} d="M138 122 C164 126 180 160 178 238" strokeWidth={2} />
        <path pathLength={1} d="M140 108 C158 104 174 104 196 106 M140 115 C160 115 176 117 196 119" strokeWidth={2} />
        <path pathLength={1} d="M-8 152 L42 150 M184 202 L202 202 M186 108 L200 92" strokeWidth={0.75} />
        <g stroke="none" fill="currentColor" fontFamily="var(--font-plex-mono)" fontSize={11} letterSpacing={0.6}>
          <text x={-60} y={156}>CORTEX</text>
          <text x={203} y={88}>RENAL ARTERY</text>
          <text x={203} y={101}>&amp; VEIN</text>
          <text x={206} y={206}>URETER</text>
        </g>
        {/* once drawn: blood flows in along one vessel and out along the other, urine down the ureter */}
        <g className={settled ? "motion-reduce:hidden" : "flow"} stroke="none">
          <Flow path="M196 119 C176 117 160 115 140 115" seconds={2.2} className="text-brand" />
          <Flow path="M140 108 C158 104 174 104 196 106" seconds={2.2} className="text-brand" />
          <Flow path="M138 122 C164 126 180 160 178 238" seconds={3.2} r={2} />
        </g>
      </svg>
      <figcaption className="mt-3 max-w-[22rem] border-t border-border pt-2 text-sm">{caption}</figcaption>
    </figure>
  );
}

/** Two dots travelling along `path` forever, half a lap apart, fading in and out at the ends. */
function Flow({ path, seconds, className, r = 2.4 }: { path: string; seconds: number; className?: string; r?: number }) {
  return (
    <g className={className} fill="currentColor">
      {[0, 0.5].map((offset) => {
        const begin = `${-offset * seconds}s`; // negative: start part-way through, so there is no wait
        return (
          <circle key={offset} r={r} opacity={0}>
            <animateMotion path={path} dur={`${seconds}s`} begin={begin} repeatCount="indefinite" />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.15;0.85;1"
              dur={`${seconds}s`}
              begin={begin}
              repeatCount="indefinite"
            />
          </circle>
        );
      })}
    </g>
  );
}
