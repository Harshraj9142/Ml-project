import { ViewTransition, type ReactNode } from "react";

// Switching part with the header tabs: the old page slides out and the new one slides in from
// the side of its tab (the Nav links tag each switch "nav-forward" or "nav-back"; the
// animations are in globals.css). Anything else - the first load, the browser's back button -
// swaps the page without a slide.
const SLIDE = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

/** Wraps a page's content so it slides when you switch part. */
export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={SLIDE} exit={SLIDE} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
