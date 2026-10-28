import type { ComponentType, ReactNode } from "react";
import CountUp from "@/components/CountUp";
import { KidneyFigure } from "@/components/Kidney";

type Props = {
  eyebrow: string;
  title: string;
  facts: { value: string; label: string }[]; // key numbers about the data, shown under the text
  figure: string; // caption for the drawing beside the title on wide screens
  Drawing?: ComponentType<{ caption: string }>; // that drawing: the kidney unless a page picks another
  children: ReactNode; // the description
};

/** The title block at the top of each page; its parts rise in one after another. */
export default function PageIntro({ eyebrow, title, facts, figure, Drawing = KidneyFigure, children }: Props) {
  return (
    <header className="mb-12 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <p className="rise flex items-center gap-3 font-mono text-xs tracking-[0.16em] text-brand uppercase">
          <span aria-hidden className="h-px w-8 bg-brand" />
          {eyebrow}
        </p>
        <h1
          className="rise mt-4 font-serif text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-[3.25rem]"
          style={{ animationDelay: "80ms" }}
        >
          {title}
        </h1>
        <p className="rise mt-5 max-w-2xl text-lg leading-relaxed text-muted" style={{ animationDelay: "160ms" }}>
          {children}
        </p>
        <dl
          className="rise mt-8 grid max-w-xl grid-cols-3 divide-x divide-border-strong border-y border-border-strong"
          style={{ animationDelay: "240ms" }}
        >
          {facts.map((fact) => (
            // column-reverse: the value shows above its label; justify-end keeps values lined up at the top
            <div key={fact.label} className="flex flex-col-reverse justify-end px-4 py-3 first:pl-0">
              <dt className="mt-0.5 font-mono text-[0.6875rem] tracking-[0.12em] text-muted uppercase">
                {fact.label}
              </dt>
              <dd className="font-mono text-xl font-medium tabular-nums sm:text-2xl">
                <CountUp value={fact.value} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rise hidden lg:block" style={{ animationDelay: "120ms" }}>
        <Drawing caption={figure} />
      </div>
    </header>
  );
}
