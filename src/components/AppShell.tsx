"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Command Center", short: "Home", icon: "◉" },
  { href: "/planner", label: "Daily Planner", short: "Today", icon: "▤" },
  { href: "/inbox", label: "Task Inbox", short: "Inbox", icon: "⌁" },
  { href: "/sprint-builder", label: "Sprint Builder", short: "Build", icon: "⟁" },
  { href: "/jobs", label: "Jobs", short: "Jobs", icon: "◈" },
  { href: "/habits", label: "Habits & Body", short: "Body", icon: "♦" },
  { href: "/journal", label: "Journal", short: "Journal", icon: "✎" },
  { href: "/review", label: "CEO Review", short: "Review", icon: "▣" },
  { href: "/sprint", label: "60-Day Sprint", short: "Sprint", icon: "◎" },
  { href: "/knowledge", label: "Knowledge Base", short: "KB", icon: "✦" },
  { href: "/settings", label: "Settings", short: "Set", icon: "⚙" },
];

const MOBILE_NAV = NAV.filter((n) =>
  ["/", "/planner", "/inbox", "/jobs", "/habits"].includes(n.href)
);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDerail = pathname === "/derail";

  if (isDerail) return <>{children}</>;

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-edge bg-raised/60 backdrop-blur-xl sticky top-0 h-dvh">
        <div className="px-5 pt-6 pb-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 text-base font-black text-[#04141a] shadow-[0_4px_20px_rgba(34,211,238,0.35)]">
              A
            </span>
            <div>
              <div className="text-[15px] font-bold tracking-tight">Alex OS</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-faint">
                Execution System
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  active
                    ? "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20"
                    : "text-mute hover:bg-white/5 hover:text-ink border border-transparent"
                }`}
              >
                <span className="w-4 text-center text-xs opacity-80">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <Link
            href="/derail"
            className="btn btn-danger w-full text-[13px]"
          >
            ⚠ I&apos;m Derailing
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-edge bg-raised/85 backdrop-blur-xl lg:hidden pb-[env(safe-area-inset-bottom)]">
        {MOBILE_NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${
                active ? "text-cyan-300" : "text-mute"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.short}
            </Link>
          );
        })}
        <Link
          href="/derail"
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-rose-400"
        >
          <span className="text-base leading-none">⚠</span>
          Derail
        </Link>
      </nav>
    </div>
  );
}
