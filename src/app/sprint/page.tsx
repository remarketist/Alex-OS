import { q, batchAll } from "@/lib/db";
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
    // One round-trip for all sprint aggregates
    const [blocksR, checkR, journalsR, reviewsR] = await batchAll([
      { sql: "SELECT COUNT(*) as c FROM work_blocks WHERE date BETWEEN ? AND ? AND status IN ('completed','shrunk')", args: [from, to] },
      { sql: "SELECT type, SUM(value) as total, COUNT(*) as n FROM check_ins WHERE date BETWEEN ? AND ? GROUP BY type", args: [from, to] },
      { sql: "SELECT COUNT(*) as c FROM journal_entries WHERE date BETWEEN ? AND ?", args: [from, to] },
      { sql: "SELECT COUNT(*) as c FROM weekly_reviews WHERE week_start BETWEEN ? AND ?", args: [from, to] },
    ]);
    const byType = new Map((checkR as unknown as { type: string; total: number; n: number }[]).map((r) => [r.type, r]));
    aggregates = {
      blocks: Number((blocksR[0] as { c: number } | undefined)?.c ?? 0),
      workouts: Number(byType.get("workout")?.n ?? 0),
      walks: Number(byType.get("walk")?.n ?? 0),
      clientHours: Math.round((Number(byType.get("client_minutes")?.total ?? 0) / 60) * 10) / 10,
      projectHours: Math.round((Number(byType.get("project_minutes")?.total ?? 0) / 60) * 10) / 10,
      journals: Number((journalsR[0] as { c: number } | undefined)?.c ?? 0),
      reviews: Number((reviewsR[0] as { c: number } | undefined)?.c ?? 0),
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
