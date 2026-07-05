import { q } from "@/lib/db";
import { todayStr, weekStart, addDays, formatDate } from "@/lib/dates";
import { generateWeeklyReview, getWeeklySprintContext } from "@/lib/services";
import { safeJson } from "@/lib/scoring";
import { ReviewClient } from "./ReviewClient";
import type { WeeklyReview } from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: qw } = await searchParams;
  const ws = qw && /^\d{4}-\d{2}-\d{2}$/.test(qw) ? weekStart(qw) : weekStart(todayStr());

  // Always regenerate stats for the requested week so the report reflects reality now
  const review = (await generateWeeklyReview(ws)) as unknown as WeeklyReview;
  const ctx = await getWeeklySprintContext(ws);

  const scores = await q(
    "SELECT date, score, level FROM daily_scores WHERE date BETWEEN ? AND ? ORDER BY date"
  ).all<{ date: string; score: number; level: string }>(ws, addDays(ws, 6));

  const pastReviews = await q(
    "SELECT week_start, stats FROM weekly_reviews WHERE week_start < ? ORDER BY week_start DESC LIMIT 4"
  ).all<{ week_start: string; stats: string }>(ws);

  return (
    <ReviewClient
      weekStart={ws}
      weekLabel={`${formatDate(ws)} – ${formatDate(addDays(ws, 6))}`}
      prevWeek={addDays(ws, -7)}
      nextWeek={addDays(ws, 7)}
      isCurrentWeek={ws === weekStart(todayStr())}
      review={review}
      targets={ctx.targets}
      scores={scores.map((s) => ({ ...s, label: formatDate(s.date) }))}
      pastReviews={pastReviews.map((p) => ({
        week: p.week_start,
        stats: safeJson<Record<string, number>>(p.stats, {}),
      }))}
    />
  );
}
