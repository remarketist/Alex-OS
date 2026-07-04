import { getDb } from "./db";
import { todayStr, weekStart, addDays, nowTimeStr } from "./dates";
import { computeScore, getDayStats, saveDailyScore, safeJson } from "./scoring";
import { computeAdaptation } from "./adaptation";
import { jobMetrics } from "./gmail";
import type { WorkBlock, Task, DailyPlan, Sprint, WeeklyPlan, WeeklyTargets } from "./types";

/**
 * Hermes-ready service layer.
 * Every function here is a clean, side-effect-scoped entry point that a future
 * agent orchestrator (Hermes) or voice pipeline can call. The web UI and the
 * Telegram webhook use these same functions — one brain, many interfaces.
 */

export function getTodayContext(date = todayStr()) {
  const db = getDb();
  const plan = db.prepare("SELECT * FROM daily_plans WHERE date=?").get(date) as DailyPlan | undefined;
  const blocks = db.prepare("SELECT * FROM work_blocks WHERE date=? ORDER BY sort, start_time").all(date) as WorkBlock[];
  const tasks = db.prepare("SELECT * FROM tasks WHERE scheduled_date=? AND status NOT IN ('killed') ORDER BY priority").all(date) as Task[];
  const stats = getDayStats(date);
  const score = computeScore(date);
  const now = nowTimeStr();
  const activeBlock = blocks.find((b) => b.status === "active") || null;
  const nextBlock = blocks.find((b) => (b.status === "upcoming" || b.status === "rescheduled") && b.end_time > now) || null;
  return { date, plan: plan ?? null, blocks, tasks, stats, score, activeBlock, nextBlock };
}

export function getWeeklySprintContext(date = todayStr()) {
  const db = getDb();
  const ws = weekStart(date);
  const sprint = db.prepare("SELECT * FROM sprints WHERE status='active' ORDER BY id DESC LIMIT 1").get() as Sprint | undefined;
  const weeklyPlan = db.prepare("SELECT * FROM weekly_plans WHERE week_start=? ORDER BY id DESC LIMIT 1").get(ws) as WeeklyPlan | undefined;
  const targets = weeklyPlan ? safeJson<Partial<WeeklyTargets>>(weeklyPlan.targets, {}) : {};

  // Actuals for the week so far
  const from = ws;
  const to = addDays(ws, 6);
  const sum = (type: string) =>
    (db.prepare("SELECT COALESCE(SUM(value),0) as v FROM check_ins WHERE type=? AND date BETWEEN ? AND ?").get(type, from, to) as { v: number }).v;
  const cnt = (type: string) =>
    (db.prepare("SELECT COUNT(*) as v FROM check_ins WHERE type=? AND date BETWEEN ? AND ?").get(type, from, to) as { v: number }).v;
  const gmailApps = (db.prepare("SELECT COUNT(*) as v FROM job_applications WHERE applied_date BETWEEN ? AND ? AND review_state NOT IN ('ignored','pending')").get(from, to) as { v: number }).v;

  const actuals = {
    job_applications: sum("jobs") + gmailApps,
    tailored_applications: sum("tailored"),
    follow_ups: sum("followup"),
    client_hours: Math.round((sum("client_minutes") / 60) * 10) / 10,
    project_hours: Math.round((sum("project_minutes") / 60) * 10) / 10,
    workouts: cnt("workout"),
    walks: cnt("walk"),
    meditations: cnt("meditation"),
    journal_entries: (db.prepare("SELECT COUNT(*) as v FROM journal_entries WHERE date BETWEEN ? AND ?").get(from, to) as { v: number }).v,
    blocks_completed: (db.prepare("SELECT COUNT(*) as v FROM work_blocks WHERE date BETWEEN ? AND ? AND status IN ('completed','shrunk')").get(from, to) as { v: number }).v,
  };

  return { weekStart: ws, sprint: sprint ?? null, weeklyPlan: weeklyPlan ?? null, targets, actuals };
}

