import { q, batchAll } from "./db";
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

export async function getTodayContext(date = todayStr()) {
  const [planR, blocksR, tasksR] = await batchAll([
    { sql: "SELECT * FROM daily_plans WHERE date=?", args: [date] },
    { sql: "SELECT * FROM work_blocks WHERE date=? ORDER BY sort, start_time", args: [date] },
    { sql: "SELECT * FROM tasks WHERE scheduled_date=? AND status NOT IN ('killed') ORDER BY priority", args: [date] },
  ]);
  const plan = planR[0] as unknown as DailyPlan | undefined;
  const blocks = blocksR as unknown as WorkBlock[];
  const tasks = tasksR as unknown as Task[];
  const stats = await getDayStats(date);
  const score = await computeScore(date, stats);
  const now = nowTimeStr();
  const activeBlock = blocks.find((b) => b.status === "active") || null;
  const nextBlock = blocks.find((b) => (b.status === "upcoming" || b.status === "rescheduled") && b.end_time > now) || null;
  return { date, plan: plan ?? null, blocks, tasks, stats, score, activeBlock, nextBlock };
}

export async function getWeeklySprintContext(date = todayStr()) {
  const ws = weekStart(date);
  const sprint = await q("SELECT * FROM sprints WHERE status='active' ORDER BY id DESC LIMIT 1").get<Sprint>();
  const weeklyPlan = await q("SELECT * FROM weekly_plans WHERE week_start=? ORDER BY id DESC LIMIT 1").get<WeeklyPlan>(ws);
  const targets = weeklyPlan ? safeJson<Partial<WeeklyTargets>>(weeklyPlan.targets, {}) : {};

  const from = ws;
  const to = addDays(ws, 6);
  // One round-trip for all weekly aggregates
  const [checkR, gmailR, journalR, blocksR] = await batchAll([
    { sql: "SELECT type, SUM(value) as total, COUNT(*) as n FROM check_ins WHERE date BETWEEN ? AND ? GROUP BY type", args: [from, to] },
    { sql: "SELECT COUNT(*) as v FROM job_applications WHERE applied_date BETWEEN ? AND ? AND review_state NOT IN ('ignored','pending')", args: [from, to] },
    { sql: "SELECT COUNT(*) as v FROM journal_entries WHERE date BETWEEN ? AND ?", args: [from, to] },
    { sql: "SELECT COUNT(*) as v FROM work_blocks WHERE date BETWEEN ? AND ? AND status IN ('completed','shrunk')", args: [from, to] },
  ]);
  const byType = new Map((checkR as unknown as { type: string; total: number; n: number }[]).map((r) => [r.type, r]));
  const sum = (type: string) => Number(byType.get(type)?.total ?? 0);
  const cnt = (type: string) => Number(byType.get(type)?.n ?? 0);
  const gmailApps = Number((gmailR[0] as { v: number } | undefined)?.v ?? 0);

  const actuals = {
    job_applications: sum("jobs") + gmailApps,
    tailored_applications: sum("tailored"),
    follow_ups: sum("followup"),
    client_hours: Math.round((sum("client_minutes") / 60) * 10) / 10,
    project_hours: Math.round((sum("project_minutes") / 60) * 10) / 10,
    workouts: cnt("workout"),
    walks: cnt("walk"),
    meditations: cnt("meditation"),
    journal_entries: Number((journalR[0] as { v: number } | undefined)?.v ?? 0),
    blocks_completed: Number((blocksR[0] as { v: number } | undefined)?.v ?? 0),
  };

  return { weekStart: ws, sprint: sprint ?? null, weeklyPlan: weeklyPlan ?? null, targets, actuals };
}

export async function getKnowledgeBaseContext() {
  return {
    clients: await q("SELECT * FROM clients ORDER BY priority, name").all<import("./types").Client>(),
    projects: await q("SELECT * FROM projects ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium-high' THEN 1 ELSE 2 END, name").all<import("./types").Project>(),
    fitness: (await q("SELECT * FROM fitness_profiles WHERE id=1").get<import("./types").FitnessProfile>()) ?? null,
    rules: await q("SELECT * FROM assistant_rules ORDER BY priority, id").all<import("./types").AssistantRule>(),
    aliases: await q("SELECT * FROM entity_aliases ORDER BY alias").all<import("./types").EntityAlias>(),
  };
}

