import { q } from "./db";
import { parseMessyInput, type ParsedTask } from "./parser";
import { addDays, dayName } from "./dates";
import { safeJson } from "./scoring";
import type { WeeklyTargets } from "./types";

export interface ProposedBlock {
  name: string;
  domain: string;
  entity_type: string | null;
  entity_id: number | null;
  start_time: string;
  end_time: string;
  goal: string;
  completion_criteria: string;
  reminder_copy: string;
}

export interface ProposedDay {
  date: string;
  mission: string;
  blocks: ProposedBlock[];
  tasks: ParsedTask[];
}

export interface ProposedPlan {
  week_start: string;
  targets: WeeklyTargets;
  days: ProposedDay[];
  kb_suggestions: string[];
}

export function defaultTargets(): WeeklyTargets {
  return {
    job_applications: 35,
    tailored_applications: 6,
    follow_ups: 5,
    client_hours: 14,
    client_deliverables: 8,
    project_hours: 8,
    shipped_assets: 1,
    workouts: 4,
    walks: 6,
    meditations: 5,
    smoking_limit: 10,
    journal_entries: 6,
  };
}

/** Knowledge-base-driven suggestions for what this week should include. */
export async function kbSuggestions(): Promise<string[]> {
  const out: string[] = [];
  const clients = await q("SELECT name, weekly_target_hours, recurring_deliverables FROM clients WHERE active=1 ORDER BY priority").all<{
    name: string;
    weekly_target_hours: number;
    recurring_deliverables: string;
  }>();
  for (const c of clients) {
    const dels = safeJson<string[]>(c.recurring_deliverables, []).slice(0, 2).join(", ");
    out.push(`${c.name}: ${c.weekly_target_hours}h target — ${dels || "recurring work"}`);
  }
  const projects = await q(
    "SELECT name, weekly_block_target, next_actions FROM projects WHERE status='active' ORDER BY CASE priority WHEN 'high' THEN 0 ELSE 1 END"
  ).all<{ name: string; weekly_block_target: number; next_actions: string }>();
  for (const p of projects.slice(0, 3)) {
    out.push(`${p.name}: ${p.weekly_block_target} blocks — ${p.next_actions || "next milestone"}`);
  }
  const fitness = await q("SELECT preferred_habits, smoking_daily_target FROM fitness_profiles WHERE id=1").get<{
    preferred_habits: string;
    smoking_daily_target: number;
  }>();
  if (fitness) {
    out.push(`Body: ${fitness.preferred_habits}`);
    out.push(`Smoking: hold the line at ≤${fitness.smoking_daily_target}/day`);
  }
  return out;
}

