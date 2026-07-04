import { getDb } from "@/lib/db";
import { todayStr, addDays, formatDateLong } from "@/lib/dates";
import { PlannerClient } from "./PlannerClient";
import type { WorkBlock, DailyPlan, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const db = getDb();
  const { date: qd } = await searchParams;
  const date = qd && /^\d{4}-\d{2}-\d{2}$/.test(qd) ? qd : todayStr();

  const plan = db.prepare("SELECT * FROM daily_plans WHERE date=?").get(date) as DailyPlan | undefined;
  const blocks = db.prepare("SELECT * FROM work_blocks WHERE date=? ORDER BY start_time, sort").all(date) as WorkBlock[];
  const tasks = db.prepare("SELECT * FROM tasks WHERE scheduled_date=? AND status NOT IN ('killed') ORDER BY priority").all(date) as Task[];

  return (
    <PlannerClient
      date={date}
      dateLabel={formatDateLong(date)}
      prev={addDays(date, -1)}
      next={addDays(date, 1)}
      isToday={date === todayStr()}
      plan={plan ?? null}
      blocks={blocks}
      tasks={tasks}
    />
  );
}
