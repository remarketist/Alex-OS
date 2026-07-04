import { getDb } from "./db";
import { todayStr, addDays } from "./dates";
import { sendTelegramMessage } from "./telegram";

/**
 * Gmail Job Intelligence.
 * Read-only Gmail access (gmail.readonly scope). Never sends, modifies, archives,
 * deletes, or labels email.
 *
 * Modes:
 *  - Real: GMAIL_CLIENT_ID/SECRET/REDIRECT_URI env vars set → full OAuth + API sync.
 *  - Mock: no credentials → "Run demo sync" inserts realistic detections so the whole
 *    pipeline (dedup, review queue, metrics, alerts) is usable before OAuth is wired.
 */

export function gmailEnvConfigured(): boolean {
  return !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REDIRECT_URI);
}

export function gmailAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID || "",
    redirect_uri: process.env.GMAIL_REDIRECT_URI || "",
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GMAIL_CLIENT_ID || "",
      client_secret: process.env.GMAIL_CLIENT_SECRET || "",
      redirect_uri: process.env.GMAIL_REDIRECT_URI || "",
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GMAIL_CLIENT_ID || "",
      client_secret: process.env.GMAIL_CLIENT_SECRET || "",
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const j = (await res.json()) as { access_token: string };
  return j.access_token;
}

// ---- Detection patterns ----

const APPLICATION_PATTERNS = [
  "thank you for applying", "application received", "we received your application",
  "your application has been submitted", "thanks for your interest", "successfully applied",
  "we have received your resume", "your application to",
];

const ATS_SENDERS: [string, string][] = [
  ["greenhouse", "Greenhouse"], ["lever.co", "Lever"], ["ashby", "Ashby"],
  ["myworkday", "Workday"], ["workday", "Workday"], ["bamboohr", "BambooHR"],
  ["smartrecruiters", "SmartRecruiters"], ["jobvite", "Jobvite"],
  ["linkedin", "LinkedIn Jobs"], ["indeed", "Indeed"],
];

const REPLY_PATTERNS: [string, RegExp][] = [
  ["Interview", /interview|we would like to invite you|schedule a call|availability/i],
  ["Assessment", /assessment|take-home|coding challenge|case study/i],
  ["Rejection", /unfortunately|decided not to move forward|other candidates|not to proceed/i],
  ["Recruiter Reply", /recruiter|talent acquisition|hiring team|next steps/i],
  ["Follow-up Needed", /follow.?up|please (?:confirm|reply|respond)/i],
];

export interface DetectedEmail {
  subject: string;
  sender: string;
  date: string; // YYYY-MM-DD
  snippet: string;
  messageId: string;
  threadId: string;
}

export interface Detection {
  kind: "application" | "reply" | "none";
  company: string;
  role: string;
  source: string;
  confidence: number;
  replyType: string;
}

export function classifyEmail(e: DetectedEmail): Detection {
  const text = `${e.subject} ${e.snippet}`.toLowerCase();
  const senderLower = e.sender.toLowerCase();
  const source = ATS_SENDERS.find(([k]) => senderLower.includes(k))?.[1] || "";

  const isApplication = APPLICATION_PATTERNS.some((p) => text.includes(p));
  if (isApplication) {
    const { company, role } = extractCompanyRole(e);
    let confidence = 0.5;
    if (source) confidence += 0.3;
    if (company) confidence += 0.15;
    return { kind: "application", company: company || senderDomain(e.sender), role, source, confidence: Math.min(confidence, 0.98), replyType: "" };
  }

  for (const [type, re] of REPLY_PATTERNS) {
    if (re.test(text)) {
      const { company, role } = extractCompanyRole(e);
      return { kind: "reply", company: company || senderDomain(e.sender), role, source, confidence: 0.6 + (source ? 0.2 : 0), replyType: type };
    }
  }
  return { kind: "none", company: "", role: "", source, confidence: 0, replyType: "" };
}

