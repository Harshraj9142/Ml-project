"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { href: "/", number: "01", label: "Diagnosis" },
  { href: "/future", number: "02", label: "Future risk" },
];

/** Tabs along the bottom edge of the header to switch between Part 1 and Part 2. */
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
            className={`flex items-baseline gap-2 border-b-2 pt-1 pb-3 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:border-border-strong hover:text-foreground"
            }`}
          >
            <span className="font-mono text-xs text-brand">
              <span className="sr-only">Part </span>
              {page.number}
            </span>
            {page.label}
          </Link>
        );
      })}
    </nav>
  );
}
