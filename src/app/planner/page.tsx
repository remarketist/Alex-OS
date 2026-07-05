import { q } from "@/lib/db";
import { todayStr, addDays, formatDateLong } from "@/lib/dates";
import { PlannerClient } from "./PlannerClient";
import type { WorkBlock, DailyPlan, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: qd } = await searchParams;
  const date = qd && /^\d{4}-\d{2}-\d{2}$/.test(qd) ? qd : todayStr();

  const plan = await q("SELECT * FROM daily_plans WHERE date=?").get<DailyPlan>(date);
  const blocks = await q("SELECT * FROM work_blocks WHERE date=? ORDER BY start_time, sort").all<WorkBlock>(date);
  const tasks = await q("SELECT * FROM tasks WHERE scheduled_date=? AND status NOT IN ('killed') ORDER BY priority").all<Task>(date);

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
