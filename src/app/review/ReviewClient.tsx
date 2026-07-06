"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, PageHeader, StatTile } from "@/components/ui";
import type { WeeklyTargets } from "@/lib/types";

export interface WeeklyReview {
  week_start: string;
  stats: {
    job_applications: number;
    tailored_applications: number;
    follow_ups: number;
    client_hours: number;
    project_hours: number;
    workouts: number;
    walks: number;
    meditations: number;
    journal_entries: number;
    blocks_completed: number;
    avg_score: number;
    smoking_avg: number | null;
    gold_days: number;
    silver_days: number;
    bronze_days: number;
    below_days: number;
  };
  best_day: string;
  worst_day: string;
  derail_trigger: string;
  double_down: string;
  kill: string;
  next_week: string;
}

export function ReviewClient({
  weekStart, weekLabel, prevWeek, nextWeek, isCurrentWeek, review, targets, scores, pastReviews,
}: {
  weekStart: string;
  weekLabel: string;
  prevWeek: string;
  nextWeek: string;
  isCurrentWeek: boolean;
  review: WeeklyReview;
  targets: Partial<WeeklyTargets>;
  scores: { date: string; score: number; level: string; label: string }[];
  pastReviews: { week: string; stats: Record<string, number> }[];
}) {
  const router = useRouter();
  const [edit, setEdit] = useState({
    double_down: review.double_down,
    kill: review.kill,
    next_week: review.next_week,
  });
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await fetch("/api/weekly-review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start: weekStart, ...edit }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  };

  const s = review.stats;
  const t = targets;

  const rows: { label: string; actual: string | number; target?: string | number; pct?: number }[] = [
    { label: "Job applications", actual: s.job_applications, target: t.job_applications, pct: pc(s.job_applications, t.job_applications) },
    { label: "Tailored applications", actual: s.tailored_applications, target: t.tailored_applications, pct: pc(s.tailored_applications, t.tailored_applications) },
    { label: "Follow-ups", actual: s.follow_ups, target: t.follow_ups, pct: pc(s.follow_ups, t.follow_ups) },
    { label: "Client hours", actual: s.client_hours, target: t.client_hours, pct: pc(s.client_hours, t.client_hours) },
    { label: "Project hours", actual: s.project_hours, target: t.project_hours, pct: pc(s.project_hours, t.project_hours) },
    { label: "Work blocks completed", actual: s.blocks_completed },
    { label: "Workouts", actual: s.workouts, target: t.workouts, pct: pc(s.workouts, t.workouts) },
    { label: "Walks", actual: s.walks, target: t.walks, pct: pc(s.walks, t.walks) },
    { label: "Meditations", actual: s.meditations, target: t.meditations, pct: pc(s.meditations, t.meditations) },
    { label: "Journal entries", actual: s.journal_entries, target: t.journal_entries, pct: pc(s.journal_entries, t.journal_entries) },
    { label: "Smoking avg / day", actual: s.smoking_avg ?? "—", target: t.smoking_limit ? `≤ ${t.smoking_limit}` : undefined },
  ];

  const maxScore = 100;

  return (
    <div>
      <PageHeader
        title="Weekly CEO Review"
        subtitle={`Board report for the week of ${weekLabel}${isCurrentWeek ? " — in progress" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/review?week=${prevWeek}`} className="btn btn-ghost !px-3">←</Link>
            {!isCurrentWeek && <Link href="/review" className="btn btn-ghost text-[12px]">This week</Link>}
            <Link href={`/review?week=${nextWeek}`} className="btn btn-ghost !px-3">→</Link>
          </div>
        }
      />

      {/* Top stats */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        <StatTile label="Avg score" value={s.avg_score} color={s.avg_score >= 70 ? "#34d399" : s.avg_score >= 50 ? "#fbbf24" : "#f43f5e"} />
        <StatTile label="Gold days" value={s.gold_days} color="#f5c451" />
        <StatTile label="Silver days" value={s.silver_days} color="#c0c8d8" />
        <StatTile label="Bronze days" value={s.bronze_days} color="#cd9a62" />
        <StatTile label="Collapsed" value={s.below_days} color={s.below_days > 0 ? "#f43f5e" : undefined} />
        <StatTile label="Blocks done" value={s.blocks_completed} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Numbers vs targets */}
        <Card className="lg:col-span-3">
          <div className="section-title mb-3">The numbers — actual vs target</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wider text-faint">
                  <th className="pb-2 font-semibold">Metric</th>
                  <th className="pb-2 text-right font-semibold">Actual</th>
                  <th className="pb-2 text-right font-semibold">Target</th>
                  <th className="pb-2 pl-4 font-semibold w-28">Pace</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-t border-white/5">
                    <td className="py-2 text-mute">{r.label}</td>
                    <td className="py-2 text-right font-mono font-bold">{r.actual}</td>
                    <td className="py-2 text-right font-mono text-faint">{r.target ?? "—"}</td>
                    <td className="py-2 pl-4">
                      {r.pct !== undefined && (
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(r.pct, 100)}%`,
                              background: r.pct >= 100 ? "#34d399" : r.pct >= 60 ? "#22d3ee" : "#f43f5e",
                            }}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Day scores + best/worst */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="section-title mb-3">Day scores</div>
            <div className="flex h-28 items-end gap-1.5">
              {scores.length === 0 && <p className="text-sm text-mute">No scored days yet this week.</p>}
              {scores.map((d) => (
                <div key={d.date} className="group relative flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${(d.score / maxScore) * 96}px`,
                      background:
                        d.level === "gold" ? "#f5c451" : d.level === "silver" ? "#c0c8d8" : d.level === "bronze" ? "#cd9a62" : "#475569",
                      minHeight: 4,
                    }}
                  />
                  <span className="font-mono text-[9px] text-faint">{d.label.split(",")[0]}</span>
                  <div className="pointer-events-none absolute -top-6 hidden rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] group-hover:block">
                    {d.score}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="section-title mb-1">Best day</div>
                <div className="text-sm font-bold">{review.best_day || "—"}</div>
              </div>
              <div>
                <div className="section-title mb-1">Worst day</div>
                <div className="text-sm font-bold">{review.worst_day || "—"}</div>
              </div>
            </div>
            <div className="mt-3 border-t border-white/5 pt-3">
              <div className="section-title mb-1">Main derail trigger</div>
              <div className="text-[13px] text-mute">{review.derail_trigger || "No derails logged. Either discipline or denial."}</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Verdicts */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card>
          <div className="section-title mb-2 text-emerald-300">Double down on</div>
          <textarea className="field min-h-[80px]" value={edit.double_down} onChange={(e) => setEdit({ ...edit, double_down: e.target.value })} />
        </Card>
        <Card>
          <div className="section-title mb-2 text-rose-300">Kill</div>
          <textarea className="field min-h-[80px]" value={edit.kill} onChange={(e) => setEdit({ ...edit, kill: e.target.value })} />
        </Card>
        <Card>
          <div className="section-title mb-2 text-cyan-300">Next week</div>
          <textarea className="field min-h-[80px]" value={edit.next_week} onChange={(e) => setEdit({ ...edit, next_week: e.target.value })} />
        </Card>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} className="btn btn-primary">Save verdicts</button>
        <Link href="/sprint-builder" className="btn btn-ghost">Plan next week →</Link>
        {saved && <span className="text-[12.5px] font-semibold text-emerald-300 fade-up">Saved.</span>}
      </div>

      {/* Past weeks */}
      {pastReviews.length > 0 && (
        <div className="mt-8">
          <div className="section-title mb-3">Previous weeks</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pastReviews.map((p) => (
              <Link key={p.week} href={`/review?week=${p.week}`} className="glass glass-hover block p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-faint">week of {p.week}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-xl font-bold">{p.stats.avg_score ?? "—"}</span>
                  <span className="text-[11px] text-mute">avg score</span>
                </div>
                <div className="mt-0.5 text-[11px] text-mute">
                  {p.stats.jobs_applied ?? p.stats.job_applications ?? 0} apps · {p.stats.client_hours ?? 0}h client
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function pc(actual: number, target?: number): number | undefined {
  if (!target) return undefined;
  return Math.round((actual / target) * 100);
}