function extractCompanyRole(e: DetectedEmail): { company: string; role: string } {
  // "Thank you for applying to OLIPOP" / "Your application to Deel" / "Application received — WHOOP"
  const s = e.subject;
  let company = "";
  let role = "";
  const toMatch = s.match(/(?:applying to|application to|application for|interest in)\s+([A-Z][\w .&'-]{1,40})/i);
  if (toMatch) company = toMatch[1].trim().replace(/[!.,]$/, "");
  const dashMatch = s.match(/[—–-]\s*([A-Z][\w .&'-]{1,40})\s*$/);
  if (!company && dashMatch) company = dashMatch[1].trim();
  const roleMatch = s.match(/for (?:the )?(.+?) (?:position|role|opening)/i);
  if (roleMatch) role = roleMatch[1].trim();
  return { company, role };
}

function senderDomain(sender: string): string {
  const m = sender.match(/@([\w.-]+)/);
  if (!m) return sender;
  const domain = m[1].replace(/^(mail|jobs|careers|no-?reply|talent|apply)\./, "");
  const name = domain.split(".")[0] || domain;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ---- Dedup + persistence ----

export function upsertDetection(e: DetectedEmail, d: Detection): "added" | "updated" | "duplicate" | "queued" {
  const db = getDb();
  const conn = db.prepare("SELECT ignored_senders, ignored_companies FROM gmail_connections WHERE id=1").get() as
    | { ignored_senders: string; ignored_companies: string } | undefined;
  const ignoredSenders = (conn?.ignored_senders || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const ignoredCompanies = (conn?.ignored_companies || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (ignoredSenders.some((s) => e.sender.toLowerCase().includes(s))) return "duplicate";
  if (ignoredCompanies.includes(d.company.toLowerCase())) return "duplicate";

  // Dedup: thread id, then message id, then same company+role within 3 days
  const byThread = db.prepare("SELECT id FROM job_applications WHERE gmail_thread_id != '' AND gmail_thread_id = ?").get(e.threadId) as { id: number } | undefined;
  const byMsg = db.prepare("SELECT id FROM job_applications WHERE gmail_message_id != '' AND gmail_message_id = ?").get(e.messageId) as { id: number } | undefined;
  const byCompany = db
    .prepare("SELECT id FROM job_applications WHERE LOWER(company)=LOWER(?) AND (role='' OR LOWER(role)=LOWER(?)) AND ABS(julianday(applied_date)-julianday(?)) <= 3")
    .get(d.company, d.role, e.date) as { id: number } | undefined;

  const existing = byThread || byMsg || (d.kind === "application" ? byCompany : undefined);

  if (d.kind === "reply") {
    // Attach reply to existing application (by thread or company)
    const target = byThread || (db.prepare("SELECT id FROM job_applications WHERE LOWER(company)=LOWER(?) ORDER BY applied_date DESC LIMIT 1").get(d.company) as { id: number } | undefined);
    if (target) {
      // Same reply already processed (same subject on same application) → no-op
      const seen = db.prepare("SELECT id FROM job_application_events WHERE application_id=? AND detail=?").get(target.id, e.subject);
      if (seen) return "duplicate";
      const status = d.replyType === "Interview" ? "interview" : d.replyType === "Assessment" ? "assessment" : d.replyType === "Rejection" ? "rejected" : d.replyType === "Follow-up Needed" ? "followup" : "replied";
      db.prepare("UPDATE job_applications SET status=?, reply_type=?, last_email_date=? WHERE id=?").run(status, d.replyType, e.date, target.id);
      db.prepare("INSERT INTO job_application_events (application_id, type, detail) VALUES (?,?,?)").run(target.id, d.replyType.toLowerCase(), e.subject);
      return "updated";
    }
    return "duplicate";
  }

  if (existing) return "duplicate";

  const reviewState = d.confidence >= 0.8 ? "auto" : "pending";
  db.prepare(
    `INSERT INTO job_applications (company, role, applied_date, source, status, confidence, review_state, email_subject, sender, gmail_message_id, gmail_thread_id, last_email_date)
     VALUES (?,?,?,?,'applied',?,?,?,?,?,?,?)`
  ).run(d.company, d.role, e.date, d.source, d.confidence, reviewState, e.subject, e.sender, e.messageId, e.threadId, e.date);
  return reviewState === "auto" ? "added" : "queued";
}

// ---- Sync ----

export async function runGmailSync(mode: "manual" | "scheduled" | "demo"): Promise<{ scanned: number; detected: number; notes: string }> {
  const db = getDb();
  let scanned = 0;
  let detected = 0;
  let notes = "";

  if (mode === "demo" || !gmailEnvConfigured()) {
    const result = runDemoSync();
    scanned = result.scanned;
    detected = result.detected;
    notes = "Demo sync — mock detections. Connect Gmail for real scanning.";
  } else {
    const conn = db.prepare("SELECT tokens, scan_start, included_keywords, excluded_keywords FROM gmail_connections WHERE id=1").get() as
      | { tokens: string; scan_start: string; included_keywords: string; excluded_keywords: string } | undefined;
    if (!conn?.tokens) return { scanned: 0, detected: 0, notes: "Gmail not connected." };
    const tokens = JSON.parse(conn.tokens) as { refresh_token: string };
    const accessToken = await refreshAccessToken(tokens.refresh_token);
    const after = conn.scan_start || addDays(todayStr(), -30);
    const query = buildGmailQuery(after, conn.included_keywords, conn.excluded_keywords);
    const emails = await fetchGmailMessages(accessToken, query);
    scanned = emails.length;
    for (const e of emails) {
      const d = classifyEmail(e);
      if (d.kind === "none") continue;
      const result = upsertDetection(e, d);
      if (result === "added" || result === "queued") detected++;
      if (result === "updated" && d.replyType && d.replyType !== "Follow-up Needed") {
        await sendTelegramMessage(`Job update detected: ${d.company} — ${d.role || "role"}. Type: ${d.replyType}. Open in Alex OS.`, "job_alert");
      }
    }
    notes = `Query: ${query}`;
    db.prepare("UPDATE gmail_connections SET last_sync=datetime('now') WHERE id=1").run();
  }

  db.prepare("INSERT INTO gmail_sync_runs (mode, scanned, detected, notes) VALUES (?,?,?,?)").run(mode, scanned, detected, notes);
  return { scanned, detected, notes };
}

export function buildGmailQuery(after: string, included: string, excluded: string): string {
  const base = `after:${after.replace(/-/g, "/")} (subject:(application OR applied OR interview) OR from:(greenhouse.io OR lever.co OR ashbyhq.com OR myworkday.com OR bamboohr.com OR smartrecruiters.com OR jobvite.com OR linkedin.com OR indeed.com))`;
  const inc = included ? ` (${included.split(",").map((k) => k.trim()).filter(Boolean).join(" OR ")})` : "";
  const exc = excluded ? " " + excluded.split(",").map((k) => `-"${k.trim()}"`).filter((k) => k !== '-""').join(" ") : "";
  return base + inc + exc;
}

interface GmailApiMessage {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: { name: string; value: string }[] };
}

async function fetchGmailMessages(accessToken: string, query: string): Promise<DetectedEmail[]> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`);
  const list = (await listRes.json()) as { messages?: { id: string; threadId: string }[] };
  const out: DetectedEmail[] = [];
  for (const m of list.messages || []) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!msgRes.ok) continue;
    const msg = (await msgRes.json()) as GmailApiMessage;
    const headers = msg.payload?.headers || [];
    const get = (n: string) => headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value || "";
    const dateMs = msg.internalDate ? parseInt(msg.internalDate, 10) : Date.now();
    out.push({
      subject: get("Subject"),
      sender: get("From"),
      date: new Date(dateMs).toISOString().slice(0, 10),
      snippet: msg.snippet || "",
      messageId: msg.id,
      threadId: msg.threadId,
    });
  }
  return out;
}

/** Demo sync: runs the real classification pipeline over realistic fake emails. */
function runDemoSync(): { scanned: number; detected: number } {
  const today = todayStr();
  const demo: DetectedEmail[] = [
    {
      subject: "Thank you for applying to Ramp!",
      sender: "no-reply@greenhouse.io",
      date: today,
      snippet: "We received your application for the Growth Marketing Manager position and will review it shortly.",
      messageId: `demo-${Date.now()}-1`,
      threadId: `demo-thr-${Date.now()}-1`,
    },
    {
      subject: "Your application has been submitted — Framer",
      sender: "jobs@ashbyhq.com",
      date: today,
      snippet: "Your application to Framer for Performance Marketing Lead has been submitted successfully.",
      messageId: `demo-${Date.now()}-2`,
      threadId: `demo-thr-${Date.now()}-2`,
    },
    {
      subject: "Next steps for your Northbeam application",
      sender: "recruiting@northbeam.io",
      date: today,
      snippet: "We would like to invite you to a 30-minute interview. Please share your availability this week.",
      messageId: `demo-${Date.now()}-3`,
      threadId: "mock-thr-003",
    },
    {
      subject: "Thanks for your interest",
      sender: "careers@somestartup.xyz",
      date: today,
      snippet: "Thanks for your interest in the marketing role. We'll be in touch.",
      messageId: `demo-${Date.now()}-4`,
      threadId: `demo-thr-${Date.now()}-4`,
    },
  ];
  let detected = 0;
  for (const e of demo) {
    const d = classifyEmail(e);
    if (d.kind === "none") continue;
    const result = upsertDetection(e, d);
    if (result !== "duplicate") detected++;
    if (result === "updated" && d.replyType) {
      void sendTelegramMessage(`Job update detected: ${d.company} — ${d.role || "role"}. Type: ${d.replyType}. Open in Alex OS.`, "job_alert");
    }
  }
  return { scanned: demo.length, detected };
}

// ---- Metrics ----

export function jobMetrics() {
  const db = getDb();
  const today = todayStr();
  const count = (from: string, to: string) =>
    (db.prepare("SELECT COUNT(*) as c FROM job_applications WHERE applied_date >= ? AND applied_date <= ? AND review_state NOT IN ('ignored','pending')").get(from, to) as { c: number }).c;
  const manual = (from: string, to: string) =>
    (db.prepare("SELECT COALESCE(SUM(value),0) as c FROM check_ins WHERE type='jobs' AND date >= ? AND date <= ?").get(from, to) as { c: number }).c;

  const sprint = db.prepare("SELECT start_date, end_date FROM sprints WHERE status='active' ORDER BY id DESC LIMIT 1").get() as { start_date: string; end_date: string } | undefined;
  const weekAgo = addDays(today, -6);
  const monthAgo = addDays(today, -29);
  const sprintStart = sprint?.start_date || monthAgo;

  const sprintTotal = count(sprintStart, today) + manual(sprintStart, today);
  const activeDays = (db.prepare("SELECT COUNT(DISTINCT applied_date) as c FROM job_applications WHERE applied_date >= ?").get(sprintStart) as { c: number }).c || 1;

  return {
    today: count(today, today) + manual(today, today),
    yesterday: count(addDays(today, -1), addDays(today, -1)) + manual(addDays(today, -1), addDays(today, -1)),
    week: count(weekAgo, today) + manual(weekAgo, today),
    month: count(monthAgo, today) + manual(monthAgo, today),
    sprint: sprintTotal,
    avgPerActiveDay: Math.round((sprintTotal / activeDays) * 10) / 10,
    pending: (db.prepare("SELECT COUNT(*) as c FROM job_applications WHERE review_state='pending'").get() as { c: number }).c,
  };
}
