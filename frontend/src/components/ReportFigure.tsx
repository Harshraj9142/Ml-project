import Image from "next/image";
import type { ReactNode } from "react";
import finalConfusion from "@/figures/06_confusion_matrix.png";
import weights from "@/figures/08_feature_importance.png";
import robustness from "@/figures/09_robustness_check.png";
import allConfusion from "@/figures/10_course_confusion_matrices.png";
import clustering from "@/figures/11_clustering.png";
import futureComparison from "@/figures/12_future_model_comparison.png";
import scratch from "@/figures/18_logistic_regression_scratch.png";

// The charts the ML scripts drew, copied from reports/figures/ (which is not in git).
const FIGURES = {
  "06_confusion_matrix.png": finalConfusion,
  "08_feature_importance.png": weights,
  "09_robustness_check.png": robustness,
  "10_course_confusion_matrices.png": allConfusion,
  "11_clustering.png": clustering,
  "12_future_model_comparison.png": futureComparison,
  "18_logistic_regression_scratch.png": scratch,
};

type Props = {
  file: keyof typeof FIGURES;
  number: number;
  alt: string; // what the chart shows, for people who can't see it
  children: ReactNode; // the caption: what to look at
};

/**
 * One of the charts from reports/figures/, shown like a printout attached to the report: white
 * paper (the chart's own background) with a numbered caption and the file it came from.
 * Clicking it opens the full-size image.
 */
export default function ReportFigure({ file, number, alt, children }: Props) {
  const image = FIGURES[file];
  return (
    <figure>
      <a
        href={image.src}
        target="_blank"
        rel="noopener"
        // a touch dimmer in dark mode (sheet and chart together), so the white paper doesn't glare
        className="block cursor-zoom-in rounded-sm border border-border bg-white p-2 shadow-sheet transition-shadow hover:shadow-[0_14px_32px_-16px_rgb(60_40_20/0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-3 dark:brightness-[0.92]"
      >
        <Image src={image} alt={alt} placeholder="blur" sizes="(min-width: 72rem) 68rem, 100vw" className="h-auto w-full" />
        <span className="sr-only"> (opens the full-size image in a new tab)</span>
      </a>
      <figcaption className="mt-3 text-sm leading-relaxed text-muted">
        <span className="font-mono text-xs font-semibold text-brand">Fig. {number}</span>
        <span aria-hidden> — </span>
        {children}
        <span className="mt-1 block font-mono text-[0.6875rem] tracking-wide">
          reports/figures/{file}
          {/* the wide charts are small on a phone */}
          <span className="sm:hidden"> · tap the chart to enlarge</span>
        </span>
      </figcaption>
    </figure>
  );
}
