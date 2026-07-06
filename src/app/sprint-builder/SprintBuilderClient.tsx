"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, DomainBadge, PageHeader } from "@/components/ui";
import type { ParsedTask } from "@/lib/parser";
import type { ProposedPlan } from "@/lib/sprint-builder";
import type { WeeklyTargets } from "@/lib/types";

const STEPS = ["Messy capture", "Categorize", "Targets", "Week plan", "Activate"];

const TARGET_LABELS: [keyof WeeklyTargets, string][] = [
  ["job_applications", "Job applications"],
  ["tailored_applications", "Tailored applications"],
  ["follow_ups", "Follow-ups"],
  ["client_hours", "Client hours"],
  ["client_deliverables", "Client deliverables"],
  ["project_hours", "Project hours"],
  ["shipped_assets", "Shipped assets"],
  ["workouts", "Workouts"],
  ["walks", "Walks"],
  ["meditations", "Meditations"],
  ["smoking_limit", "Smoking limit / day"],
  ["journal_entries", "Journal entries"],
];

export function SprintBuilderClient({
  thisWeek, nextWeek, activePlanWeek, suggestions,
}: {
  thisWeek: string;
  nextWeek: string;
  activePlanWeek: string | null;
  suggestions: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [messy, setMessy] = useState("");
  const [weekStart, setWeekStart] = useState(thisWeek);
  const [parsed, setParsed] = useState<ParsedTask[]>([]);
  const [plan, setPlan] = useState<ProposedPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [activated, setActivated] = useState(false);

  const parse = async () => {
    setBusy(true);
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: messy }),
    });
    const j = await res.json();
    setParsed(j.tasks || []);
    setBusy(false);
    setStep(1);
  };

  const generate = async () => {
    setBusy(true);
    const res = await fetch("/api/sprint-builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", messy, weekStart }),
    });
    const j = await res.json();
    setPlan(j.plan);
    setBusy(false);
    setStep(2);
  };

  const activate = async () => {
    if (!plan) return;
    setBusy(true);
    await fetch("/api/sprint-builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate", plan, messy }),
    });
    setBusy(false);
    setActivated(true);
    setStep(4);
    router.refresh();
  };

  const setTarget = (k: keyof WeeklyTargets, v: number) => {
    if (!plan) return;
    setPlan({ ...plan, targets: { ...plan.targets, [k]: v } });
  };

  const moveTask = (dayIdx: number, taskIdx: number, dir: -1 | 1) => {
    if (!plan) return;
    const days = plan.days.map((d) => ({ ...d, tasks: [...d.tasks] }));
    const target = dayIdx + dir;
    if (target < 0 || target >= days.length) return;
    const [task] = days[dayIdx].tasks.splice(taskIdx, 1);
    days[target].tasks.push(task);
    setPlan({ ...plan, days });
  };

  return (
    <div>
      <PageHeader
        title="Sprint Builder"
        subtitle="The weekly ritual: messy goals in → a full 7-day plan out (targets, daily blocks, Telegram schedule). For one-off thoughts during the day, use the Task Inbox."
      />

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                i === step
                  ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                  : i < step
                    ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-300"
                    : "border-white/10 text-faint"
              }`}
            >
              <span className="font-mono">{i < step ? "✓" : i + 1}</span> {s}
            </button>
            {i < STEPS.length - 1 && <span className="text-faint">—</span>}
          </div>
        ))}
      </div>

      {/* Step 0: messy capture */}
      {step === 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="section-title mb-2">What does this week need to produce?</div>
            <textarea
              className="field min-h-[180px] resize-y"
              placeholder={`"I need to apply for jobs every morning, finish Nayam ads, create SI Lounge reels, build my AI job automation, work out at home, walk daily, meditate, smoke less, and launch one personal project asset."`}
              value={messy}
              onChange={(e) => setMessy(e.target.value)}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div>
                <label className="label">Week</label>
                <select className="field !w-auto" value={weekStart} onChange={(e) => setWeekStart(e.target.value)}>
                  <option value={thisWeek}>This week ({thisWeek})</option>
                  <option value={nextWeek}>Next week ({nextWeek})</option>
                </select>
              </div>
              <button onClick={parse} disabled={busy || !messy.trim()} className="btn btn-primary mt-5">
                {busy ? "Parsing…" : "Categorize →"}
              </button>
            </div>
            {activePlanWeek && (
              <p className="mt-3 text-[11.5px] text-faint">
                Active plan exists for week of {activePlanWeek}. Activating a new one for the same week replaces it.
              </p>
            )}
          </Card>
          <Card>
            <div className="section-title mb-2">The system already knows</div>
            <ul className="space-y-2">
              {suggestions.map((s, i) => (
                <li key={i} className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 text-[12px] leading-snug text-mute">
                  {s}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Step 1: categorization */}
      {step === 1 && (
        <Card>
          <div className="section-title mb-3">Parsed & categorized — fix anything that&apos;s wrong</div>
          <div className="space-y-2">
            {parsed.map((t, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold">{t.title}</span>
                  {t.entity_name && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10.5px] font-semibold text-mute shrink-0">
                      {t.entity_name}
                    </span>
                  )}
                  {t.recurring && <span className="text-[10.5px] text-cyan-300/80 shrink-0">↻</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-faint">{t.effort_min}m</span>
                  <select
                    value={t.domain}
                    onChange={(e) => {
                      const next = [...parsed];
                      next[i] = { ...t, domain: e.target.value as ParsedTask["domain"] };
                      setParsed(next);
                    }}
                    className="field !w-auto !py-1 !px-2 text-[12px]"
                  >
                    {["jobs", "client", "project", "body", "admin", "emotional", "backlog"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <DomainBadge domain={t.domain} />
                </div>
              </div>
            ))}
            {parsed.length === 0 && <p className="py-4 text-center text-sm text-mute">Nothing parsed. Go back and write more.</p>}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setStep(0)} className="btn btn-ghost">← Back</button>
            <button onClick={generate} disabled={busy} className="btn btn-primary">
              {busy ? "Building week…" : "Propose weekly plan →"}
            </button>
          </div>
        </Card>
      )}

      {/* Step 2: targets */}
      {step === 2 && plan && (
        <Card>
          <div className="section-title mb-3">Weekly targets — adjust to reality, not ambition</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {TARGET_LABELS.map(([k, label]) => (
              <div key={k}>
                <label className="label">{label}</label>
                <input
                  type="number"
                  className="field font-mono"
                  value={plan.targets[k]}
                  onChange={(e) => setTarget(k, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setStep(1)} className="btn btn-ghost">← Back</button>
            <button onClick={() => setStep(3)} className="btn btn-primary">Distribute across days →</button>
          </div>
        </Card>
      )}

      {/* Step 3: week plan review */}
      {step === 3 && plan && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="section-title">Proposed week of {plan.week_start}</div>
            <div className="flex gap-2">
              <button onClick={generate} disabled={busy} className="btn btn-ghost text-[12px]">↻ Regenerate</button>
              <button onClick={() => setStep(4)} className="btn btn-primary text-[13px]">Review & activate →</button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plan.days.map((d, di) => (
              <Card key={d.date} className="!p-4">
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-sm font-bold">
                    {new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" })}
                  </span>
                  <span className="font-mono text-[11px] text-faint">{d.date}</span>
                </div>
                <p className="mb-2 text-[12px] text-mute">{d.mission}</p>
                <ul className="space-y-1">
                  {d.blocks.map((b, bi) => (
                    <li key={bi} className="flex items-center gap-2 text-[11.5px]">
                      <span className="font-mono text-faint">{b.start_time}</span>
                      <span className="truncate">{b.name}</span>
                    </li>
                  ))}
                </ul>
                {d.tasks.length > 0 && (
                  <div className="mt-2 border-t border-white/5 pt-2">
                    {d.tasks.map((t, ti) => (
                      <div key={ti} className="flex items-center justify-between gap-2 py-0.5">
                        <span className="truncate text-[11.5px] text-ink/85">· {t.title}</span>
                        <span className="flex shrink-0 gap-1">
                          <button onClick={() => moveTask(di, ti, -1)} className="rounded border border-white/10 px-1.5 text-[10px] text-mute hover:text-ink">←</button>
                          <button onClick={() => moveTask(di, ti, 1)} className="rounded border border-white/10 px-1.5 text-[10px] text-mute hover:text-ink">→</button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
          <div className="mt-4">
            <button onClick={() => setStep(2)} className="btn btn-ghost">← Targets</button>
          </div>
        </div>
      )}

      {/* Step 4: activate */}
      {step === 4 && plan && (
        <Card className="mx-auto max-w-xl text-center">
          {activated ? (
            <div className="py-6">
              <div className="text-4xl">⟁</div>
              <h2 className="mt-3 text-xl font-bold">Sprint live.</h2>
              <p className="mt-2 text-sm text-mute">
                The week is loaded into the Command Center, Daily Planner, and Telegram schedule.
                Now it&apos;s just execution.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Link href="/" className="btn btn-primary">Open Command Center</Link>
                <Link href="/planner" className="btn btn-ghost">Today&apos;s blocks</Link>
              </div>
            </div>
          ) : (
            <div className="py-6">
              <h2 className="text-xl font-bold">Activate week of {plan.week_start}?</h2>
              <p className="mt-2 text-sm text-mute">
                {plan.days.reduce((a, d) => a + d.blocks.length, 0)} blocks ·{" "}
                {plan.days.reduce((a, d) => a + d.tasks.length, 0)} scheduled tasks ·{" "}
                {plan.targets.job_applications} applications targeted
              </p>
              <p className="mt-1 text-[12px] text-faint">
                This populates the Command Center, Daily Planner, score targets, and reminder schedule.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <button onClick={() => setStep(3)} className="btn btn-ghost">← Edit</button>
                <button onClick={activate} disabled={busy} className="btn btn-primary">
                  {busy ? "Activating…" : "Activate sprint"}
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