export function getKnowledgeBaseContext() {
  const db = getDb();
  return {
    clients: db.prepare("SELECT * FROM clients ORDER BY priority, name").all(),
    projects: db.prepare("SELECT * FROM projects ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium-high' THEN 1 ELSE 2 END, name").all(),
    fitness: db.prepare("SELECT * FROM fitness_profiles WHERE id=1").get() ?? null,
    rules: db.prepare("SELECT * FROM assistant_rules ORDER BY priority, id").all(),
    aliases: db.prepare("SELECT * FROM entity_aliases ORDER BY alias").all(),
  };
}

export function createTaskFromAssistant(input: {
  title: string;
  notes?: string;
  domain?: string;
  entity_type?: string | null;
  entity_id?: number | null;
  entity_name?: string | null;
  priority?: number;
  effort_min?: number;
  due_date?: string | null;
  status?: string;
  scheduled_date?: string | null;
  recurring?: boolean;
}) {
  const db = getDb();
  const r = db
    .prepare(
      `INSERT INTO tasks (title, notes, domain, entity_type, entity_id, entity_name, priority, effort_min, due_date, status, scheduled_date, recurring)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      input.title,
      input.notes ?? "",
      input.domain ?? "backlog",
      input.entity_type ?? null,
      input.entity_id ?? null,
      input.entity_name ?? null,
      input.priority ?? 2,
      input.effort_min ?? 45,
      input.due_date ?? null,
      input.status ?? "inbox",
      input.scheduled_date ?? null,
      input.recurring ? 1 : 0
    );
  return Number(r.lastInsertRowid);
}

export function logCheckIn(type: string, value: number, note = "", source = "app", date = todayStr()) {
  const db = getDb();
  db.prepare("INSERT INTO check_ins (date, type, value, note, source) VALUES (?,?,?,?,?)").run(date, type, value, note, source);
  saveDailyScore(date);
  return computeScore(date);
}

export function updateDailyPlan(date: string, patch: { mission?: string; adaptation_note?: string }) {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM daily_plans WHERE date=?").get(date);
  if (!existing) db.prepare("INSERT INTO daily_plans (date) VALUES (?)").run(date);
  if (patch.mission !== undefined) db.prepare("UPDATE daily_plans SET mission=? WHERE date=?").run(patch.mission, date);
  if (patch.adaptation_note !== undefined) db.prepare("UPDATE daily_plans SET adaptation_note=? WHERE date=?").run(patch.adaptation_note, date);
}

export function generateDailySummary(date = todayStr()) {
  const stats = getDayStats(date);
  const score = computeScore(date);
  const adaptation = computeAdaptation(date);
  saveDailyScore(date, { hard_truth: adaptation.hardTruth, adjustment: adaptation.adjustments.join(" "), mvw: adaptation.mvw });
  return { date, stats, score, adaptation };
}

export function generateWeeklyReview(weekStartDate = weekStart(todayStr())) {
  const db = getDb();
  const from = weekStartDate;
  const to = addDays(weekStartDate, 6);
  const ctx = getWeeklySprintContext(weekStartDate);

  const scores = db.prepare("SELECT date, score, level FROM daily_scores WHERE date BETWEEN ? AND ? ORDER BY score DESC").all(from, to) as { date: string; score: number; level: string }[];
  const best = scores[0];
  const worst = scores[scores.length - 1];
  const derails = db.prepare("SELECT trigger, COUNT(*) as c FROM derail_events WHERE ts BETWEEN ? AND ? GROUP BY trigger ORDER BY c DESC").all(from + " 00:00:00", to + " 23:59:59") as { trigger: string; c: number }[];
  const smokeAvg = (db.prepare("SELECT AVG(daily) as a FROM (SELECT date, SUM(value) as daily FROM check_ins WHERE type='smoke' AND date BETWEEN ? AND ? GROUP BY date)").get(from, to) as { a: number | null }).a;

  const stats = {
    ...ctx.actuals,
    avg_score: scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0,
    smoking_avg: smokeAvg ? Math.round(smokeAvg * 10) / 10 : null,
    gold_days: scores.filter((s) => s.level === "gold").length,
    silver_days: scores.filter((s) => s.level === "silver").length,
    bronze_days: scores.filter((s) => s.level === "bronze").length,
    below_days: scores.filter((s) => s.level === "below").length,
  };

  // Deterministic recommendations from targets vs actuals
  const t = ctx.targets;
  const a = ctx.actuals;
  const doubleDown: string[] = [];
  const kill: string[] = [];
  const nextWeek: string[] = [];
  if (t.job_applications && a.job_applications >= t.job_applications) doubleDown.push("Morning job sprints are working — keep them first.");
  else nextWeek.push(`Job gap: ${a.job_applications}/${t.job_applications ?? "?"} — move job sprint to 08:00 and shrink other morning commitments.`);
  if (t.client_hours && a.client_hours < t.client_hours * 0.7) nextWeek.push(`Client hours short (${a.client_hours}/${t.client_hours}) — protect one 2-hour client block daily.`);
  else if (t.client_hours) doubleDown.push("Client delivery held. Same structure next week.");
  if (t.project_hours && a.project_hours < t.project_hours * 0.5) kill.push("Late-night project sessions that never happen — schedule 45-minute daytime minimums instead.");
  if (a.walks >= 5) doubleDown.push("Daily walks stuck — they're the cheapest recovery you have.");
  if (stats.below_days >= 2) nextWeek.push("Two or more collapsed days — add a Bronze fallback plan to every day.");

  const review = {
    week_start: weekStartDate,
    stats,
    best_day: best?.date ?? "",
    worst_day: worst?.date ?? "",
    derail_trigger: derails[0]?.trigger ?? "",
    double_down: doubleDown.join(" ") || "Keep the current structure — it produced the week's wins.",
    kill: kill.join(" ") || "Nothing to kill. Watch for fake-productive planning sessions.",
    next_week: nextWeek.join(" ") || "Raise the job target by 10%. Ship one project asset.",
  };

  db.prepare(
    `INSERT INTO weekly_reviews (week_start, stats, best_day, worst_day, derail_trigger, double_down, kill, next_week)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(week_start) DO UPDATE SET stats=excluded.stats, best_day=excluded.best_day, worst_day=excluded.worst_day,
       derail_trigger=excluded.derail_trigger, double_down=excluded.double_down, kill=excluded.kill, next_week=excluded.next_week`
  ).run(review.week_start, JSON.stringify(review.stats), review.best_day, review.worst_day, review.derail_trigger, review.double_down, review.kill, review.next_week);

  return review;
}

export function getStreaks() {
  const db = getDb();
  const today = todayStr();
  const streak = (predicate: (date: string) => boolean): number => {
    let s = 0;
    for (let i = 0; i < 60; i++) {
      const d = addDays(today, -i - (i === 0 ? 0 : 0));
      if (i === 0 && !predicate(d)) continue; // today not done yet doesn't break streak
      if (predicate(d)) s++;
      else if (i > 0) break;
    }
    return s;
  };
  const hasCheckin = (type: string) => (date: string) =>
    ((db.prepare("SELECT COUNT(*) as c FROM check_ins WHERE date=? AND type=?").get(date, type) as { c: number }).c) > 0;
  const hasJournal = (date: string) =>
    ((db.prepare("SELECT COUNT(*) as c FROM journal_entries WHERE date=?").get(date) as { c: number }).c) > 0;
  return {
    walk: streak(hasCheckin("walk")),
    workout: streak(hasCheckin("workout")),
    meditation: streak(hasCheckin("meditation")),
    smokeLogged: streak(hasCheckin("smoke")),
    journal: streak(hasJournal),
    jobs: streak((d) => {
      const manual = (db.prepare("SELECT COALESCE(SUM(value),0) as v FROM check_ins WHERE date=? AND type='jobs'").get(d) as { v: number }).v;
      const gmail = (db.prepare("SELECT COUNT(*) as c FROM job_applications WHERE applied_date=? AND review_state NOT IN ('ignored','pending')").get(d) as { c: number }).c;
      return manual + gmail > 0;
    }),
  };
}

export { jobMetrics };
