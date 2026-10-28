"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

const PAGES = [
  { href: "/", number: "01", label: "Diagnosis" },
  { href: "/future", number: "02", label: "Future risk" },
];

/**
 * Tabs along the bottom edge of the header. The current part is underlined with a red pen
 * stroke that slides over and draws itself again when you switch part (adapted from the
 * "Sketch Tabs" component on 21st.dev). Each link also tells the page which way to slide:
 * towards Part 02 is "nav-forward", back towards Part 01 is "nav-back" (see PageTransition).
 */
export default function Nav() {
  const pathname = usePathname();
  const current = PAGES.findIndex((page) => page.href === pathname);
  const navRef = useRef<HTMLElement>(null);
  const [underline, setUnderline] = useState<{ left: number; width: number } | null>(null);

  // measure the current tab - again whenever the tabs change size (fonts loading, resizing)
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      setUnderline(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <nav ref={navRef} aria-label="Pages" className="relative -mb-px flex gap-7 text-sm">
      {PAGES.map((page, i) => {
        const active = i === current;
        return (
          <Link
            key={page.href}
            href={page.href}
            aria-current={active ? "page" : undefined}
            transitionTypes={current < 0 || active ? undefined : [i > current ? "nav-forward" : "nav-back"]}
            className={`group relative flex items-baseline gap-2 pt-1 pb-3.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            <span className="font-mono text-xs text-brand">
              <span className="sr-only">Part </span>
              {page.number}
            </span>
            {page.label}
            {/* hovering the other tab: a faint pencil line */}
            {!active && (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-border-strong transition-transform duration-300 ease-out group-hover:scale-x-100"
              />
            )}
          </Link>
        );
      })}
      {underline && <PenUnderline {...underline} seed={current + 1} />}
    </nav>
  );
}

const OVERSHOOT = 4; // a pen stroke runs a little past the word at each end

/** The red pen stroke: it slides to the current tab while it draws itself in again. */
function PenUnderline({ left, width, seed }: { left: number; width: number; seed: number }) {
  const length = width + 2 * OVERSHOOT;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -bottom-1 h-2.5 transition-[left,width] duration-300 ease-out"
      style={{ left: left - OVERSHOOT, width: length }}
    >
      {/* key: a new tab gets a fresh stroke, so the draw-in plays again */}
      <svg
        key={seed}
        viewBox={`0 0 ${length} 10`}
        preserveAspectRatio="none"
        className="pen absolute inset-0 size-full overflow-visible text-brand"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
      >
        {penStrokes(length, seed).map((d, i) => (
          <path key={i} d={d} pathLength={1} strokeWidth={i === 0 ? 2.25 : 1.25} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </span>
  );
}

/**
 * Two passes of a hand-drawn line `length` px long, like a pen going over it twice: each one
 * slightly bowed and wobbly. The same `seed` always gives the same stroke, so every tab keeps
 * its own shape.
 */
function penStrokes(length: number, seed: number): string[] {
  let state = seed * 7919;
  const wobble = (size: number) => {
    state = (state * 9301 + 49297) % 233280;
    return ((state / 233280) * 2 - 1) * size;
  };
  const y = (bend = 0) => (5 + bend + wobble(1)).toFixed(1);
  return [0, 1].map(() => {
    const bow = wobble(1.6);
    return `M${wobble(2).toFixed(1)} ${y()} C${(length * 0.3).toFixed(1)} ${y(bow)} ${(length * 0.7).toFixed(1)} ${y(bow)} ${(length + wobble(2)).toFixed(1)} ${y()}`;
  });
}
