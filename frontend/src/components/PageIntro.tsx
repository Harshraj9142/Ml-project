import type { ReactNode } from "react";
import { KidneyFigure } from "@/components/Kidney";

type Props = {
  eyebrow: string;
  title: string;
  facts: { value: string; label: string }[]; // key numbers about the data, shown under the text
  figure: string; // caption for the kidney drawing beside the title on wide screens
  children: ReactNode; // the description
};

/** The title block at the top of each page. */
export default function PageIntro({ eyebrow, title, facts, figure, children }: Props) {
  return (
    <header className="mb-12 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <p className="flex items-center gap-3 font-mono text-xs tracking-[0.16em] text-brand uppercase">
          <span aria-hidden className="h-px w-8 bg-brand" />
          {eyebrow}
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-[3.25rem]">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{children}</p>
        <dl className="mt-8 grid max-w-xl grid-cols-3 divide-x divide-border-strong border-y border-border-strong">
          {facts.map((fact) => (
            // column-reverse: the value shows above its label; justify-end keeps values lined up at the top
            <div key={fact.label} className="flex flex-col-reverse justify-end px-4 py-3 first:pl-0">
              <dt className="mt-0.5 font-mono text-[0.6875rem] tracking-[0.12em] text-muted uppercase">
                {fact.label}
              </dt>
              <dd className="font-mono text-xl font-medium sm:text-2xl">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="hidden lg:block">
        <KidneyFigure caption={figure} />
      </div>
    </header>
  );
}
