import { getDb } from "./db";
import { getDayStats } from "./scoring";
import { addDays } from "./dates";

export interface Adaptation {
  adjustments: string[];
  hardTruth: string;
  mvw: string; // tomorrow's minimum viable win
}

/** End-of-day adaptation engine: reads today's reality, recommends tomorrow's plan changes. */
export function computeAdaptation(date: string): Adaptation {
  const db = getDb();
  const s = getDayStats(date);
  const yesterday = getDayStats(addDays(date, -1));
  const adjustments: string[] = [];

  if (s.jobs < 2) {
    adjustments.push("Job target missed — job sprint moves to 08:00 tomorrow, before anything else.");
  }
  if (s.clientMinutes < 60) {
    adjustments.push("Client work missed — tomorrow's client block is protected. No meetings, no phone.");
  }
  const bodyMissedToday = !s.walk && !s.workout;
  const bodyMissedYesterday = !yesterday.walk && !yesterday.workout;
  if (bodyMissedToday && bodyMissedYesterday) {
    adjustments.push("Body missed two days — tomorrow is a Bronze body day: 10 push-ups, 5-minute stretch, 10-minute walk. Non-negotiable.");
  }
  if (s.smokeCount !== null && s.smokeCount > s.smokeTarget) {
    adjustments.push(`Smoking over target (${s.smokeCount}/${s.smokeTarget}) — no-smoking-before rule active tomorrow morning.`);
  }
  if (s.projectMinutes < 45) {
    adjustments.push("Project work missed — a 45-minute minimum project block is scheduled tomorrow.");
  }
  const derailed = db
    .prepare("SELECT COUNT(*) as c FROM derail_events WHERE ts LIKE ?")
    .get(date + "%") as { c: number };
  if (derailed.c > 0) {
    adjustments.push("You derailed today — tomorrow includes a 20-minute reset block after lunch, before the drift window.");
  }
  if (adjustments.length === 0) {
    adjustments.push("Execution held. Same structure tomorrow — raise the job target by one.");
  }

  return {
    adjustments,
    hardTruth: hardTruth(s),
    mvw: minimumViableWin(s),
  };
}

function hardTruth(s: ReturnType<typeof getDayStats>): string {
  if (s.jobs === 0) return "Zero applications. Everything else today was decoration.";
  if (s.clientMinutes === 0 && s.projectMinutes === 0)
    return "No client work, no project work. Busy is not the same as building.";
  if (s.smokeCount !== null && s.smokeCount > s.smokeTarget)
    return `You smoked ${s.smokeCount}. The target is ${s.smokeTarget}. The number doesn't lie.`;
  if (!s.walk && !s.workout)
    return "The body got nothing today. The body funds everything else.";
  if (s.blocksTotal > 0 && s.blocksCompleted / s.blocksTotal < 0.5)
    return "Less than half the blocks got done. The plan wasn't the problem.";
  return "Solid day. The only risk now is thinking one good day is momentum.";
}

function minimumViableWin(s: ReturnType<typeof getDayStats>): string {
  const parts: string[] = [];
  parts.push(s.jobs < 2 ? "3 applications before 10:00" : "3 applications");
  parts.push(s.clientMinutes < 60 ? "90 minutes client work, protected" : "90 minutes client work");
  parts.push("20-minute walk");
  parts.push("smoking logged");
  return "Tomorrow's minimum viable win: " + parts.join(", ") + ".";
}
