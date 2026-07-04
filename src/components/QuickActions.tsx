"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function QuickActions({
  activeBlockId,
  nextBlockId,
}: {
  activeBlockId: number | null;
  nextBlockId: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const log = async (type: string, value = 1, msg?: string) => {
    setBusy(type);
    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, value }),
    });
    setBusy(null);
    flash(msg || "Logged.");
    router.refresh();
  };

  const patchBlock = async (id: number, status: string, msg: string) => {
    setBusy(status);
    await fetch(`/api/blocks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    flash(msg);
    router.refresh();
  };

  const actions: { label: string; icon: string; onClick?: () => void; href?: string; disabled?: boolean; danger?: boolean }[] = [
    {
      label: "Start Block",
      icon: "▶",
      onClick: () => nextBlockId && patchBlock(nextBlockId, "active", "Block started. No negotiation."),
      disabled: !nextBlockId || !!activeBlockId,
    },
    {
      label: "Complete Block",
      icon: "✓",
      onClick: () => activeBlockId && patchBlock(activeBlockId, "completed", "Block logged. Next rep."),
      disabled: !activeBlockId,
    },
    { label: "Log Cigarette", icon: "🚬", onClick: () => log("smoke", 1, "Cigarette logged.") },
    { label: "Log Walk", icon: "🚶", onClick: () => log("walk", 1, "Walk logged.") },
    { label: "Log Workout", icon: "💪", onClick: () => log("workout", 1, "Workout logged.") },
    { label: "Log Meditation", icon: "🧠", onClick: () => log("meditation", 1, "Meditation logged.") },
    { label: "Add Task", icon: "＋", href: "/inbox" },
    { label: "Journal", icon: "✎", href: "/journal" },
    { label: "End Day", icon: "◑", href: "/end-day" },
    { label: "I'm Derailing", icon: "⚠", href: "/derail", danger: true },
  ];

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {actions.map((a) =>
          a.href ? (
            <Link
              key={a.label}
              href={a.href}
              className={`btn ${a.danger ? "btn-danger" : "btn-ghost"} !py-3 flex-col gap-1 text-[12px]`}
            >
              <span className="text-base leading-none">{a.icon}</span>
              {a.label}
            </Link>
          ) : (
            <button
              key={a.label}
              onClick={a.onClick}
              disabled={a.disabled || busy !== null}
              className="btn btn-ghost !py-3 flex-col gap-1 text-[12px]"
            >
              <span className="text-base leading-none">{a.icon}</span>
              {a.label}
            </button>
          )
        )}
      </div>
      {toast && (
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-full border border-cyan-400/30 bg-[#0a1420] px-4 py-1.5 text-xs font-semibold text-cyan-200 shadow-lg fade-up">
          {toast}
        </div>
      )}
    </div>
  );
}
