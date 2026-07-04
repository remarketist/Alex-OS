"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, PageHeader, ScoreRing, LevelBadge } from "@/components/ui";
import type { JournalEntry, ScoreBreakdown } from "@/lib/types";

type Stats = {
  jobs: number;
  clientMinutes: number;
  projectMinutes: number;
  walk: boolean;
  workout: boolean;
  meditation: boolean;
  smokeCount: number | null;
  smokeTarget: number;
  blocksCompleted: number;
  blocksTotal: number;
  mood: number | null;
  energy: number | null;
};

type Summary = {
  score: { score: number; level: string; breakdown: ScoreBreakdown };
  adaptation: { adjustments: string[]; hardTruth: string; mvw: string };
};

export function EndDayClient({
  today, entry, stats,
}: {
  today: string;
  entry: JournalEntry | null;
  stats: Stats;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    moved: entry?.moved || "",
    avoided: entry?.avoided || "",
    trigger: entry?.trigger || "",
    tomorrow_first_block: entry?.tomorrow_first_block || "",
    one_truth: entry?.one_truth || "",
  });
  const [smoke, setSmoke] = useState(stats.smokeCount ?? 0);
  const [mood, setMood] = useState(stats.mood ?? 6);
  const [energy, setEnergy] = useState(stats.energy ?? 6);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const closeDay = async () => {
    setBusy(true);
    // 1. Save journal
    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, ...form, proud: entry?.proud || "" }),
    });
    // 2. Log final smoke count if it changed and wasn't logged
    if (stats.smokeCount === null && smoke > 0) {
      await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "smoke", value: smoke }),
      });
    }
    if (stats.mood === null) {
      await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "mood", value: mood }),
      });
    }
    if (stats.energy === null) {
      await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "energy", value: energy }),
      });
    }
    // 3. Generate summary + adaptation
    const res = await fetch("/api/end-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today }),
    });
    const j = await res.json();
    setSummary(j);
    setBusy(false);
    router.refresh();
  };

  if (summary) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Day closed" subtitle={today} />
        <Card className="text-center">
          <div className="flex flex-col items-center gap-3 py-4">
            <ScoreRing score={summary.score.score} level={summary.score.level} size={140} />
            <LevelBadge level={summary.score.level} size="lg" />
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-white/5 py-4 sm:grid-cols-6">
            {Object.entries(summary.score.breakdown).map(([k, v]) => (
              <div key={k}>
                <div className="font-mono text-lg font-bold">{v as number}</div>
                <div className="text-[10px] uppercase tracking-wider text-faint">{k}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="mt-4">
          <div className="section-title mb-2">One hard truth</div>
          <p className="text-[15px] font-semibold">{summary.adaptation.hardTruth}</p>
        </Card>
        <Card className="mt-4">
          <div className="section-title mb-2">Tomorrow&apos;s adjustment</div>
          <ul className="space-y-1.5">
            {summary.adaptation.adjustments.map((a, i) => (
              <li key={i} className="text-[13px] text-mute">→ {a}</li>
            ))}
          </ul>
          <p className="mt-3 border-t border-white/5 pt-3 text-[13px] font-semibold text-cyan-300">
            {summary.adaptation.mvw}
          </p>
        </Card>
        <div className="mt-5 flex justify-center">
          <Link href="/" className="btn btn-primary">Back to Command Center</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="End-of-Day Review"
        subtitle="Close the loop. The score doesn't care how the day felt."
      />

      {/* Observable reality */}
      <Card className="mb-4">
        <div className="section-title mb-3">What the system observed</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label="Applications" value={String(stats.jobs)} />
          <Fact label="Client minutes" value={String(stats.clientMinutes)} />
          <Fact label="Project minutes" value={String(stats.projectMinutes)} />
          <Fact label="Blocks done" value={`${stats.blocksCompleted}/${stats.blocksTotal}`} />
          <Fact label="Walk" value={stats.walk ? "✓" : "—"} />
          <Fact label="Workout" value={stats.workout ? "✓" : "—"} />
          <Fact label="Meditation" value={stats.meditation ? "✓" : "—"} />
          <Fact label="Smoking" value={stats.smokeCount === null ? "not logged" : `${stats.smokeCount}/${stats.smokeTarget}`} />
        </div>
      </Card>

      {/* Guided review */}
      <Card>
        <div className="space-y-4">
          <div>
            <label className="label">What got done? What moved?</label>
            <textarea className="field min-h-[56px]" value={form.moved} onChange={(e) => setForm({ ...form, moved: e.target.value })} />
          </div>
          <div>
            <label className="label">What did I avoid?</label>
            <textarea className="field min-h-[56px]" value={form.avoided} onChange={(e) => setForm({ ...form, avoided: e.target.value })} />
          </div>
          <div>
            <label className="label">What triggered drift?</label>
            <input className="field" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stats.smokeCount === null && (
              <div>
                <label className="label">Cigarettes today</label>
                <input type="number" min={0} className="field font-mono" value={smoke} onChange={(e) => setSmoke(Number(e.target.value))} />
              </div>
            )}
            {stats.mood === null && (
              <div>
                <label className="label">Mood /10</label>
                <input type="number" min={1} max={10} className="field font-mono" value={mood} onChange={(e) => setMood(Number(e.target.value))} />
              </div>
            )}
            {stats.energy === null && (
              <div>
                <label className="label">Energy /10</label>
                <input type="number" min={1} max={10} className="field font-mono" value={energy} onChange={(e) => setEnergy(Number(e.target.value))} />
              </div>
            )}
          </div>

          <div>
            <label className="label">Tomorrow&apos;s first block</label>
            <input className="field" placeholder="Job sprint 08:30 — 5 applications" value={form.tomorrow_first_block} onChange={(e) => setForm({ ...form, tomorrow_first_block: e.target.value })} />
          </div>
          <div>
            <label className="label">One sentence truth</label>
            <input className="field" value={form.one_truth} onChange={(e) => setForm({ ...form, one_truth: e.target.value })} />
          </div>
        </div>
        <button onClick={closeDay} disabled={busy} className="btn btn-primary mt-5 w-full">
          {busy ? "Scoring the day…" : "Close the day → score + tomorrow's adjustment"}
        </button>
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-center">
      <div className="font-mono text-base font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-faint">{label}</div>
    </div>
  );
}
