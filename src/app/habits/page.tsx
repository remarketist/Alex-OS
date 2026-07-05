import { q } from "@/lib/db";
import { todayStr, addDays } from "@/lib/dates";
import { getDayStats } from "@/lib/scoring";
import { getStreaks } from "@/lib/services";
import { HabitsClient } from "./HabitsClient";
import type { FitnessProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const today = todayStr();
  const stats = await getDayStats(today);
  const streaks = await getStreaks();
  const fitness = (await q("SELECT * FROM fitness_profiles WHERE id=1").get<FitnessProfile>())!;

  // 14-day history for charts — bulk queries, then assemble in memory
  const from = addDays(today, -13);
  const checkins = await q(
    "SELECT date, type, SUM(value) as total, COUNT(*) as n FROM check_ins WHERE date >= ? GROUP BY date, type"
  ).all<{ date: string; type: string; total: number; n: number }>(from);
  const byDate = new Map<string, Map<string, { total: number; n: number }>>();
  for (const c of checkins) {
    if (!byDate.has(c.date)) byDate.set(c.date, new Map());
    byDate.get(c.date)!.set(c.type, { total: Number(c.total), n: Number(c.n) });
  }

  const days: { date: string; smoke: number | null; walk: boolean; workout: boolean; meditation: boolean; mood: number | null; energy: number | null }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i);
    const m = byDate.get(d);
    days.push({
      date: d,
      smoke: m?.get("smoke") ? Number(m.get("smoke")!.total) : null,
      walk: (m?.get("walk")?.n ?? 0) > 0,
      workout: (m?.get("workout")?.n ?? 0) > 0 || (m?.get("stretch")?.n ?? 0) > 0,
      meditation: (m?.get("meditation")?.n ?? 0) > 0,
      mood: m?.get("mood") ? Number(m.get("mood")!.total) / Number(m.get("mood")!.n) : null,
      energy: m?.get("energy") ? Number(m.get("energy")!.total) / Number(m.get("energy")!.n) : null,
    });
  }

  return (
    <HabitsClient
      today={today}
      stats={{
        walk: stats.walk,
        workout: stats.workout,
        meditation: stats.meditation,
        smokeCount: stats.smokeCount,
        smokeTarget: stats.smokeTarget,
        mood: stats.mood,
        energy: stats.energy,
      }}
      streaks={streaks}
      fitness={fitness}
      history={days}
    />
  );
}
