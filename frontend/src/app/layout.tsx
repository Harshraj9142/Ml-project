import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import { KidneyMark } from "@/components/Kidney";
import Nav from "@/components/Nav";
import "./globals.css";

// Lab-report typography: a journal serif for headings, a clinical sans for text,
// and a typewriter-like mono for test values, units and reference ranges.
const serif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const sans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "CKD Risk Predictor", template: "%s · CKD Risk Predictor" },
  description:
    "Estimate chronic kidney disease from routine blood and urine tests, and the risk of developing it later - a student machine-learning project.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div aria-hidden className="backdrop" />
        <header className="border-b border-border-strong bg-surface/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-x-8 px-4 pt-4 sm:px-6">
            <Link
              href="/"
              className="group mb-3 flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <KidneyMark className="h-9 w-auto text-brand transition-transform duration-300 ease-out group-hover:-rotate-12" />
              <span>
                <span className="block font-serif text-xl leading-none font-semibold tracking-tight">
                  CKD Risk Predictor
                </span>
                <span className="mt-1.5 block font-mono text-[0.6875rem] tracking-[0.14em] text-muted uppercase">
                  Renal screening · ML lab project
                </span>
              </span>
            </Link>
            <Nav />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">{children}</main>

        <footer className="border-t border-border-strong bg-surface/85">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
            <p className="text-center font-mono text-xs tracking-[0.3em] text-muted uppercase">
              End of report
            </p>
            <div className="mt-6 grid gap-6 text-sm text-muted md:grid-cols-[3fr_2fr] md:gap-12">
              <p>
                Student machine-learning project for learning purposes only - not a medical
                diagnosis. Anyone worried about their kidney health should see a doctor.
              </p>
              <div className="space-y-1">
                <p className="font-mono text-xs tracking-[0.14em] text-foreground uppercase">Data</p>
                <p>
                  Part 1 - UCI Chronic Kidney Disease dataset (Rubini, Soundarapandian &amp;
                  Eswaran, 2015).
                </p>
                <p>Part 2 - Al-Shamsi, Regmi &amp; Govender, PLOS ONE 2018.</p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