/** Generate the full proposed weekly plan from messy input + knowledge base. */
export async function generateWeeklyPlan(messyInput: string, weekStartDate: string): Promise<ProposedPlan> {
  const parsed = await parseMessyInput(messyInput);
  const targets = defaultTargets();

  const fitness = await q("SELECT smoking_daily_target FROM fitness_profiles WHERE id=1").get<{ smoking_daily_target: number }>();
  if (fitness) targets.smoking_limit = fitness.smoking_daily_target;

  // Sort: priority first, then effort descending (big rocks early in the week)
  const workTasks = parsed
    .filter((t) => ["client", "project", "jobs", "admin"].includes(t.domain))
    .sort((a, b) => a.priority - b.priority || b.effort_min - a.effort_min);

  // Distribute across Mon-Fri primarily; capacity ~3 scheduled tasks/day
  const days: ProposedDay[] = [];
  const buckets: ParsedTask[][] = [[], [], [], [], [], [], []];
  let di = 0;
  for (const t of workTasks) {
    if (t.recurring) continue; // recurring handled by blocks
    let placed = false;
    for (let tries = 0; tries < 7 && !placed; tries++) {
      const idx = di % 5; // weekdays
      if (buckets[idx].length < 3) {
        buckets[idx].push(t);
        placed = true;
      }
      di++;
    }
    if (!placed) buckets[5].push(t); // overflow to Saturday
  }

  const clients = await q("SELECT id, name FROM clients WHERE active=1 ORDER BY priority").all<{ id: number; name: string }>();
  const topProjects = await q(
    "SELECT id, name FROM projects WHERE status='active' ORDER BY CASE priority WHEN 'high' THEN 0 ELSE 1 END LIMIT 3"
  ).all<{ id: number; name: string }>();

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStartDate, i);
    const isWeekend = i >= 5;
    const dayTasks = buckets[i];
    const clientOfDay = clients.length ? clients[i % clients.length] : null;
    const projectOfDay = topProjects.length ? topProjects[i % topProjects.length] : null;

    const blocks: ProposedBlock[] = [];
    blocks.push({
      name: "Morning activation", domain: "body", entity_type: null, entity_id: null,
      start_time: "07:45", end_time: "08:15",
      goal: "Stretch, water, 10 push-ups, no phone.",
      completion_criteria: "Body moved before first coffee.",
      reminder_copy: "Body first. 10 push-ups, 5-minute stretch, water. Then the day starts.",
    });
    if (!isWeekend) {
      blocks.push({
        name: "Job sprint", domain: "jobs", entity_type: null, entity_id: null,
        start_time: "08:30", end_time: "10:00",
        goal: "5 applications, 1 tailored. Highest-leverage roles first.",
        completion_criteria: "5 applications logged.",
        reminder_copy: "No applications logged yet. Start one clean application now. Reply START.",
      });
      blocks.push({
        name: "Recovery block", domain: "body", entity_type: null, entity_id: null,
        start_time: "10:00", end_time: "10:20",
        goal: "Walk outside or stretch. No screens.",
        completion_criteria: "20 minutes away from the desk.",
        reminder_copy: "Step away. 20-minute walk. The next block needs a fresh head.",
      });
      const clientTask = dayTasks.find((t) => t.domain === "client");
      blocks.push({
        name: `Client sprint${clientTask?.entity_name ? ` — ${clientTask.entity_name}` : clientOfDay ? ` — ${clientOfDay.name}` : ""}`,
        domain: "client",
        entity_type: "client",
        entity_id: clientTask?.entity_id ?? clientOfDay?.id ?? null,
        start_time: "10:30", end_time: "12:30",
        goal: clientTask?.title || "Ship today's client deliverable.",
        completion_criteria: "Deliverable shipped.",
        reminder_copy: "Client block. 2 hours. Ship it. Reply START.",
      });
      const projectTask = dayTasks.find((t) => t.domain === "project");
      blocks.push({
        name: `Own project${projectTask?.entity_name ? ` — ${projectTask.entity_name}` : projectOfDay ? ` — ${projectOfDay.name}` : ""}`,
        domain: "project",
        entity_type: "project",
        entity_id: projectTask?.entity_id ?? projectOfDay?.id ?? null,
        start_time: "14:00", end_time: "15:30",
        goal: projectTask?.title || "90 minutes. One shippable improvement.",
        completion_criteria: "One improvement shipped or committed.",
        reminder_copy: "Project block. 90 minutes. This is how the escape gets built. Start.",
      });
    }
    blocks.push({
      name: isWeekend && i === 6 ? "Weekly CEO review" : "Body block",
      domain: isWeekend && i === 6 ? "journal" : "body",
      entity_type: null, entity_id: null,
      start_time: "18:00", end_time: "18:40",
      goal: isWeekend && i === 6 ? "Run the weekly review. Set next week's targets." : "Home workout or long walk.",
      completion_criteria: isWeekend && i === 6 ? "Weekly review saved." : "Workout or 40-minute walk logged.",
      reminder_copy: isWeekend && i === 6
        ? "CEO time. 30 minutes: what moved, what was fake, what dies next week."
        : "Body minimum: 10 push-ups, 5 minutes stretch, 10-minute walk. Shrink it if needed, but don't skip it.",
    });
    blocks.push({
      name: "Evening review", domain: "journal", entity_type: null, entity_id: null,
      start_time: "22:00", end_time: "22:20",
      goal: "Journal + score the day.",
      completion_criteria: "Journal written, day scored.",
      reminder_copy: "Close the day. 5 lines in the journal, score the day, set tomorrow's first block.",
    });

    const mission = isWeekend
      ? i === 6
        ? "CEO day: weekly review + next sprint plan."
        : "Reset day: body, long walk, light planning."
      : dayTasks.length
        ? `${dayName(date)}: ${dayTasks[0].title}${dayTasks.length > 1 ? ` + ${dayTasks.length - 1} more` : ""}`
        : `${dayName(date)}: volume day — hit the targets, protect the blocks.`;

    days.push({ date, mission, blocks, tasks: dayTasks });
  }

  return { week_start: weekStartDate, targets, days, kb_suggestions: await kbSuggestions() };
}

/** Persist an approved plan: weekly_plan + daily_plans + work_blocks + scheduled tasks. */
export async function activatePlan(plan: ProposedPlan, messyInput: string, sprintId: number | null): Promise<number> {
  await q("UPDATE weekly_plans SET status='completed' WHERE week_start=? AND status='active'").run(plan.week_start);
  const wp = await q(
    "INSERT INTO weekly_plans (sprint_id, week_start, targets, status, messy_input) VALUES (?,?,?,'active',?)"
  ).run(sprintId, plan.week_start, JSON.stringify(plan.targets), messyInput);
  const wpId = wp.lastInsertRowid;

  for (const day of plan.days) {
    await q(
      `INSERT INTO daily_plans (weekly_plan_id, date, mission, status) VALUES (?,?,?,'planned')
       ON CONFLICT(date) DO UPDATE SET weekly_plan_id=excluded.weekly_plan_id, mission=excluded.mission`
    ).run(wpId, day.date, day.mission);
    const dp = await q("SELECT id FROM daily_plans WHERE date=?").get<{ id: number }>(day.date);
    if (!dp) continue;
    // Replace existing future blocks for this date (keep past days' history)
    await q("DELETE FROM work_blocks WHERE date=? AND status='upcoming'").run(day.date);
    for (let idx = 0; idx < day.blocks.length; idx++) {
      const b = day.blocks[idx];
      await q(
        `INSERT INTO work_blocks (daily_plan_id, date, name, domain, entity_type, entity_id, start_time, end_time, goal, completion_criteria, reminder_copy, status, sort)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,'upcoming',?)`
      ).run(dp.id, day.date, b.name, b.domain, b.entity_type, b.entity_id, b.start_time, b.end_time, b.goal, b.completion_criteria, b.reminder_copy, idx);
    }
    for (const t of day.tasks) {
      await q(
        `INSERT INTO tasks (title, domain, entity_type, entity_id, entity_name, priority, effort_min, status, scheduled_date, recurring)
         VALUES (?,?,?,?,?,?,?,'scheduled',?,?)`
      ).run(t.title, t.domain, t.entity_type, t.entity_id, t.entity_name, t.priority, t.effort_min, day.date, t.recurring ? 1 : 0);
    }
  }
  return wpId;
}
