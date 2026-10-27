"use client";

import { useCountUp } from "@/lib/motion";

/** Shows a value like "400" or "9 yrs", with its leading number counting up on load. */
export default function CountUp({ value, duration = 1200 }: { value: string; duration?: number }) {
  const match = value.match(/^(\d+)(.*)$/);
  const current = useCountUp(match ? Number(match[1]) : 0, duration);
  if (!match) return <>{value}</>;
  return (
    <>
      <span aria-hidden>
        {Math.round(current)}
        {match[2]}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
