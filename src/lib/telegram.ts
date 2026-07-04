import { getDb } from "./db";
import { todayStr, nowTimeStr } from "./dates";
import { computeScore, getDayStats, saveDailyScore } from "./scoring";

/**
 * Telegram integration.
 * Requires TELEGRAM_BOT_TOKEN env var + chat id (settings or TELEGRAM_CHAT_ID env).
 * Without a token, messages are logged to the DB with status 'mock' so the whole
 * pipeline is testable before the bot exists.
 */

export function getTelegramConfig() {
  const db = getDb();
  const settings = db.prepare("SELECT telegram_chat_id, telegram_enabled FROM settings WHERE id=1").get() as
    | { telegram_chat_id: string; telegram_enabled: number }
    | undefined;
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = settings?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID || "";
  return { token, chatId, enabled: !!settings?.telegram_enabled, configured: !!(token && chatId) };
}

/** Hermes-ready: send a message to Alex via Telegram (or log as mock if unconfigured). */
export async function sendTelegramMessage(text: string, command = ""): Promise<{ ok: boolean; mock: boolean; error?: string }> {
  const db = getDb();
  const { token, chatId, configured } = getTelegramConfig();
  if (!configured) {
    db.prepare("INSERT INTO telegram_messages (direction, text, command, status) VALUES ('out', ?, ?, 'mock')").run(text, command);
    return { ok: true, mock: true };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const ok = res.ok;
    db.prepare("INSERT INTO telegram_messages (direction, text, command, status) VALUES ('out', ?, ?, ?)").run(
      text, command, ok ? "sent" : "failed"
    );
    if (!ok) {
      const body = await res.text();
      return { ok: false, mock: false, error: `Telegram API ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true, mock: false };
  } catch (e) {
    db.prepare("INSERT INTO telegram_messages (direction, text, command, status) VALUES ('out', ?, ?, 'failed')").run(text, command);
    return { ok: false, mock: false, error: String(e) };
  }
}

export interface CommandResult {
  reply: string;
  handled: boolean;
}

/**
 * Parse and execute an inbound command (from Telegram webhook, or later from voice).
 * Natural-language friendly: "jobs 3", "smoked 2", "journal rough day but shipped".
 */
export function handleCommand(raw: string): CommandResult {
  const db = getDb();
  const text = raw.trim();
  const lower = text.toLowerCase();
  const today = todayStr();
  const log = (type: string, value: number, note = "") =>
    db.prepare("INSERT INTO check_ins (date, type, value, note, source) VALUES (?,?,?,?,'telegram')").run(today, type, value, note);

  const numArg = (cmd: string): number | null => {
    const m = lower.match(new RegExp(`^${cmd}\\s+(\\d+(?:\\.\\d+)?)`));
    return m ? parseFloat(m[1]) : null;
  };

  // today — mission + blocks
  if (lower === "today") {
    const plan = db.prepare("SELECT mission FROM daily_plans WHERE date=?").get(today) as { mission: string } | undefined;
    const blocks = db.prepare("SELECT name, start_time, status FROM work_blocks WHERE date=? ORDER BY sort").all(today) as { name: string; start_time: string; status: string }[];
    const lines = blocks.map((b) => `${b.status === "completed" ? "✓" : b.status === "active" ? "▶" : "·"} ${b.start_time} ${b.name}`);
    return { handled: true, reply: `Mission: ${plan?.mission || "No plan set. Open Alex OS and build the day."}\n${lines.join("\n")}` };
  }

  // next — next upcoming block
  if (lower === "next") {
    const now = nowTimeStr();
    const next = db.prepare("SELECT name, start_time, goal FROM work_blocks WHERE date=? AND status IN ('upcoming','rescheduled') AND end_time > ? ORDER BY start_time LIMIT 1").get(today, now) as
      | { name: string; start_time: string; goal: string } | undefined;
    if (!next) return { handled: true, reply: "No blocks left today. Close the day: journal + score." };
    return { handled: true, reply: `Next: ${next.name} at ${next.start_time}. Goal: ${next.goal} Reply START when you begin.` };
  }

  // start — activate current/next block
  if (lower === "start") {
    const now = nowTimeStr();
    const block = db.prepare("SELECT id, name FROM work_blocks WHERE date=? AND status IN ('upcoming','rescheduled') AND end_time > ? ORDER BY start_time LIMIT 1").get(today, now) as { id: number; name: string } | undefined;
    if (!block) return { handled: true, reply: "Nothing to start. Day's blocks are done or missed. Add one in Alex OS if needed." };
    db.prepare("UPDATE work_blocks SET status='active' WHERE id=?").run(block.id);
    return { handled: true, reply: `${block.name} is live. No negotiation. Report completion after.` };
  }

  // done — complete active block
  if (lower === "done") {
    const block = db.prepare("SELECT id, name, start_time, end_time FROM work_blocks WHERE date=? AND status='active' ORDER BY start_time LIMIT 1").get(today) as
      | { id: number; name: string; start_time: string; end_time: string } | undefined;
    if (!block) return { handled: true, reply: "No active block. Reply START to begin the next one." };
    db.prepare("UPDATE work_blocks SET status='completed' WHERE id=?").run(block.id);
    const score = computeScore(today);
    return { handled: true, reply: `${block.name} logged. Day score: ${score.score}/100 (${score.level}). Next rep.` };
  }

  // jobs N / tailored N / client N (minutes) / project N (minutes)
  const jobs = numArg("jobs");
  if (jobs !== null) {
    log("jobs", jobs);
    const s = getDayStats(today);
    return { handled: true, reply: `${jobs} application${jobs === 1 ? "" : "s"} logged. ${s.jobs} today total.` };
  }
  const tailored = numArg("tailored");
  if (tailored !== null) {
    log("tailored", tailored);
    return { handled: true, reply: `${tailored} tailored application${tailored === 1 ? "" : "s"} logged. That's the high-leverage kind.` };
  }
  const client = numArg("client");
  if (client !== null) {
    log("client_minutes", client);
    return { handled: true, reply: `${client} client minutes logged.` };
  }
  const project = numArg("project");
  if (project !== null) {
    log("project_minutes", project);
    return { handled: true, reply: `${project} project minutes logged. The escape gets built in these blocks.` };
  }

  // habit confirmations
  if (/^workout( done)?$/.test(lower)) { log("workout", 1); return { handled: true, reply: "Workout logged." }; }
  if (/^walk( done)?$/.test(lower)) { log("walk", 1); return { handled: true, reply: "Walk logged." }; }
  if (/^meditation( done)?$|^meditated$/.test(lower)) { log("meditation", 1); return { handled: true, reply: "Meditation logged." }; }

  // smoked N
  const smoked = numArg("smoked") ?? numArg("smoke");
  if (smoked !== null) {
    log("smoke", smoked);
    const s = getDayStats(today);
    const over = s.smokeCount !== null && s.smokeCount > s.smokeTarget;
    return { handled: true, reply: `Logged. ${s.smokeCount} today, target ${s.smokeTarget}.${over ? " Over target — no-smoking-before rule kicks in tomorrow morning." : ""}` };
  }

  // mood N / energy N
  const mood = numArg("mood");
  if (mood !== null) { log("mood", mood); return { handled: true, reply: `Mood ${mood}/10 noted.` }; }
  const energy = numArg("energy");
  if (energy !== null) { log("energy", energy); return { handled: true, reply: `Energy ${energy}/10 noted.` }; }

  // journal <text>
  const jm = text.match(/^journal\s+(.+)/i);
  if (jm) {
    db.prepare(
      `INSERT INTO journal_entries (date, one_truth) VALUES (?,?)
       ON CONFLICT(date) DO UPDATE SET one_truth = journal_entries.one_truth || CASE WHEN journal_entries.one_truth='' THEN '' ELSE ' — ' END || excluded.one_truth`
    ).run(today, jm[1]);
    saveDailyScore(today);
    return { handled: true, reply: "Journal saved." };
  }

  // derail
  if (lower === "derail" || lower === "derailing" || lower === "i'm derailing") {
    db.prepare("INSERT INTO derail_events (trigger, reset_choice) VALUES ('telegram', '')").run();
    return {
      handled: true,
      reply: "Stop. You're not solving your life right now. Pick one reset: (a) 10-minute walk, (b) 25-minute sprint, (c) shower, (d) write what you're avoiding. Reply a/b/c/d.",
    };
  }
  if (/^[abcd]$/.test(lower)) {
    const choices: Record<string, string> = { a: "10-minute walk", b: "25-minute work sprint", c: "Shower/reset", d: "Write what I'm avoiding" };
    const last = db.prepare("SELECT id FROM derail_events WHERE reset_choice='' ORDER BY id DESC LIMIT 1").get() as { id: number } | undefined;
    if (last) {
      db.prepare("UPDATE derail_events SET reset_choice=? WHERE id=?").run(choices[lower], last.id);
      return { handled: true, reply: `${choices[lower]}. Go now. When it's done, start the smallest next block. Reply DONE after.` };
    }
  }

  // score
  if (lower === "score") {
    const r = computeScore(today);
    const s = getDayStats(today);
    return {
      handled: true,
      reply: `Score: ${r.score}/100 — ${r.level.toUpperCase()}.\nJobs ${s.jobs} · Client ${s.clientMinutes}m · Project ${s.projectMinutes}m · Smoking ${s.smokeCount ?? "not logged"}/${s.smokeTarget}.`,
    };
  }

  return {
    handled: false,
    reply: "Commands: today, next, start, done, jobs N, tailored N, client N, project N, workout done, walk done, meditation done, smoked N, journal TEXT, mood N, energy N, derail, score.",
  };
}

/** Compute which reminders are due in the current minute window (used by the cron route). */
export function dueReminders(windowMinutes = 5) {
  const db = getDb();
  const now = new Date();
  const dow = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const rows = db.prepare("SELECT * FROM reminders WHERE enabled=1").all() as { id: number; time: string; label: string; message: string; days: string }[];
  return rows.filter((r) => {
    let days: number[] = [];
    try { days = JSON.parse(r.days); } catch { days = [0, 1, 2, 3, 4, 5, 6]; }
    if (!days.includes(dow)) return false;
    const [h, m] = r.time.split(":").map(Number);
    const t = h * 60 + m;
    return t >= nowMin - windowMinutes && t <= nowMin;
  });
}

/** State-aware reminder copy: checks reality before nagging. */
export function stateAwareReminder(label: string, fallback: string): string {
  const s = getDayStats(todayStr());
  const l = label.toLowerCase();
  if (l.includes("job")) {
    if (s.jobs === 0) return "No applications logged yet. Start one clean application now. Reply START.";
    return `${s.jobs} applications in. Target is 5. Keep the streak — reply START for the next rep.`;
  }
  if (l.includes("client")) {
    if (s.clientMinutes === 0) return "Zero client minutes so far. Protect the block. Start now, report after.";
    return `${s.clientMinutes} client minutes logged. Finish the deliverable, then close the block.`;
  }
  if (l.includes("project")) {
    if (s.projectMinutes === 0) return "Your own project gets 90 minutes today. This is how the escape gets built. Start.";
    return `${s.projectMinutes} project minutes in. One more push to hit 90.`;
  }
  if (l.includes("body")) {
    if (!s.walk && !s.workout) return "Body minimum: 10 push-ups, 5 minutes stretch, 10-minute walk. Shrink it if needed, but don't skip it.";
    return "Body already moved today. A second walk buys back the evening.";
  }
  if (l.includes("review") || l.includes("evening")) {
    if (!s.journalDone) return "Close the day. 5 lines in the journal, score the day, set tomorrow's first block.";
    return "Journal done. Check the score and set tomorrow's first block.";
  }
  return fallback;
}
