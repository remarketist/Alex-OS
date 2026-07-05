import { weekStart, todayStr, addDays } from "@/lib/dates";
import { kbSuggestions } from "@/lib/sprint-builder";
import { q } from "@/lib/db";
import { SprintBuilderClient } from "./SprintBuilderClient";

export const dynamic = "force-dynamic";

export default async function SprintBuilderPage() {
  const thisWeek = weekStart(todayStr());
  const nextWeek = addDays(thisWeek, 7);
  const activePlan = await q(
    "SELECT week_start FROM weekly_plans WHERE status='active' ORDER BY week_start DESC LIMIT 1"
  ).get<{ week_start: string }>();

  return (
    <SprintBuilderClient
      thisWeek={thisWeek}
      nextWeek={nextWeek}
      activePlanWeek={activePlan?.week_start ?? null}
      suggestions={await kbSuggestions()}
    />
  );
}
