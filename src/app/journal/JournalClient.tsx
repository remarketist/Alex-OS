"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import type { JournalEntry } from "@/lib/types";

const PROMPTS: [keyof FormState, string, string][] = [
  ["moved", "What moved today?", "Applications, deliverables, blocks, reps…"],
  ["avoided", "What did I avoid?", "Name it. That's half the fix."],
  ["trigger", "What triggered drift?", "Phone, news, worry, fatigue…"],
  ["proud", "What am I proud of?", "One real thing."],
  ["tomorrow_first_block", "Tomorrow's first block?", "The day is decided before 09:00."],
  ["one_truth", "One sentence truth", "No performance. Just the truth."],
];

type FormState = {
  moved: string;
  avoided: string;
  trigger: string;
  proud: string;
  tomorrow_first_block: string;
  one_truth: string;
};

export function JournalClient({
  today, entry, past,
}: {
  today: string;
  entry: JournalEntry | null;
  past: (JournalEntry & { label: string })[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    moved: entry?.moved || "",
    avoided: entry?.avoided || "",
    trigger: entry?.trigger || "",
    proud: entry?.proud || "",
    tomorrow_first_block: entry?.tomorrow_first_block || "",
    one_truth: entry?.one_truth || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, ...form }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        title="Journal"
        subtitle="Five lines. No performance. It feeds the reviews."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="space-y-4">
            {PROMPTS.map(([key, label, placeholder]) => (
              <div key={key}>
                <label className="label">{label}</label>
                {key === "one_truth" ? (
                  <input
                    className="field"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                ) : (
                  <textarea
                    className="field min-h-[52px] resize-y"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? "Saving…" : entry ? "Update entry" : "Save entry"}
            </button>
            {saved && <span className="text-[12.5px] font-semibold text-emerald-300 fade-up">Saved. Day scored.</span>}
          </div>
        </Card>

        <div className="space-y-3">
          <div className="section-title">Past entries</div>
          {past.length === 0 && (
            <Card className="py-6 text-center text-sm text-mute">No entries yet.</Card>
          )}
          {past.map((p) => (
            <Card key={p.id} className="!p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-faint">{p.label}</div>
              {p.one_truth && <p className="mt-1 text-[13px] font-semibold italic text-ink/90">“{p.one_truth}”</p>}
              {p.moved && <p className="mt-1 text-[12px] text-mute"><span className="text-emerald-300/80">moved:</span> {p.moved}</p>}
              {p.avoided && <p className="mt-0.5 text-[12px] text-mute"><span className="text-rose-300/80">avoided:</span> {p.avoided}</p>}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
