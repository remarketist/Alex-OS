import { getDb } from "@/lib/db";
import { todayStr, addDays } from "@/lib/dates";
import { getDayStats } from "@/lib/scoring";
import { getStreaks } from "@/lib/services";
import { HabitsClient } from "./HabitsClient";
import type { FitnessProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function HabitsPage() {
  const db = getDb();
  const today = todayStr();
  const stats = getDayStats(today);
  const streaks = getStreaks();
  const fitness = db.prepare("SELECT * FROM fitness_profiles WHERE id=1").get() as FitnessProfile;

  // 14-day history for charts
  const days: { date: string; smoke: number | null; walk: boolean; workout: boolean; meditation: boolean; mood: number | null; energy: number | null }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i);
    const s = getDayStats(d);
    days.push({
      date: d,
      smoke: s.smokeCount,
      walk: s.walk,
      workout: s.workout,
      meditation: s.meditation,
      mood: s.mood,
      energy: s.energy,
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
