import { weekStart, todayStr, addDays } from "@/lib/dates";
import { kbSuggestions } from "@/lib/sprint-builder";
import { getDb } from "@/lib/db";
import { SprintBuilderClient } from "./SprintBuilderClient";

export const dynamic = "force-dynamic";

export default function SprintBuilderPage() {
  const db = getDb();
  const thisWeek = weekStart(todayStr());
  const nextWeek = addDays(thisWeek, 7);
  const activePlan = db
    .prepare("SELECT week_start FROM weekly_plans WHERE status='active' ORDER BY week_start DESC LIMIT 1")
    .get() as { week_start: string } | undefined;

  return (
    <SprintBuilderClient
      thisWeek={thisWeek}
      nextWeek={nextWeek}
      activePlanWeek={activePlan?.week_start ?? null}
      suggestions={kbSuggestions()}
    />
  );
}
