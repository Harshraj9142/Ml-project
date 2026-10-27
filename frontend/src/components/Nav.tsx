"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { href: "/", number: "01", label: "Diagnosis" },
  { href: "/future", number: "02", label: "Future risk" },
];

/** Tabs along the bottom edge of the header; the underline slides over when you switch part. */
export default function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Pages" className="-mb-px flex gap-7 text-sm">
      {PAGES.map((page) => {
        const active = pathname === page.href;
        return (
          <Link
            key={page.href}
            href={page.href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-baseline gap-2 pt-1 pb-3.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            <span className="font-mono text-xs text-brand">
              <span className="sr-only">Part </span>
              {page.number}
            </span>
            {page.label}
            <span
              aria-hidden
              className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-foreground transition-transform duration-300 ease-out ${
                active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 group-hover:bg-border-strong"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
