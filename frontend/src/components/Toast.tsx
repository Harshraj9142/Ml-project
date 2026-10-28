import { useState, type AnimationEvent } from "react";
import { AlertIcon, CheckIcon, Icon } from "@/components/Icons";

export type Notice = {
  id: number; // a new id shows a fresh slip, even for the same answer twice in a row
  tone: "high" | "low" | "error";
  title: string; // e.g. "Likely CKD", or "Prediction failed"
  value?: string; // e.g. ">99%"
  detail: string;
};

/**
 * A slip that slides up into the corner when a prediction finishes, like a report coming off
 * the printer. Its bottom line runs down over a few seconds (paused while the pointer is over
 * it or it has keyboard focus), then it leaves by itself; the x closes it straight away.
 * Screen readers already hear the result from the Interpretation panel, so this slip is a
 * visual cue only and is not a second live region.
 */
export default function Toast({ notice, onDone }: { notice: Notice; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [time] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const high = notice.tone !== "low";

  function handleAnimationEnd(event: AnimationEvent) {
    if (event.animationName === "drain") setLeaving(true);
    if (event.animationName === "toast-out") onDone();
  }

  return (
    <div
      onAnimationEnd={handleAnimationEnd}
      className={`group fixed inset-x-4 bottom-20 z-50 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[22rem] ${
        leaving ? "toast-out" : "toast-in"
      }`}
    >
      <div
        className={`overflow-hidden rounded-md border border-t-[3px] border-border-strong bg-surface shadow-[0_18px_40px_-16px_rgb(40_25_10/0.4)] ${
          high ? "border-t-risk-high" : "border-t-risk-low"
        }`}
      >
        <div className="flex items-center justify-between gap-3 pt-2 pr-2 pl-4 font-mono text-[0.6875rem] tracking-[0.14em] text-muted uppercase">
          <span>{notice.tone === "error" ? "Not printed" : "Report ready"}</span>
          <span className="flex items-center gap-1">
            <time>{time}</time>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setLeaving(true)}
              className="inline-flex size-7 items-center justify-center rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 px-4">
          <p className={`flex items-center gap-1.5 font-serif text-lg font-semibold ${high ? "text-risk-high" : "text-risk-low"}`}>
            {high ? <AlertIcon className="size-4 self-center" /> : <CheckIcon className="size-4 self-center" />}
            {notice.title}
          </p>
          {notice.value && <p className="font-mono text-xl font-semibold tabular-nums">{notice.value}</p>}
        </div>
        <p className="px-4 pt-0.5 pb-3 text-xs text-muted">{notice.detail}</p>
        <div
          aria-hidden
          className={`toast-drain h-0.5 origin-left group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] ${
            high ? "bg-risk-high" : "bg-risk-low"
          }`}
        />
      </div>
    </div>
  );
}
