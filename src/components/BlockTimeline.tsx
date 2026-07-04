"use client";

import { useRouter } from "next/navigation";
import { DOMAIN_COLORS } from "./ui";
import type { WorkBlock } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  upcoming: "text-mute",
  active: "text-cyan-300",
  completed: "text-emerald-300",
  missed: "text-rose-400",
  rescheduled: "text-amber-300",
  shrunk: "text-amber-300",
};

export function BlockTimeline({ blocks, nowMin }: { blocks: WorkBlock[]; nowMin: number }) {
  const router = useRouter();

  const patch = async (id: number, status: string) => {
    await fetch(`/api/blocks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  };

  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  return (
    <ol className="relative space-y-0">
      {blocks.map((b, i) => {
        const color = DOMAIN_COLORS[b.domain] || "#64748b";
        const isActive = b.status === "active";
        const isPast = toMin(b.end_time) < nowMin && b.status === "upcoming";
        return (
          <li key={b.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Rail */}
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${isActive ? "pulse-glow" : ""}`}
                style={{
                  borderColor: color,
                  background: b.status === "completed" ? color : "transparent",
                }}
              />
              {i < blocks.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-white/10" />
              )}
            </div>
            {/* Content */}
            <div
              className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 transition-colors ${
                isActive
                  ? "border-cyan-400/40 bg-cyan-400/[0.06]"
                  : "border-transparent hover:border-white/10 hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[11px] text-faint shrink-0">
                    {b.start_time}–{b.end_time}
                  </span>
                  <span className={`truncate text-sm font-semibold ${b.status === "missed" ? "line-through opacity-60" : ""}`}>
                    {b.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[b.status] || "text-mute"}`}>
                    {isActive ? "● live" : isPast ? "overdue" : b.status}
                  </span>
                  {(b.status === "upcoming" || b.status === "rescheduled") && (
                    <button
                      onClick={() => patch(b.id, "active")}
                      className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-400/20"
                    >
                      Start
                    </button>
                  )}
                  {isActive && (
                    <button
                      onClick={() => patch(b.id, "completed")}
                      className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-400/20"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
              {b.goal && (
                <p className="mt-0.5 truncate text-[12px] text-mute">{b.goal}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
