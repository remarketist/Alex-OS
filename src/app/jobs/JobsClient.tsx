"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, PageHeader, StatTile } from "@/components/ui";
import type { JobApplication } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  applied: "#22d3ee",
  replied: "#a78bfa",
  interview: "#34d399",
  assessment: "#fbbf24",
  rejected: "#64748b",
  followup: "#f472b6",
  offer: "#f5c451",
  archived: "#475569",
};

const STATUSES = ["applied", "replied", "interview", "assessment", "rejected", "followup", "offer", "archived"];

export function JobsClient({
  apps, metrics, connectionStatus, lastSync, events,
}: {
  apps: JobApplication[];
  metrics: { today: number; yesterday: number; week: number; month: number; sprint: number; avgPerActiveDay: number; pending: number };
  connectionStatus: string;
  lastSync: { ts: string; mode: string; scanned: number; detected: number } | null;
  events: { id: number; ts: string; type: string; detail: string; company: string; role: string }[];
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const pending = apps.filter((a) => a.review_state === "pending");
  const confirmed = apps.filter((a) => a.review_state !== "pending");
  const filtered = filter === "all" ? confirmed : confirmed.filter((a) => a.status === filter);

  const sync = async () => {
    setSyncing(true);
    const res = await fetch("/api/gmail/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: connectionStatus === "connected" ? "manual" : "demo" }),
    });
    const j = await res.json();
    setSyncing(false);
    setSyncMsg(j.ok ? `Scanned ${j.scanned}, detected ${j.detected} new. ${j.notes || ""}` : `Sync failed: ${j.error}`);
    setTimeout(() => setSyncMsg(null), 5000);
    router.refresh();
  };

  const patch = async (id: number, body: Record<string, unknown>) => {
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle="Gmail watches the pipeline so you only do the applying."
        action={
          <div className="flex items-center gap-2">
            <button onClick={sync} disabled={syncing} className="btn btn-primary text-[13px]">
              {syncing ? "Syncing…" : connectionStatus === "connected" ? "Sync Gmail" : "Run demo sync"}
            </button>
            <Link href="/settings" className="btn btn-ghost text-[13px]">
              Gmail: <span className={connectionStatus === "connected" ? "text-emerald-300" : "text-amber-300"}>{connectionStatus}</span>
            </Link>
          </div>
        }
      />

      {syncMsg && (
        <div className="mb-4 rounded-xl border border-cyan-400/25 bg-cyan-400/5 px-3.5 py-2.5 text-[12.5px] text-cyan-200 fade-up">
          {syncMsg}
        </div>
      )}

      {/* Metrics */}
      <div className="mb-5 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        <StatTile label="Today" value={metrics.today} color="#22d3ee" />
        <StatTile label="Yesterday" value={metrics.yesterday} />
        <StatTile label="This week" value={metrics.week} />
        <StatTile label="This month" value={metrics.month} />
        <StatTile label="Sprint" value={metrics.sprint} />
        <StatTile label="Avg / day" value={metrics.avgPerActiveDay} />
      </div>

      {/* Review queue */}
      {pending.length > 0 && (
        <Card className="mb-5 border-amber-400/20">
          <div className="section-title mb-3 text-amber-300">
            Review queue — possible applications detected ({pending.length})
          </div>
          <div className="space-y-2">
            {pending.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{a.company} {a.role && <span className="text-mute">— {a.role}</span>}</div>
                  <div className="mt-0.5 truncate text-[11.5px] text-faint">
                    “{a.email_subject}” · {a.sender} · confidence {Math.round(a.confidence * 100)}%
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => patch(a.id, { review_state: "confirmed" })} className="btn btn-primary !px-3 !py-1.5 text-[12px]">Confirm</button>
                  <button onClick={() => patch(a.id, { review_state: "ignored" })} className="btn btn-ghost !px-3 !py-1.5 text-[12px]">Ignore</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* CRM table */}
        <div className="lg:col-span-2">
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            {["all", ...STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
                  filter === s
                    ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                    : "border-white/10 text-mute hover:text-ink"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filtered.map((a) => {
              const c = STATUS_COLORS[a.status] || "#64748b";
              return (
                <Card key={a.id} className="!p-3.5" hover>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold">{a.company}</span>
                        {a.role && <span className="truncate text-[12.5px] text-mute">{a.role}</span>}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-faint">
                        <span>applied {a.applied_date}</span>
                        {a.source && <span>· {a.source}</span>}
                        {a.last_email_date && a.last_email_date !== a.applied_date && <span>· last email {a.last_email_date}</span>}
                        {a.reply_type && <span className="font-semibold text-emerald-300/90">· {a.reply_type}</span>}
                        {a.gmail_thread_id && !a.gmail_thread_id.startsWith("mock") && !a.gmail_thread_id.startsWith("demo") && (
                          <a
                            className="text-cyan-300/80 hover:text-cyan-200"
                            href={`https://mail.google.com/mail/u/0/#inbox/${a.gmail_thread_id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            · open thread ↗
                          </a>
                        )}
                      </div>
                      {a.next_action && (
                        <div className="mt-1 text-[11.5px] font-semibold text-amber-300/90">→ {a.next_action}</div>
                      )}
                    </div>
                    <select
                      value={a.status}
                      onChange={(e) => patch(a.id, { status: e.target.value })}
                      className="field !w-auto !py-1 !px-2 text-[12px] font-semibold capitalize"
                      style={{ color: c }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <Card className="py-8 text-center text-sm text-mute">No applications with this status.</Card>
            )}
          </div>
        </div>

        {/* Side: activity + sync info */}
        <div className="space-y-4">
          <Card>
            <div className="section-title mb-3">Reply activity</div>
            {events.length ? (
              <ul className="space-y-2.5">
                {events.map((e) => (
                  <li key={e.id} className="text-[12px] leading-snug">
                    <span className="font-semibold capitalize" style={{ color: STATUS_COLORS[e.type] || "#a78bfa" }}>
                      {e.type}
                    </span>{" "}
                    — {e.company} {e.role && <span className="text-mute">({e.role})</span>}
                    <div className="mt-0.5 text-[11px] text-faint">{e.detail}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-mute">No replies detected yet.</p>
            )}
          </Card>
          <Card>
            <div className="section-title mb-2">Sync</div>
            {lastSync ? (
              <p className="text-[12px] text-mute">
                Last: <span className="text-ink">{lastSync.ts}</span> ({lastSync.mode}) — scanned {lastSync.scanned}, detected {lastSync.detected}.
              </p>
            ) : (
              <p className="text-[12px] text-mute">No syncs yet.</p>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-faint">
              This app only reads job-related emails for tracking. It does not send, delete, archive, or modify emails.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
