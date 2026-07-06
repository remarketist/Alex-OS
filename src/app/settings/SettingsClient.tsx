"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import type { Settings, Reminder, GmailConnection, TelegramMessage, ScoreBreakdown } from "@/lib/types";

export function SettingsClient({
  settings, reminders, gmail, telegramTokenSet, gmailEnvSet, tgMessages,
}: {
  settings: Settings;
  reminders: Reminder[];
  gmail: GmailConnection;
  telegramTokenSet: boolean;
  gmailEnvSet: boolean;
  tgMessages: TelegramMessage[];
}) {
  const router = useRouter();
  const [chatId, setChatId] = useState(settings.telegram_chat_id || "");
  const [tgEnabled, setTgEnabled] = useState(!!settings.telegram_enabled);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [command, setCommand] = useState("");
  const [commandReply, setCommandReply] = useState<string | null>(null);
  const [weights, setWeights] = useState<ScoreBreakdown>(parseWeights(settings.score_weights));
  const [gmailForm, setGmailForm] = useState({
    scan_start: gmail?.scan_start || "",
    included_keywords: gmail?.included_keywords || "",
    excluded_keywords: gmail?.excluded_keywords || "",
    ignored_senders: gmail?.ignored_senders || "",
    ignored_companies: gmail?.ignored_companies || "",
  });
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const flash = (m: string) => {
    setSavedMsg(m);
    setTimeout(() => setSavedMsg(null), 2500);
  };

  const patchSettings = async (body: Record<string, unknown>) => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    flash("Saved.");
    router.refresh();
  };

  const testTelegram = async () => {
    const res = await fetch("/api/telegram/test", { method: "POST" });
    const j = await res.json();
    setTestResult(
      j.mock
        ? "Bot token/chat ID not configured — message logged as mock. Set TELEGRAM_BOT_TOKEN and chat ID, then retest."
        : j.ok
          ? "Sent. Check Telegram."
          : `Failed: ${j.error}`
    );
  };

  const runCommand = async () => {
    if (!command.trim()) return;
    const res = await fetch("/api/telegram/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: command }),
    });
    const j = await res.json();
    setCommandReply(j.reply);
    setCommand("");
    router.refresh();
  };

  const [webhookMsg, setWebhookMsg] = useState<string | null>(null);
  const setupWebhook = async () => {
    setWebhookMsg("Working…");
    const res = await fetch("/api/telegram/setup-webhook", { method: "POST" });
    const j = await res.json();
    setWebhookMsg(j.ok ? "Replies enabled. Text your bot 'today' to try it." : `Failed: ${j.error || "unknown"}`);
    setTimeout(() => setWebhookMsg(null), 6000);
  };

  const [beatMsg, setBeatMsg] = useState<string | null>(null);
  const runHeartbeat = async () => {
    setBeatMsg("Running…");
    const res = await fetch("/api/cron/reminders", { method: "GET" });
    const j = await res.json().catch(() => ({}));
    const acted = [...(j.blockActions ?? []), ...(j.sent ?? [])];
    setBeatMsg(
      j.ok
        ? acted.length
          ? `Fired: ${acted.join(", ")}. Check Telegram.`
          : "Heartbeat ran. Nothing due this minute — pings fire at each block's start/end time."
        : `Failed: ${j.error || "unknown"}`
    );
    setTimeout(() => setBeatMsg(null), 8000);
    router.refresh();
  };

  const saveGmailSettings = async () => {
    // Reuse knowledge route pattern? Gmail settings live on gmail_connections — use a dedicated call
    await fetch("/api/gmail/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gmailForm),
    });
    flash("Gmail scan settings saved.");
    router.refresh();
  };

  const disconnectGmail = async () => {
    await fetch("/api/gmail/disconnect", { method: "POST" });
    router.refresh();
  };

  const patchReminder = async (id: number, body: Record<string, unknown>) => {
    await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    router.refresh();
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  return (
    <div className="min-w-0">
      <PageHeader title="Settings" subtitle="Integrations, scoring, and the reminder engine." />
      {savedMsg && (
        <div className="mb-4 rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-3.5 py-2 text-[12.5px] text-emerald-200 fade-up">{savedMsg}</div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Telegram */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="section-title">Telegram</div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${telegramTokenSet ? "text-emerald-300" : "text-amber-300"}`}>
              {telegramTokenSet ? "token set" : "token missing"}
            </span>
          </div>
          <p className="text-[12px] leading-relaxed text-mute">
            Paste your chat ID, keep reminders on, and hit <span className="text-ink">Send test</span>.
            Then <span className="text-ink">Enable replies</span> so texting the bot (DONE, jobs 3, smoked 2)
            updates the app. Pings fire automatically at each block&apos;s start and end time.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input className="field min-w-0 font-mono" placeholder="Chat ID e.g. 123456789" value={chatId} onChange={(e) => setChatId(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => patchSettings({ telegram_chat_id: chatId, telegram_enabled: tgEnabled ? 1 : 0 })} className="btn btn-primary flex-1 sm:flex-none">Save</button>
              <button onClick={testTelegram} className="btn btn-ghost flex-1 sm:flex-none">Send test</button>
            </div>
          </div>
          <label className="mt-2.5 flex items-center gap-2 text-[12.5px] text-mute">
            <input type="checkbox" checked={tgEnabled} onChange={(e) => setTgEnabled(e.target.checked)} className="accent-cyan-400" />
            Reminders enabled
          </label>
          {testResult && <p className="mt-2 break-words text-[12px] text-cyan-200">{testResult}</p>}

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button onClick={setupWebhook} className="btn btn-ghost text-[12.5px]">Enable replies (set webhook)</button>
            <button onClick={runHeartbeat} className="btn btn-ghost text-[12.5px]">Run heartbeat now</button>
          </div>
          {webhookMsg && <p className="mt-2 break-words text-[12px] text-cyan-200">{webhookMsg}</p>}
          {beatMsg && <p className="mt-2 break-words text-[12px] text-cyan-200">{beatMsg}</p>}

          <div className="mt-4 border-t border-white/5 pt-3">
            <div className="section-title mb-2">Command console — same parser as the bot</div>
            <div className="flex gap-2">
              <input
                className="field min-w-0 font-mono text-[13px]"
                placeholder="today · jobs 3 · score"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runCommand()}
              />
              <button onClick={runCommand} className="btn btn-ghost shrink-0">Run</button>
            </div>
            {commandReply && (
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-white/5 bg-black/30 px-3 py-2 font-mono text-[11.5px] text-cyan-100">{commandReply}</pre>
            )}
            {tgMessages.length > 0 && (
              <div className="mt-3 max-h-44 space-y-1 overflow-y-auto">
                {tgMessages.map((m) => (
                  <div key={m.id} className="flex gap-2 text-[11px]">
                    <span className={`shrink-0 font-bold ${m.direction === "out" ? "text-cyan-300/80" : "text-emerald-300/80"}`}>
                      {m.direction === "out" ? "→" : "←"}
                    </span>
                    <span className="truncate text-mute">{m.text}</span>
                    <span className="ml-auto shrink-0 text-faint">{m.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Gmail */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="section-title">Gmail Job Intelligence</div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${gmail?.status === "connected" ? "text-emerald-300" : "text-amber-300"}`}>
              {gmail?.status ?? "disconnected"}
            </span>
          </div>
          <p className="text-[12px] leading-relaxed text-mute">
            Read-only scan for application confirmations and recruiter replies.
            This app never sends, deletes, archives, or modifies email.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {gmail?.status === "connected" ? (
              <button onClick={disconnectGmail} className="btn btn-danger">Disconnect</button>
            ) : (
              <a
                href="/api/gmail/connect"
                className={`btn btn-primary ${gmailEnvSet ? "" : "pointer-events-none opacity-50"}`}
              >
                Connect Gmail
              </a>
            )}
            {!gmailEnvSet && (
              <span className="break-words text-[11.5px] text-amber-300/90">
                Set GMAIL_CLIENT_ID / SECRET / REDIRECT_URI in the Worker first — demo sync works meanwhile.
              </span>
            )}
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <div>
              <label className="label">Scan start date</label>
              <input type="date" className="field" value={gmailForm.scan_start} onChange={(e) => setGmailForm({ ...gmailForm, scan_start: e.target.value })} />
            </div>
            <div>
              <label className="label">Included keywords (comma)</label>
              <input className="field" value={gmailForm.included_keywords} onChange={(e) => setGmailForm({ ...gmailForm, included_keywords: e.target.value })} />
            </div>
            <div>
              <label className="label">Excluded keywords (comma)</label>
              <input className="field" value={gmailForm.excluded_keywords} onChange={(e) => setGmailForm({ ...gmailForm, excluded_keywords: e.target.value })} />
            </div>
            <div>
              <label className="label">Ignored senders (comma)</label>
              <input className="field" value={gmailForm.ignored_senders} onChange={(e) => setGmailForm({ ...gmailForm, ignored_senders: e.target.value })} />
            </div>
            <div>
              <label className="label">Ignored companies (comma)</label>
              <input className="field" value={gmailForm.ignored_companies} onChange={(e) => setGmailForm({ ...gmailForm, ignored_companies: e.target.value })} />
            </div>
          </div>
          <button onClick={saveGmailSettings} className="btn btn-primary mt-3">Save scan settings</button>
        </Card>

        {/* Scoring weights */}
        <Card>
          <div className="section-title mb-3">Scoring weights</div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {(Object.keys(weights) as (keyof ScoreBreakdown)[]).map((k) => (
              <div key={k}>
                <label className="label">{k}</label>
                <input
                  type="number"
                  className="field font-mono"
                  value={weights[k]}
                  onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-3">
            <button onClick={() => patchSettings({ score_weights: JSON.stringify(weights) })} className="btn btn-primary" disabled={totalWeight !== 100}>
              Save weights
            </button>
            <span className={`font-mono text-[12px] ${totalWeight === 100 ? "text-emerald-300" : "text-rose-400"}`}>
              total: {totalWeight}/100
            </span>
          </div>
          <div className="mt-4 border-t border-white/5 pt-3 grid gap-2.5 sm:grid-cols-3">
            <div>
              <label className="label">Wake time</label>
              <input type="time" className="field" defaultValue={settings.wake_time} onBlur={(e) => patchSettings({ wake_time: e.target.value })} />
            </div>
            <div>
              <label className="label">Sleep time</label>
              <input type="time" className="field" defaultValue={settings.sleep_time} onBlur={(e) => patchSettings({ sleep_time: e.target.value })} />
            </div>
            <div>
              <label className="label">Default block (min)</label>
              <input type="number" className="field font-mono" defaultValue={settings.block_default_minutes} onBlur={(e) => patchSettings({ block_default_minutes: Number(e.target.value) })} />
            </div>
          </div>
        </Card>

        {/* Reminders */}
        <Card>
          <div className="section-title mb-3">Reminder schedule</div>
          <div className="space-y-2">
            {reminders.map((r) => (
              <div key={r.id} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                <input
                  type="time"
                  className="field shrink-0 !w-[92px] !py-1 font-mono text-[12px]"
                  defaultValue={r.time}
                  onBlur={(e) => patchReminder(r.id, { time: e.target.value })}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold">{r.label}</div>
                  <div className="truncate text-[11px] text-faint">{r.message}</div>
                </div>
                <button
                  onClick={() => patchReminder(r.id, { enabled: r.enabled ? 0 : 1 })}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider ${
                    r.enabled
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-white/10 text-faint"
                  }`}
                >
                  {r.enabled ? "on" : "off"}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            The Cloudflare Worker fires <span className="font-mono">/api/cron/reminders</span> automatically every 5 minutes —
            no setup. Copy is state-aware: it checks what you&apos;ve actually logged before it pings you.
          </p>
        </Card>
      </div>
    </div>
  );
}

function parseWeights(raw: string): ScoreBreakdown {
  try {
    return { jobs: 25, client: 20, project: 20, body: 15, smoking: 10, journal: 10, ...JSON.parse(raw) };
  } catch {
    return { jobs: 25, client: 20, project: 20, body: 15, smoking: 10, journal: 10 };
  }
}
