"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, DomainBadge, PageHeader, DOMAIN_COLORS } from "@/components/ui";
import type { WorkBlock, DailyPlan, Task } from "@/lib/types";

const STATUSES = ["upcoming", "active", "completed", "missed", "rescheduled", "shrunk"];

export function PlannerClient({
  date, dateLabel, prev, next, isToday, plan, blocks, tasks,
}: {
  date: string;
  dateLabel: string;
  prev: string;
  next: string;
  isToday: boolean;
  plan: DailyPlan | null;
  blocks: WorkBlock[];
  tasks: Task[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const patchBlock = async (id: number, patch: Record<string, unknown>) => {
    await fetch(`/api/blocks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  };

  const deleteBlock = async (id: number) => {
    await fetch(`/api/blocks/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const patchTask = async (id: number, patch: Record<string, unknown>) => {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        title="Daily Planner"
        subtitle={`${dateLabel}${isToday ? " — today" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/planner?date=${prev}`} className="btn btn-ghost !px-3">←</Link>
            {!isToday && (
              <Link href="/planner" className="btn btn-ghost text-[12px]">Today</Link>
            )}
            <Link href={`/planner?date=${next}`} className="btn btn-ghost !px-3">→</Link>
          </div>
        }
      />

      {plan?.mission && (
        <Card className="mb-4">
          <div className="section-title mb-1">Mission</div>
          <div className="text-sm font-semibold">{plan.mission}</div>
          {plan.adaptation_note && (
            <div className="mt-1 text-[12.5px] text-amber-300/90">↳ {plan.adaptation_note}</div>
          )}
        </Card>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="section-title">Blocks</div>
        <button onClick={() => setAdding(!adding)} className="btn btn-ghost text-[12px] !py-1.5">
          {adding ? "Cancel" : "+ Add block"}
        </button>
      </div>

      {adding && <BlockForm date={date} onDone={() => { setAdding(false); router.refresh(); }} />}

      <div className="space-y-3">
        {blocks.length === 0 && !adding && (
          <Card className="text-center text-sm text-mute py-8">
            No blocks for this day. Add one, or <Link className="text-cyan-300" href="/sprint-builder">generate the week</Link>.
          </Card>
        )}
        {blocks.map((b) => {
          const color = DOMAIN_COLORS[b.domain] || "#64748b";
          const isEditing = editing === b.id;
          return (
            <Card key={b.id} className="!p-4" hover>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className="mt-0.5 h-10 w-1 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[12px] text-faint">{b.start_time}–{b.end_time}</span>
                      <span className="text-[15px] font-bold">{b.name}</span>
                      <DomainBadge domain={b.domain} />
                    </div>
                    {b.goal && <p className="mt-0.5 text-[13px] text-mute">{b.goal}</p>}
                    {b.completion_criteria && (
                      <p className="mt-0.5 text-[11.5px] text-faint">✓ done when: {b.completion_criteria}</p>
                    )}
                    {b.actual_minutes > 0 && (
                      <p className="mt-0.5 font-mono text-[11px] text-emerald-300/80">{b.actual_minutes} min logged{b.result ? ` — ${b.result}` : ""}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={b.status}
                    onChange={(e) => patchBlock(b.id, { status: e.target.value })}
                    className="field !w-auto !py-1 !px-2 text-[12px]"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button onClick={() => setEditing(isEditing ? null : b.id)} className="btn btn-ghost !px-2.5 !py-1 text-[12px]">
                    {isEditing ? "Close" : "Edit"}
                  </button>
                </div>
              </div>
              {isEditing && (
                <BlockForm
                  date={date}
                  block={b}
                  onDone={() => { setEditing(null); router.refresh(); }}
                  onDelete={() => deleteBlock(b.id)}
                />
              )}
            </Card>
          );
        })}
      </div>

      {tasks.length > 0 && (
        <>
          <div className="section-title mb-3 mt-8">Tasks scheduled this day</div>
          <div className="space-y-2">
            {tasks.map((t) => (
              <Card key={t.id} className="!p-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    onClick={() => patchTask(t.id, { status: t.status === "done" ? "scheduled" : "done" })}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition-colors ${
                      t.status === "done"
                        ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-300"
                        : "border-white/15 text-transparent hover:border-cyan-400/50"
                    }`}
                  >
                    ✓
                  </button>
                  <span className={`truncate text-sm ${t.status === "done" ? "line-through text-faint" : ""}`}>
                    {t.title}
                  </span>
                  {t.entity_name && <span className="shrink-0 text-[11px] text-faint">{t.entity_name}</span>}
                </div>
                <DomainBadge domain={t.domain} />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BlockForm({
  date, block, onDone, onDelete,
}: {
  date: string;
  block?: WorkBlock;
  onDone: () => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState({
    name: block?.name || "",
    domain: block?.domain || "client",
    start_time: block?.start_time || "09:00",
    end_time: block?.end_time || "10:30",
    goal: block?.goal || "",
    completion_criteria: block?.completion_criteria || "",
    actual_minutes: block?.actual_minutes || 0,
    result: block?.result || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    if (block) {
      await fetch(`/api/blocks/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date }),
      });
    }
    setSaving(false);
    onDone();
  };

  return (
    <div className="mt-4 grid gap-3 border-t border-white/5 pt-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Name</label>
        <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Client sprint — Nayam" />
      </div>
      <div>
        <label className="label">Domain</label>
        <select className="field" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value as WorkBlock["domain"] })}>
          {["jobs", "client", "project", "body", "journal", "admin", "emotional"].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start</label>
          <input type="time" className="field" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
        </div>
        <div>
          <label className="label">End</label>
          <input type="time" className="field" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Goal</label>
        <input className="field" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="What must ship in this block" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Completion criteria</label>
        <input className="field" value={form.completion_criteria} onChange={(e) => setForm({ ...form, completion_criteria: e.target.value })} placeholder="How you know it's done" />
      </div>
      {block && (
        <>
          <div>
            <label className="label">Actual minutes</label>
            <input type="number" className="field" value={form.actual_minutes} onChange={(e) => setForm({ ...form, actual_minutes: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Result</label>
            <input className="field" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} placeholder="What actually got done" />
          </div>
        </>
      )}
      <div className="flex items-center gap-2 sm:col-span-2">
        <button onClick={save} disabled={saving || !form.name} className="btn btn-primary">
          {saving ? "Saving…" : block ? "Save block" : "Add block"}
        </button>
        {onDelete && (
          <button onClick={onDelete} className="btn btn-danger">Delete</button>
        )}
      </div>
    </div>
  );
}
