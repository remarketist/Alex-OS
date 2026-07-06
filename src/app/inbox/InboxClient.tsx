"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, DomainBadge, PageHeader } from "@/components/ui";
import type { Task } from "@/lib/types";

// Voice-ready capture: browser SpeechRecognition feeds the same text pipeline.
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
  return Ctor ? new Ctor() : null;
}

export function InboxClient({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [captureResult, setCaptureResult] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const capture = async () => {
    if (!raw.trim()) return;
    setBusy(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    const j = await res.json();
    setBusy(false);
    setRaw("");
    setCaptureResult(`${j.created} task${j.created === 1 ? "" : "s"} captured and categorized.`);
    setTimeout(() => setCaptureResult(null), 3000);
    router.refresh();
  };

  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = getSpeechRecognition();
    if (!rec) {
      setCaptureResult("Voice input isn't available in this browser. Type it — same pipeline.");
      setTimeout(() => setCaptureResult(null), 3000);
      return;
    }
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(" ");
      setRaw((prev) => (prev ? prev + " " + transcript : transcript));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const patch = async (id: number, patchBody: Record<string, unknown>) => {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });
    router.refresh();
  };

  const del = async (id: number) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const today = new Date().toISOString().slice(0, 10);
  const groups: { key: string; label: string; items: Task[] }[] = [
    { key: "inbox", label: "Inbox — uncategorized", items: tasks.filter((t) => t.status === "inbox") },
    { key: "today", label: "Today", items: tasks.filter((t) => t.status === "today") },
    { key: "scheduled", label: "Scheduled", items: tasks.filter((t) => t.status === "scheduled") },
    { key: "backlog", label: "Backlog", items: tasks.filter((t) => t.status === "backlog") },
  ];

  return (
    <div>
      <PageHeader
        title="Task Inbox"
        subtitle="Quick capture, any moment: one thought → one categorized task. To plan a whole week with blocks and targets, use the Sprint Builder."
      />

      {/* Capture */}
      <Card className="mb-6">
        <div className="relative">
          <textarea
            className="field min-h-[92px] resize-y pr-12"
            placeholder={`"Need to fix Nayam ad and do Sanki captions, apply to 5 jobs, work on the health thing, walk daily…"`}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) capture();
            }}
          />
          <button
            onClick={toggleVoice}
            title="Voice capture"
            className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-colors ${
              listening
                ? "border-rose-400/50 bg-rose-400/20 text-rose-300 pulse-glow"
                : "border-white/10 bg-white/5 text-mute hover:text-ink"
            }`}
          >
            {listening ? "◼" : "🎙"}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={capture} disabled={busy || !raw.trim()} className="btn btn-primary">
            {busy ? "Parsing…" : "Capture & categorize"}
          </button>
          <span className="text-[11px] text-faint">⌘⏎ to capture · aliases like “Saint”, “Sanki”, “health thing” are recognized</span>
        </div>
        {captureResult && (
          <div className="mt-2 text-[12.5px] font-semibold text-cyan-300 fade-up">{captureResult}</div>
        )}
      </Card>

      {/* Groups */}
      <div className="space-y-6">
        {groups.map((g) =>
          g.items.length === 0 ? null : (
            <div key={g.key}>
              <div className="section-title mb-2.5">{g.label} <span className="text-faint">({g.items.length})</span></div>
              <div className="space-y-2">
                {g.items.map((t) => (
                  <Card key={t.id} className="!p-3.5" hover>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{t.title}</span>
                          <DomainBadge domain={t.domain} />
                          {t.entity_name && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10.5px] font-semibold text-mute">
                              {t.entity_name}
                            </span>
                          )}
                          {!!t.recurring && (
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-cyan-300/80">↻ recurring</span>
                          )}
                          {t.priority === 1 && (
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose-400">P1</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-faint">
                          <span>{t.effort_min} min</span>
                          {t.due_date && <span>· due {t.due_date}</span>}
                          {t.scheduled_date && <span>· scheduled {t.scheduled_date}</span>}
                          {t.notes && <span className="truncate">· {t.notes}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {t.status !== "today" && (
                          <ActionBtn onClick={() => patch(t.id, { status: "today", scheduled_date: today })}>Add to today</ActionBtn>
                        )}
                        {t.status !== "scheduled" && (
                          <ActionBtn onClick={() => patch(t.id, { status: "scheduled", scheduled_date: today })}>Schedule this week</ActionBtn>
                        )}
                        {t.status !== "backlog" && (
                          <ActionBtn onClick={() => patch(t.id, { status: "backlog", scheduled_date: null })}>Backlog</ActionBtn>
                        )}
                        {!t.recurring && (
                          <ActionBtn onClick={() => patch(t.id, { recurring: 1 })}>Make habit</ActionBtn>
                        )}
                        <ActionBtn onClick={() => patch(t.id, { status: "done" })}>✓ Done</ActionBtn>
                        <button
                          onClick={() => del(t.id)}
                          className="rounded-lg border border-rose-400/20 bg-rose-400/5 px-2 py-1 text-[11px] font-semibold text-rose-400/90 hover:bg-rose-400/15"
                        >
                          Kill
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}
        {tasks.length === 0 && (
          <Card className="py-10 text-center text-sm text-mute">
            Inbox zero. Dump next week&apos;s mess above when it arrives.
          </Card>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-mute transition-colors hover:border-cyan-400/30 hover:text-cyan-300"
    >
      {children}
    </button>
  );
}
