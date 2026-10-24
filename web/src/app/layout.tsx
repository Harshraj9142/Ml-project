import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
          <Nav />
          <main className="flex-1">{children}</main>
          <footer className="mt-12 space-y-1 border-t border-border pt-6 text-sm text-muted">
            <p>
              Student machine-learning project for learning purposes only - not a medical
              diagnosis. Anyone worried about their kidney health should see a doctor.
            </p>
            <p>
              Data: Part 1 - UCI Chronic Kidney Disease dataset (Rubini, Soundarapandian &amp;
              Eswaran, 2015). Part 2 - Al-Shamsi, Regmi &amp; Govender, PLOS ONE 2018.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
