import Link from "next/link";
import { getTodayContext, getStreaks, jobMetrics } from "@/lib/services";
import { getDb } from "@/lib/db";
import { todayStr, formatDateLong, daysBetween, nowTimeStr, timeToMin } from "@/lib/dates";
import { Card, ScoreRing, LevelBadge, ProgressBar, DOMAIN_COLORS, Sparkline } from "@/components/ui";
import { QuickActions } from "@/components/QuickActions";
import { BlockTimeline } from "@/components/BlockTimeline";
import type { Sprint, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function CommandCenter() {
  const db = getDb();
  const today = todayStr();
  const ctx = getTodayContext(today);
  const streaks = getStreaks();
  const jobs = jobMetrics();
  const sprint = db.prepare("SELECT * FROM sprints WHERE status='active' ORDER BY id DESC LIMIT 1").get() as Sprint | undefined;
  const sprintDay = sprint ? Math.max(daysBetween(sprint.start_date, today) + 1, 1) : 0;
  const sprintLen = sprint ? daysBetween(sprint.start_date, sprint.end_date) + 1 : 60;

  const now = nowTimeStr();
  const nowMin = timeToMin(now);

  // Next reminder
  const reminders = db.prepare("SELECT time, label FROM reminders WHERE enabled=1 ORDER BY time").all() as { time: string; label: string }[];
  const nextReminder = reminders.find((r) => timeToMin(r.time) > nowMin) || reminders[0];

  // Score history for sparkline
  const history = db.prepare("SELECT score FROM daily_scores WHERE date < ? ORDER BY date DESC LIMIT 10").all(today) as { score: number }[];
  const scoreTrend = [...history.reverse().map((h) => h.score), ctx.score.score];

  // Entity groups
  const clients = db.prepare("SELECT id, name FROM clients WHERE active=1 ORDER BY priority").all() as { id: number; name: string }[];
  const projects = db.prepare("SELECT id, name FROM projects WHERE status='active' ORDER BY CASE priority WHEN 'high' THEN 0 ELSE 1 END").all() as { id: number; name: string }[];
  const todayTasks = db.prepare("SELECT * FROM tasks WHERE scheduled_date=? AND status NOT IN ('killed','done') ORDER BY priority").all(today) as Task[];

  const s = ctx.stats;
  const winning = ctx.score.level !== "below";

  const domainProgress = [
    { label: "Jobs", value: s.jobs, max: 5, unit: "apps", color: DOMAIN_COLORS.jobs },
    { label: "Client", value: s.clientMinutes, max: 120, unit: "min", color: DOMAIN_COLORS.client },
    { label: "Project", value: s.projectMinutes, max: 90, unit: "min", color: DOMAIN_COLORS.project },
    { label: "Body", value: (s.walk ? 1 : 0) + (s.workout ? 1 : 0) + (s.meditation ? 1 : 0), max: 3, unit: "habits", color: DOMAIN_COLORS.body },
    { label: "Smoking", value: s.smokeCount ?? 0, max: s.smokeTarget, unit: `of ${s.smokeTarget} max`, color: DOMAIN_COLORS.smoking, inverted: true, logged: s.smokeCount !== null },
    { label: "Journal", value: s.journalDone ? 1 : 0, max: 1, unit: s.journalDone ? "done" : "open", color: DOMAIN_COLORS.journal },
  ];

  const entityGroups = [
    { key: "jobs", name: "Jobs", color: DOMAIN_COLORS.jobs, href: "/jobs", stat: `${jobs.today} today · ${jobs.week} this week`, tasks: todayTasks.filter((t) => t.domain === "jobs") },
    ...clients.map((c) => ({
      key: `client-${c.id}`,
      name: c.name,
      color: DOMAIN_COLORS.client,
      href: "/knowledge",
      stat: blockStatFor(ctx.blocks, "client", c.id),
      tasks: todayTasks.filter((t) => t.entity_type === "client" && t.entity_id === c.id),
    })),
    ...projects.slice(0, 4).map((p) => ({
      key: `project-${p.id}`,
      name: p.name,
      color: DOMAIN_COLORS.project,
      href: "/knowledge",
      stat: blockStatFor(ctx.blocks, "project", p.id),
      tasks: todayTasks.filter((t) => t.entity_type === "project" && t.entity_id === p.id),
    })),
    { key: "body", name: "Body", color: DOMAIN_COLORS.body, href: "/habits", stat: [s.workout && "workout ✓", s.walk && "walk ✓", s.meditation && "meditation ✓"].filter(Boolean).join(" · ") || "nothing logged yet", tasks: todayTasks.filter((t) => t.domain === "body") },
    { key: "smoking", name: "Smoking", color: DOMAIN_COLORS.smoking, href: "/habits", stat: s.smokeCount === null ? "not logged" : `${s.smokeCount} / ${s.smokeTarget} target`, tasks: [] as Task[] },
    { key: "journal", name: "Journal", color: DOMAIN_COLORS.journal, href: "/journal", stat: s.journalDone ? "written ✓" : "open", tasks: [] as Task[] },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="fade-up">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-mute">
          <span>{formatDateLong(today)}</span>
          {sprint && (
            <>
              <span className="text-faint">·</span>
              <Link href="/sprint" className="hover:text-cyan-300">
                {sprint.name} — Day <span className="font-mono font-bold text-ink">{sprintDay}</span>
                <span className="text-faint">/{sprintLen}</span>
              </Link>
            </>
          )}
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {ctx.plan?.mission || "No mission set. Build the day in the Sprint Builder."}
        </h1>
        {ctx.plan?.adaptation_note && (
          <p className="mt-1 text-sm text-amber-300/90">↳ {ctx.plan.adaptation_note}</p>
        )}
      </div>

      {/* Top row: score / now / targets */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Score */}
        <Card className="flex items-center gap-5">
          <ScoreRing score={ctx.score.score} level={ctx.score.level} size={110} />
          <div className="min-w-0 flex-1">
            <LevelBadge level={ctx.score.level} size="lg" />
            <p className="mt-2 text-[12.5px] leading-snug text-mute">
              {winning
                ? "You're on the board. Hold the line."
                : "Below Bronze. Two applications and one block gets you back."}
            </p>
            <div className="mt-2">
              <Sparkline data={scoreTrend} width={150} height={30} color={ctx.score.level === "gold" ? "#f5c451" : "#22d3ee"} />
              <div className="text-[10px] uppercase tracking-widest text-faint">10-day trend</div>
            </div>
          </div>
        </Card>

        {/* Now / Next */}
        <Card>
          <div className="section-title mb-2">Now</div>
          {ctx.activeBlock ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 pulse-glow" />
                <span className="text-lg font-bold">{ctx.activeBlock.name}</span>
              </div>
              <p className="mt-1 text-sm text-mute">{ctx.activeBlock.goal}</p>
              <p className="mt-2 font-mono text-[11px] text-faint">
                {ctx.activeBlock.start_time}–{ctx.activeBlock.end_time} · report completion after
              </p>
            </div>
          ) : ctx.nextBlock ? (
            <div>
              <div className="text-lg font-bold">{ctx.nextBlock.name}</div>
              <p className="mt-1 text-sm text-mute">{ctx.nextBlock.goal}</p>
              <p className="mt-2 font-mono text-[11px] text-faint">
                starts {ctx.nextBlock.start_time} · no negotiation — start the block
              </p>
            </div>
          ) : (
            <p className="text-sm text-mute">
              No blocks left today. Close the day: journal + score.
            </p>
          )}
          {nextReminder && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-mute">
              <span className="text-cyan-300">◈</span>
              Next Telegram check-in: <span className="font-mono font-bold text-ink">{nextReminder.time}</span> — {nextReminder.label}
            </div>
          )}
        </Card>

        {/* Today targets */}
        <Card>
          <div className="section-title mb-3">Today vs targets</div>
          <div className="space-y-2.5">
            {domainProgress.map((d) => (
              <div key={d.label}>
                <div className="mb-1 flex items-baseline justify-between text-[11.5px]">
                  <span className="font-semibold" style={{ color: d.color }}>{d.label}</span>
                  <span className="font-mono text-mute">
                    {"logged" in d && !d.logged ? "—" : d.value}
                    <span className="text-faint"> {d.unit}</span>
                  </span>
                </div>
                <ProgressBar
                  value={d.value}
                  max={d.max}
                  color={"inverted" in d && d.inverted && d.value > d.max ? "#f43f5e" : d.color}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="fade-up">
        <div className="section-title mb-3">Quick actions</div>
        <QuickActions
          activeBlockId={ctx.activeBlock?.id ?? null}
          nextBlockId={ctx.nextBlock?.id ?? null}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Timeline */}
        <Card className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="section-title">Today&apos;s blocks</div>
            <Link href="/planner" className="text-[12px] font-semibold text-cyan-300 hover:text-cyan-200">
              Edit day →
            </Link>
          </div>
          {ctx.blocks.length ? (
            <BlockTimeline blocks={ctx.blocks} nowMin={nowMin} />
          ) : (
            <p className="py-6 text-center text-sm text-mute">
              No blocks planned. <Link href="/sprint-builder" className="text-cyan-300">Run the Sprint Builder</Link> or add blocks in the <Link href="/planner" className="text-cyan-300">Daily Planner</Link>.
            </p>
          )}
        </Card>

        {/* Streaks + jobs pace */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <div className="section-title mb-3">Streaks</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Walks", v: streaks.walk, icon: "🚶" },
                { label: "Workouts", v: streaks.workout, icon: "💪" },
                { label: "Meditation", v: streaks.meditation, icon: "🧠" },
                { label: "Jobs", v: streaks.jobs, icon: "◈" },
                { label: "Smoke log", v: streaks.smokeLogged, icon: "🚬" },
                { label: "Journal", v: streaks.journal, icon: "✎" },
              ].map((st) => (
                <div key={st.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-center">
                  <div className="text-sm">{st.icon}</div>
                  <div className="font-mono text-lg font-bold leading-tight">{st.v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-faint">{st.label}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <div className="section-title">Job pipeline</div>
              <Link href="/jobs" className="text-[12px] font-semibold text-cyan-300 hover:text-cyan-200">Open →</Link>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="font-mono text-2xl font-bold text-cyan-300">{jobs.today}</div>
                <div className="text-[10px] uppercase tracking-wider text-faint">today</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold">{jobs.week}</div>
                <div className="text-[10px] uppercase tracking-wider text-faint">this week</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold">{jobs.sprint}</div>
                <div className="text-[10px] uppercase tracking-wider text-faint">sprint</div>
              </div>
            </div>
            {jobs.pending > 0 && (
              <Link href="/jobs" className="mt-3 block rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5 text-[11.5px] text-amber-300">
                {jobs.pending} possible application{jobs.pending > 1 ? "s" : ""} awaiting review →
              </Link>
            )}
          </Card>
        </div>
      </div>

      {/* Entity groups */}
      <div>
        <div className="section-title mb-3">Fronts</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {entityGroups.map((g) => (
            <Link key={g.key} href={g.href} className="glass glass-hover block p-3.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
                <span className="truncate text-[13px] font-bold">{g.name}</span>
              </div>
              <div className="mt-1 text-[11.5px] text-mute">{g.stat}</div>
              {g.tasks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {g.tasks.slice(0, 2).map((t) => (
                    <li key={t.id} className="truncate text-[11.5px] text-ink/80">
                      · {t.title}
                    </li>
                  ))}
                  {g.tasks.length > 2 && (
                    <li className="text-[11px] text-faint">+{g.tasks.length - 2} more</li>
                  )}
                </ul>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function blockStatFor(
  blocks: { entity_type: string | null; entity_id: number | null; status: string }[],
  type: string,
  id: number
): string {
  const mine = blocks.filter((b) => b.entity_type === type && b.entity_id === id);
  if (!mine.length) return "no block today";
  const done = mine.filter((b) => b.status === "completed").length;
  const active = mine.some((b) => b.status === "active");
  if (active) return "block live now";
  return done === mine.length ? "block done ✓" : `${done}/${mine.length} blocks done`;
}
