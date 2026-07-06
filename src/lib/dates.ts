// Date helpers — all dates stored as YYYY-MM-DD strings in the app's timezone.
// The server may run in UTC (Cloudflare Workers), so "today" and "now" are
// always computed in TIMEZONE (default Europe/Bucharest — Alex's day).

const TZ = process.env.TIMEZONE || "Europe/Bucharest";

export function todayStr(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** Monday of the week containing dateStr */
export function weekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return toDateStr(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) /
      86400000
  );
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateLong(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function nowTimeStr(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  // en-GB gives "HH:MM"; hour "24" can appear at midnight in some runtimes
  return parts.replace(/^24/, "00");
}

/** Current hour (0-23) in the app timezone. */
export function nowHour(): number {
  return parseInt(nowTimeStr().split(":")[0], 10);
}

/** Day of week (0=Sunday) for today in the app timezone. */
export function todayDow(): number {
  return new Date(todayStr() + "T12:00:00").getDay();
}

/** minutes since midnight for "HH:MM" */
export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function dayName(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
  });
}
