import { q } from "@/lib/db";
import { todayStr, daysBetween } from "@/lib/dates";
import { jobMetrics } from "@/lib/gmail";
import { SprintClient } from "./SprintClient";
import type { Sprint } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SprintPage() {
  const today = todayStr();
  const sprint = await q("SELECT * FROM sprints WHERE status='active' ORDER BY id DESC LIMIT 1").get<Sprint>();
  const metrics = await jobMetrics();

  // Sprint-wide aggregates
  let aggregates = { blocks: 0, workouts: 0, walks: 0, clientHours: 0, projectHours: 0, journals: 0, reviews: 0 };
  let day = 0;
  let total = 60;
  if (sprint) {
    day = Math.min(Math.max(daysBetween(sprint.start_date, today) + 1, 1), daysBetween(sprint.start_date, sprint.end_date) + 1);
    total = daysBetween(sprint.start_date, sprint.end_date) + 1;
    const from = sprint.start_date;
    const to = sprint.end_date;
    const cnt = async (sql: string) => Number((await q(sql).get<{ c: number }>(from, to))?.c ?? 0);
    aggregates = {
      blocks: await cnt("SELECT COUNT(*) as c FROM work_blocks WHERE date BETWEEN ? AND ? AND status IN ('completed','shrunk')"),
      workouts: await cnt("SELECT COUNT(*) as c FROM check_ins WHERE type='workout' AND date BETWEEN ? AND ?"),
      walks: await cnt("SELECT COUNT(*) as c FROM check_ins WHERE type='walk' AND date BETWEEN ? AND ?"),
      clientHours: Math.round((await cnt("SELECT COALESCE(SUM(value),0) as c FROM check_ins WHERE type='client_minutes' AND date BETWEEN ? AND ?")) / 60 * 10) / 10,
      projectHours: Math.round((await cnt("SELECT COALESCE(SUM(value),0) as c FROM check_ins WHERE type='project_minutes' AND date BETWEEN ? AND ?")) / 60 * 10) / 10,
      journals: await cnt("SELECT COUNT(*) as c FROM journal_entries WHERE date BETWEEN ? AND ?"),
      reviews: await cnt("SELECT COUNT(*) as c FROM weekly_reviews WHERE week_start BETWEEN ? AND ?"),
    };
  }

  return (
    <SprintClient
      sprint={sprint ?? null}
      day={day}
      total={total}
      jobsInSprint={metrics.sprint}
      aggregates={aggregates}
    />
  );
}
