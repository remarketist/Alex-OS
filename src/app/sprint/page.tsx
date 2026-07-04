import { getDb } from "@/lib/db";
import { todayStr, daysBetween } from "@/lib/dates";
import { jobMetrics } from "@/lib/gmail";
import { SprintClient } from "./SprintClient";
import type { Sprint } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function SprintPage() {
  const db = getDb();
  const today = todayStr();
  const sprint = db.prepare("SELECT * FROM sprints WHERE status='active' ORDER BY id DESC LIMIT 1").get() as Sprint | undefined;
  const metrics = jobMetrics();

  // Sprint-wide aggregates
  let aggregates = { blocks: 0, workouts: 0, walks: 0, clientHours: 0, projectHours: 0, journals: 0, reviews: 0 };
  let day = 0;
  let total = 60;
  if (sprint) {
    day = Math.min(Math.max(daysBetween(sprint.start_date, today) + 1, 1), daysBetween(sprint.start_date, sprint.end_date) + 1);
    total = daysBetween(sprint.start_date, sprint.end_date) + 1;
    const from = sprint.start_date;
    const to = sprint.end_date;
    const cnt = (sql: string) => (db.prepare(sql).get(from, to) as { c: number }).c;
    aggregates = {
      blocks: cnt("SELECT COUNT(*) as c FROM work_blocks WHERE date BETWEEN ? AND ? AND status IN ('completed','shrunk')"),
      workouts: cnt("SELECT COUNT(*) as c FROM check_ins WHERE type='workout' AND date BETWEEN ? AND ?"),
      walks: cnt("SELECT COUNT(*) as c FROM check_ins WHERE type='walk' AND date BETWEEN ? AND ?"),
      clientHours: Math.round(((db.prepare("SELECT COALESCE(SUM(value),0) as c FROM check_ins WHERE type='client_minutes' AND date BETWEEN ? AND ?").get(from, to) as { c: number }).c / 60) * 10) / 10,
      projectHours: Math.round(((db.prepare("SELECT COALESCE(SUM(value),0) as c FROM check_ins WHERE type='project_minutes' AND date BETWEEN ? AND ?").get(from, to) as { c: number }).c / 60) * 10) / 10,
      journals: cnt("SELECT COUNT(*) as c FROM journal_entries WHERE date BETWEEN ? AND ?"),
      reviews: cnt("SELECT COUNT(*) as c FROM weekly_reviews WHERE week_start BETWEEN ? AND ?"),
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