export async function createTaskFromAssistant(input: {
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
}): Promise<number> {
  const r = await q(
    `INSERT INTO tasks (title, notes, domain, entity_type, entity_id, entity_name, priority, effort_min, due_date, status, scheduled_date, recurring)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
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
  return r.lastInsertRowid;
}

export async function logCheckIn(type: string, value: number, note = "", source = "app", date = todayStr()) {
  await q("INSERT INTO check_ins (date, type, value, note, source) VALUES (?,?,?,?,?)").run(date, type, value, note, source);
  return saveDailyScore(date);
}

export async function updateDailyPlan(date: string, patch: { mission?: string; adaptation_note?: string }) {
  const existing = await q("SELECT id FROM daily_plans WHERE date=?").get(date);
  if (!existing) await q("INSERT INTO daily_plans (date) VALUES (?)").run(date);
  if (patch.mission !== undefined) await q("UPDATE daily_plans SET mission=? WHERE date=?").run(patch.mission, date);
  if (patch.adaptation_note !== undefined) await q("UPDATE daily_plans SET adaptation_note=? WHERE date=?").run(patch.adaptation_note, date);
}

export async function generateDailySummary(date = todayStr()) {
  const stats = await getDayStats(date);
  const adaptation = await computeAdaptation(date);
  const score = await saveDailyScore(date, {
    hard_truth: adaptation.hardTruth,
    adjustment: adaptation.adjustments.join(" "),
    mvw: adaptation.mvw,
  });
  return { date, stats, score, adaptation };
}

export async function generateWeeklyReview(weekStartDate = weekStart(todayStr())) {
  const from = weekStartDate;
  const to = addDays(weekStartDate, 6);
  const ctx = await getWeeklySprintContext(weekStartDate);

  const scores = await q("SELECT date, score, level FROM daily_scores WHERE date BETWEEN ? AND ? ORDER BY score DESC").all<{
    date: string;
    score: number;
    level: string;
  }>(from, to);
  const best = scores[0];
  const worst = scores[scores.length - 1];
  const derails = await q(
    "SELECT trigger, COUNT(*) as c FROM derail_events WHERE ts BETWEEN ? AND ? GROUP BY trigger ORDER BY c DESC"
  ).all<{ trigger: string; c: number }>(from + " 00:00:00", to + " 23:59:59");
  const smokeAvg = (
    await q(
      "SELECT AVG(daily) as a FROM (SELECT date, SUM(value) as daily FROM check_ins WHERE type='smoke' AND date BETWEEN ? AND ? GROUP BY date)"
    ).get<{ a: number | null }>(from, to)
  )?.a;

  const stats = {
    ...ctx.actuals,
    avg_score: scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0,
    smoking_avg: smokeAvg ? Math.round(Number(smokeAvg) * 10) / 10 : null,
    gold_days: scores.filter((s) => s.level === "gold").length,
    silver_days: scores.filter((s) => s.level === "silver").length,
    bronze_days: scores.filter((s) => s.level === "bronze").length,
    below_days: scores.filter((s) => s.level === "below").length,
  };

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

  await q(
    `INSERT INTO weekly_reviews (week_start, stats, best_day, worst_day, derail_trigger, double_down, kill, next_week)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(week_start) DO UPDATE SET stats=excluded.stats, best_day=excluded.best_day, worst_day=excluded.worst_day,
       derail_trigger=excluded.derail_trigger, double_down=excluded.double_down, kill=excluded.kill, next_week=excluded.next_week`
  ).run(review.week_start, JSON.stringify(review.stats), review.best_day, review.worst_day, review.derail_trigger, review.double_down, review.kill, review.next_week);

  return review;
}

export async function getStreaks() {
  const today = todayStr();

  // Pull the last 60 days of relevant activity in ONE round-trip, then compute in memory.
  const from = addDays(today, -60);
  const [checkinsR, journalsR, gmailDaysR] = await batchAll([
    { sql: "SELECT DISTINCT date, type FROM check_ins WHERE date >= ?", args: [from] },
    { sql: "SELECT date FROM journal_entries WHERE date >= ?", args: [from] },
    { sql: "SELECT DISTINCT applied_date as date FROM job_applications WHERE applied_date >= ? AND review_state NOT IN ('ignored','pending')", args: [from] },
  ]);
  const checkins = checkinsR as unknown as { date: string; type: string }[];
  const journals = journalsR as unknown as { date: string }[];
  const gmailDays = gmailDaysR as unknown as { date: string }[];

  const byType = new Map<string, Set<string>>();
  for (const c of checkins) {
    if (!byType.has(c.type)) byType.set(c.type, new Set());
    byType.get(c.type)!.add(c.date);
  }
  const journalDays = new Set(journals.map((j) => j.date));
  const jobDays = new Set([...(byType.get("jobs") ?? []), ...gmailDays.map((g) => g.date)]);

  const streak = (has: (date: string) => boolean): number => {
    let s = 0;
    for (let i = 0; i < 60; i++) {
      const d = addDays(today, -i);
      if (i === 0 && !has(d)) continue; // today not done yet doesn't break streak
      if (has(d)) s++;
      else if (i > 0) break;
    }
    return s;
  };
  const hasType = (type: string) => (date: string) => byType.get(type)?.has(date) ?? false;

  return {
    walk: streak(hasType("walk")),
    workout: streak(hasType("workout")),
    meditation: streak(hasType("meditation")),
    smokeLogged: streak(hasType("smoke")),
    journal: streak((d) => journalDays.has(d)),
    jobs: streak((d) => jobDays.has(d)),
  };
}

export { jobMetrics };
