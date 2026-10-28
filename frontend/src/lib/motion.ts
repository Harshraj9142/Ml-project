import { useEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A number that counts up from 0 to `target` (ease-out). Jumps straight there for reduced motion. */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const ms = prefersReducedMotion() ? 0 : duration;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      // (clamped at 0: a frame's timestamp can be a moment earlier than `start`)
      const t = ms === 0 ? 1 : Math.min(1, Math.max(0, (now - start) / ms));
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

/** Resolves after `ms` milliseconds - or at once for reduced motion. */
export function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, prefersReducedMotion() ? 0 : ms));
}
