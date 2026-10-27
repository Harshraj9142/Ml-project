"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  { href: "/", label: "Part 1 · Diagnose CKD" },
  { href: "/future", label: "Part 2 · Future risk" },
];

/** Tabs at the top of every page to switch between Part 1 and Part 2. */
export default function Nav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Pages"
      className="mb-8 flex w-fit flex-wrap gap-1 rounded-xl border border-border bg-surface p-1 text-sm"
    >
      {PAGES.map((page) => {
        const active = pathname === page.href;
        return (
          <Link
            key={page.href}
            href={page.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active ? "bg-accent text-on-accent" : "text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {page.label}
          </Link>
        );
      })}
    </nav>
  );
}
