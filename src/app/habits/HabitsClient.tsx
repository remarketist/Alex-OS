"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import type { FitnessProfile } from "@/lib/types";

type HistoryDay = {
  date: string;
  smoke: number | null;
  walk: boolean;
  workout: boolean;
  meditation: boolean;
  mood: number | null;
  energy: number | null;
};

export function HabitsClient({
  stats, streaks, fitness, history,
}: {
  today: string;
  stats: { walk: boolean; workout: boolean; meditation: boolean; smokeCount: number | null; smokeTarget: number; mood: number | null; energy: number | null };
  streaks: { walk: number; workout: number; meditation: number; smokeLogged: number; journal: number; jobs: number };
  fitness: FitnessProfile;
  history: HistoryDay[];
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [smokeN, setSmokeN] = useState(1);
  const [mood, setMood] = useState(stats.mood ?? 6);
  const [energy, setEnergy] = useState(stats.energy ?? 6);

  const log = async (type: string, value = 1, extraNote = "") => {
    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, value, note: extraNote }),
    });
    setNote("");
    router.refresh();
  };

  const maxSmoke = Math.max(...history.map((h) => h.smoke ?? 0), stats.smokeTarget, 1);

  const habitButtons = [
    { key: "workout", label: "Workout", icon: "💪", done: stats.workout, streak: streaks.workout },
    { key: "stretch", label: "Stretch", icon: "🧘", done: false, streak: null },
    { key: "walk", label: "Walk", icon: "🚶", done: stats.walk, streak: streaks.walk },
    { key: "meditation", label: "Meditation", icon: "🧠", done: stats.meditation, streak: streaks.meditation },
    { key: "protein", label: "Protein / food", icon: "🍳", done: false, streak: null },
  ];

  return (
    <div>
      <PageHeader
        title="Habits & Body"
        subtitle="Consistency over intensity. The body funds everything else."
      />

      {/* Log habits */}
      <Card className="mb-4">
        <div className="section-title mb-3">Log today</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {habitButtons.map((h) => (
            <button
              key={h.key}
              onClick={() => log(h.key)}
              className={`btn flex-col gap-1 !py-3 text-[12px] ${
                h.done
                  ? "border border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "btn-ghost"
              }`}
            >
              <span className="text-base leading-none">{h.icon}</span>
              {h.label} {h.done && "✓"}
              {h.streak !== null && h.streak > 1 && (
                <span className="text-[10px] text-faint">{h.streak}-day streak</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {/* Smoking */}
          <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.04] p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-bold text-rose-300">🚬 Smoking</span>
              <span className="font-mono text-lg font-bold">
                {stats.smokeCount ?? "—"}<span className="text-[11px] text-faint">/{stats.smokeTarget}</span>
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                className="field !w-16 !py-1.5 font-mono"
                value={smokeN}
                onChange={(e) => setSmokeN(Number(e.target.value))}
              />
              <button onClick={() => log("smoke", smokeN, note)} className="btn btn-ghost !py-1.5 text-[12px]">
                Log
              </button>
            </div>
            <input
              className="field mt-2 !py-1.5 text-[12px]"
              placeholder="Trigger note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="mt-1.5 text-[10.5px] text-faint">No smoking before {fitness.no_smoke_before}</p>
          </div>

          {/* Mood */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-bold">🎯 Mood</span>
              <span className="font-mono text-lg font-bold">{stats.mood ?? "—"}<span className="text-[11px] text-faint">/10</span></span>
            </div>
            <input type="range" min={1} max={10} value={mood} onChange={(e) => setMood(Number(e.target.value))} className="mt-3 w-full accent-cyan-400" />
            <button onClick={() => log("mood", mood)} className="btn btn-ghost mt-2 w-full !py-1.5 text-[12px]">
              Log mood {mood}
            </button>
          </div>

          {/* Energy */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-bold">⚡ Energy</span>
              <span className="font-mono text-lg font-bold">{stats.energy ?? "—"}<span className="text-[11px] text-faint">/10</span></span>
            </div>
            <input type="range" min={1} max={10} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="mt-3 w-full accent-amber-400" />
            <button onClick={() => log("energy", energy)} className="btn btn-ghost mt-2 w-full !py-1.5 text-[12px]">
              Log energy {energy}
            </button>
          </div>
        </div>

        {/* Sleep */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-mute">
          <span className="font-semibold">😴 Sleep quality:</span>
          {[4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => log("sleep", n)}
              className="h-8 w-8 rounded-lg border border-white/10 bg-white/[0.03] font-mono text-[12px] hover:border-cyan-400/40 hover:text-cyan-300"
            >
              {n}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Smoking trend */}
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <div className="section-title">Smoking — 14 days</div>
            <span className="text-[11px] text-faint">target ≤ {stats.smokeTarget}/day</span>
          </div>
          <div className="flex h-32 items-end gap-1">
            {history.map((h) => {
              const v = h.smoke ?? 0;
              const over = v > stats.smokeTarget;
              return (
                <div key={h.date} className="group relative flex-1">
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max((v / maxSmoke) * 100, h.smoke === null ? 2 : 4)}%`,
                      background: h.smoke === null ? "rgba(148,163,184,0.15)" : over ? "#f43f5e" : "#fb7185aa",
                      minHeight: 3,
                    }}
                  />
                  <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] group-hover:block">
                    {h.date.slice(5)}: {h.smoke ?? "not logged"}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="relative -mt-32 h-32 pointer-events-none"
            aria-hidden
          >
            <div
              className="absolute inset-x-0 border-t border-dashed border-white/25"
              style={{ bottom: `${(stats.smokeTarget / maxSmoke) * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[9.5px] text-faint">
            <span>{history[0]?.date.slice(5)}</span>
            <span>today</span>
          </div>
        </Card>

        {/* Habit matrix */}
        <Card>
          <div className="section-title mb-3">Consistency — 14 days</div>
          <div className="space-y-2.5">
            {(
              [
                ["Walk", "walk", "#34d399"],
                ["Workout", "workout", "#22d3ee"],
                ["Meditation", "meditation", "#a78bfa"],
              ] as [string, "walk" | "workout" | "meditation", string][]
            ).map(([label, key, color]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-20 text-[11.5px] font-semibold text-mute">{label}</span>
                <div className="flex flex-1 gap-1">
                  {history.map((h) => (
                    <div
                      key={h.date}
                      title={h.date}
                      className="h-5 flex-1 rounded"
                      style={{
                        background: h[key] ? color : "rgba(148,163,184,0.08)",
                        opacity: h[key] ? 0.9 : 1,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-white/5 pt-3">
            <div className="section-title mb-2">Body profile</div>
            <p className="text-[12px] leading-relaxed text-mute">{fitness.goal}</p>
            <p className="mt-1 text-[11.5px] text-faint">{fitness.preferred_habits}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
