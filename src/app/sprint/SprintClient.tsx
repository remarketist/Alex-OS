"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, StatTile, ProgressBar } from "@/components/ui";
import type { Sprint } from "@/lib/types";

export function SprintClient({
  sprint, day, total, jobsInSprint, aggregates,
}: {
  sprint: Sprint | null;
  day: number;
  total: number;
  jobsInSprint: number;
  aggregates: { blocks: number; workouts: number; walks: number; clientHours: number; projectHours: number; journals: number; reviews: number };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!sprint);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: sprint?.name || "Stability & Momentum Sprint",
    main_outcome: sprint?.main_outcome || "Reach income and execution stability.",
    king_metric: sprint?.king_metric || "Income-generating actions completed per day",
    secondary_metrics: parseList(sprint?.secondary_metrics).join("\n"),
    constraints: sprint?.constraints || "",
    start_date: sprint?.start_date || new Date().toISOString().slice(0, 10),
    end_date: sprint?.end_date || "",
    wake_time: sprint?.wake_time || "07:30",
    sleep_time: sprint?.sleep_time || "23:30",
    work_capacity_hours: sprint?.work_capacity_hours || 8,
    assistant_tone: sprint?.assistant_tone || "firm-tactical",
    smoking_plan: sprint?.smoking_plan || "",
    body_goals: sprint?.body_goals || "",
    goals: parseList(sprint?.goals).join("\n"),
  });

  const save = async () => {
    const payload = {
      ...form,
      secondary_metrics: JSON.stringify(form.secondary_metrics.split("\n").map((s) => s.trim()).filter(Boolean)),
      goals: JSON.stringify(form.goals.split("\n").map((s) => s.trim()).filter(Boolean)),
    };
    if (sprint) {
      await fetch("/api/sprint", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sprint.id, ...payload }),
      });
    } else {
      await fetch("/api/sprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setEditing(false);
    router.refresh();
  };

  const goals = parseList(sprint?.goals);
  const pct = total > 0 ? Math.round((day / total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Life North Star"
        subtitle="The 60-day sprint everything else serves."
        action={
          <button onClick={() => setEditing(!editing)} className="btn btn-ghost text-[13px]">
            {editing ? "Cancel" : sprint ? "Edit sprint" : "New sprint"}
          </button>
        }
      />

      {sprint && !editing && (
        <>
          {/* Hero */}
          <Card className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold">{sprint.name}</h2>
                <p className="mt-1 text-sm text-mute">{sprint.main_outcome}</p>
                <p className="mt-2 text-[12.5px]">
                  <span className="section-title">King metric:</span>{" "}
                  <span className="font-semibold text-cyan-300">{sprint.king_metric}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono text-3xl font-black">
                  {day}<span className="text-base text-faint">/{total}</span>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-faint">days</div>
              </div>
            </div>
            <div className="mt-4">
              <ProgressBar value={day} max={total} color="#22d3ee" className="!h-2.5" />
              <div className="mt-1 flex justify-between font-mono text-[10.5px] text-faint">
                <span>{sprint.start_date}</span>
                <span>{pct}%</span>
                <span>{sprint.end_date}</span>
              </div>
            </div>
          </Card>

          {/* Sprint aggregates */}
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
            <StatTile label="Applications" value={jobsInSprint} color="#22d3ee" />
            <StatTile label="Blocks done" value={aggregates.blocks} />
            <StatTile label="Client hrs" value={aggregates.clientHours} color="#a78bfa" />
            <StatTile label="Project hrs" value={aggregates.projectHours} color="#fbbf24" />
            <StatTile label="Workouts" value={aggregates.workouts} color="#34d399" />
            <StatTile label="Walks" value={aggregates.walks} color="#34d399" />
            <StatTile label="CEO reviews" value={aggregates.reviews} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <div className="section-title mb-3">60-day goals</div>
              <ul className="space-y-2">
                {goals.map((g, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
                    {g}
                  </li>
                ))}
              </ul>
            </Card>
            <div className="space-y-4">
              <Card>
                <div className="section-title mb-2">Operating parameters</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                  <Param k="Wake" v={sprint.wake_time} />
                  <Param k="Sleep" v={sprint.sleep_time} />
                  <Param k="Capacity" v={`${sprint.work_capacity_hours}h/day`} />
                  <Param k="Tone" v={sprint.assistant_tone} />
                </div>
              </Card>
              <Card>
                <div className="section-title mb-2">Smoking plan</div>
                <p className="text-[12.5px] text-mute">{sprint.smoking_plan || "—"}</p>
                <div className="section-title mb-2 mt-3">Body goals</div>
                <p className="text-[12.5px] text-mute">{sprint.body_goals || "—"}</p>
                {sprint.constraints && (
                  <>
                    <div className="section-title mb-2 mt-3">Constraints</div>
                    <p className="text-[12.5px] text-mute">{sprint.constraints}</p>
                  </>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      {editing && (
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Sprint name</label>
              <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Main outcome</label>
              <input className="field" value={form.main_outcome} onChange={(e) => setForm({ ...form, main_outcome: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">King metric</label>
              <input className="field" value={form.king_metric} onChange={(e) => setForm({ ...form, king_metric: e.target.value })} />
            </div>
            <div>
              <label className="label">Start date</label>
              <input type="date" className="field" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="label">End date</label>
              <input type="date" className="field" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Wake time</label>
              <input type="time" className="field" value={form.wake_time} onChange={(e) => setForm({ ...form, wake_time: e.target.value })} />
            </div>
            <div>
              <label className="label">Sleep time</label>
              <input type="time" className="field" value={form.sleep_time} onChange={(e) => setForm({ ...form, sleep_time: e.target.value })} />
            </div>
            <div>
              <label className="label">Work capacity (h/day)</label>
              <input type="number" className="field" value={form.work_capacity_hours} onChange={(e) => setForm({ ...form, work_capacity_hours: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Assistant tone</label>
              <select className="field" value={form.assistant_tone} onChange={(e) => setForm({ ...form, assistant_tone: e.target.value })}>
                <option value="firm-tactical">Firm & tactical</option>
                <option value="direct-minimal">Direct & minimal</option>
                <option value="supportive-sharp">Supportive but sharp</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Current constraints</label>
              <textarea className="field min-h-[56px]" value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} />
            </div>
            <div>
              <label className="label">Smoking reduction plan</label>
              <textarea className="field min-h-[56px]" value={form.smoking_plan} onChange={(e) => setForm({ ...form, smoking_plan: e.target.value })} />
            </div>
            <div>
              <label className="label">Body goals</label>
              <textarea className="field min-h-[56px]" value={form.body_goals} onChange={(e) => setForm({ ...form, body_goals: e.target.value })} />
            </div>
            <div>
              <label className="label">Secondary metrics (one per line)</label>
              <textarea className="field min-h-[100px]" value={form.secondary_metrics} onChange={(e) => setForm({ ...form, secondary_metrics: e.target.value })} />
            </div>
            <div>
              <label className="label">60-day goals (one per line)</label>
              <textarea className="field min-h-[100px]" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={save} className="btn btn-primary">
              {sprint ? "Save sprint" : "Start 60-day sprint"}
            </button>
            {saved && <span className="text-[12.5px] font-semibold text-emerald-300 fade-up">Saved.</span>}
          </div>
        </Card>
      )}
    </div>
  );
}

function Param({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="text-faint">{k}:</span> <span className="font-semibold">{v}</span>
    </div>
  );
}

function parseList(raw?: string): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
