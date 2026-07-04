import { getDb } from "./db";
import type { DayLevel, ScoreBreakdown } from "./types";

export interface DayStats {
  date: string;
  jobs: number;
  tailored: number;
  clientMinutes: number;
  projectMinutes: number;
  walk: boolean;
  workout: boolean;
  meditation: boolean;
  smokeCount: number | null; // null = not logged
  smokeTarget: number;
  journalDone: boolean;
  mood: number | null;
  energy: number | null;
  blocksCompleted: number;
  blocksTotal: number;
}

export function getDayStats(date: string): DayStats {
  const db = getDb();
  const rows = db
    .prepare("SELECT type, SUM(value) as total, COUNT(*) as n FROM check_ins WHERE date = ? GROUP BY type")
    .all(date) as { type: string; total: number; n: number }[];
  const map = new Map(rows.map((r) => [r.type, r]));

  // Gmail-detected applications also count toward jobs
  const gmailApps = db
    .prepare("SELECT COUNT(*) as c FROM job_applications WHERE applied_date = ? AND review_state != 'ignored' AND review_state != 'pending'")
    .get(date) as { c: number };

  const journal = db
    .prepare("SELECT COUNT(*) as c FROM journal_entries WHERE date = ?")
    .get(date) as { c: number };

  const blocks = db
    .prepare("SELECT status, COUNT(*) as c FROM work_blocks WHERE date = ? GROUP BY status")
    .all(date) as { status: string; c: number }[];
  const blocksCompleted = blocks.filter((b) => b.status === "completed" || b.status === "shrunk").reduce((a, b) => a + b.c, 0);
  const blocksTotal = blocks.reduce((a, b) => a + b.c, 0);

  const fitness = db.prepare("SELECT smoking_daily_target FROM fitness_profiles WHERE id=1").get() as { smoking_daily_target: number } | undefined;

  const smokeRow = map.get("smoke");
  const lastMood = db.prepare("SELECT value FROM check_ins WHERE date=? AND type='mood' ORDER BY id DESC LIMIT 1").get(date) as { value: number } | undefined;
  const lastEnergy = db.prepare("SELECT value FROM check_ins WHERE date=? AND type='energy' ORDER BY id DESC LIMIT 1").get(date) as { value: number } | undefined;

  return {
    date,
    jobs: (map.get("jobs")?.total ?? 0) + gmailApps.c,
    tailored: map.get("tailored")?.total ?? 0,
    clientMinutes: map.get("client_minutes")?.total ?? 0,
    projectMinutes: map.get("project_minutes")?.total ?? 0,
    walk: (map.get("walk")?.n ?? 0) > 0,
    workout: (map.get("workout")?.n ?? 0) > 0 || (map.get("stretch")?.n ?? 0) > 0,
    meditation: (map.get("meditation")?.n ?? 0) > 0,
    smokeCount: smokeRow ? smokeRow.total : null,
    smokeTarget: fitness?.smoking_daily_target ?? 10,
    journalDone: journal.c > 0,
    mood: lastMood?.value ?? null,
    energy: lastEnergy?.value ?? null,
    blocksCompleted,
    blocksTotal,
  };
}

export interface ScoreResult {
  score: number;
  level: DayLevel;
  breakdown: ScoreBreakdown;
  weights: ScoreBreakdown;
}

export function computeScore(date: string): ScoreResult {
  const db = getDb();
  const s = getDayStats(date);
  const settings = db.prepare("SELECT score_weights FROM settings WHERE id=1").get() as { score_weights: string } | undefined;
  const w: ScoreBreakdown = {
    jobs: 25, client: 20, project: 20, body: 15, smoking: 10, journal: 10,
    ...(settings ? safeJson(settings.score_weights, {}) : {}),
  };

  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);

  // Jobs: silver target = 5 applications; tailored counts extra
  const jobs = clamp(((s.jobs + s.tailored * 0.5) / 5) * w.jobs, w.jobs);
  // Client: silver = 120 minutes
  const client = clamp((s.clientMinutes / 120) * w.client, w.client);
  // Project: silver = 90 minutes
  const project = clamp((s.projectMinutes / 90) * w.project, w.project);
  // Body: walk ~half, workout ~third, meditation rest
  const body = clamp(
    (s.walk ? w.body * 0.45 : 0) + (s.workout ? w.body * 0.35 : 0) + (s.meditation ? w.body * 0.2 : 0),
    w.body
  );
  // Smoking: logged = half, within target = other half
  const smoking =
    s.smokeCount === null
      ? 0
      : clamp(w.smoking * 0.5 + (s.smokeCount <= s.smokeTarget ? w.smoking * 0.5 : 0), w.smoking);
  const journal = s.journalDone ? w.journal : 0;

  const breakdown: ScoreBreakdown = {
    jobs: Math.round(jobs),
    client: Math.round(client),
    project: Math.round(project),
    body: Math.round(body),
    smoking: Math.round(smoking),
    journal: Math.round(journal),
  };
  const score = Math.round(jobs + client + project + body + smoking + journal);

  return { score, level: computeLevel(s), breakdown, weights: w };
}

export function computeLevel(s: DayStats): DayLevel {
  const bronze =
    s.jobs >= 2 &&
    (s.clientMinutes >= 60 || s.blocksCompleted >= 1) &&
    (s.walk || s.workout) &&
    s.smokeCount !== null;
  const silver =
    s.jobs >= 5 &&
    s.clientMinutes >= 120 &&
    s.projectMinutes >= 90 &&
    (s.walk || s.workout) &&
    s.smokeCount !== null &&
    s.smokeCount <= s.smokeTarget &&
    s.journalDone;
  const gold =
    s.jobs >= 8 &&
    s.clientMinutes >= 180 &&
    s.projectMinutes >= 120 &&
    (s.walk || s.workout) &&
    s.smokeCount !== null &&
    s.smokeCount < s.smokeTarget &&
    s.journalDone;
  if (gold) return "gold";
  if (silver) return "silver";
  if (bronze) return "bronze";
  return "below";
}

export function saveDailyScore(date: string, extras?: { hard_truth?: string; adjustment?: string; mvw?: string }) {
  const db = getDb();
  const r = computeScore(date);
  db.prepare(
    `INSERT INTO daily_scores (date, score, level, breakdown, hard_truth, adjustment, mvw)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(date) DO UPDATE SET score=excluded.score, level=excluded.level, breakdown=excluded.breakdown,
       hard_truth=COALESCE(NULLIF(excluded.hard_truth,''), daily_scores.hard_truth),
       adjustment=COALESCE(NULLIF(excluded.adjustment,''), daily_scores.adjustment),
       mvw=COALESCE(NULLIF(excluded.mvw,''), daily_scores.mvw)`
  ).run(date, r.score, r.level, JSON.stringify(r.breakdown), extras?.hard_truth ?? "", extras?.adjustment ?? "", extras?.mvw ?? "");
  return r;
}

export function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
