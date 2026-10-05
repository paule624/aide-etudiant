"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/", label: "Simulations" },
  { href: "/aides", label: "Panel des aides" },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-semibold text-ink">
          🎓 Simulateur d&apos;aides étudiantes <span className="text-muted">2026-2027</span>
        </Link>
        <nav className="flex gap-1">
          {LIENS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm ${pathname === l.href ? "bg-accent text-white" : "text-muted hover:bg-bg hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
