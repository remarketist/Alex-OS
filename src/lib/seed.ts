import type { InValue } from "@libsql/client";
import { todayStr, addDays, weekStart } from "./dates";

type Run = (sql: string, args?: InValue[]) => Promise<{ lastInsertRowid: number }>;

/** Seeds the database so the app feels alive on first open. */
export async function seed(run: Run) {
  const today = todayStr();
  const sprintStart = addDays(today, -10);
  const sprintEnd = addDays(sprintStart, 59);
  const wkStart = weekStart(today);

  await run(
    `INSERT INTO settings (id, wake_time, sleep_time, work_capacity_hours, assistant_tone, telegram_enabled)
     VALUES (1,'07:30','23:30',8,'firm-tactical',0)`
  );

  await run(
    `INSERT INTO fitness_profiles (id, goal, workout_type, constraints, preferred_habits, weekly_targets, smoking_goal, smoking_daily_target, no_smoke_before, walking_target, meditation_target)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Rebuild routine, improve strength and recovery, move daily, reduce smoking.",
      "Home workouts first: push-ups, stretching, bodyweight, walking.",
      "Consistency is the priority. No overcomplicated gym routine initially.",
      "Morning activation, 20-minute workout/stretch, daily walk, meditation.",
      JSON.stringify({ workouts: 4, walks: 6, meditations: 5 }),
      "Reduce gradually. Track every cigarette. Enforce no-smoking-before rule.",
      10,
      "10:00",
      "Daily 20-minute walk",
      "10 minutes daily",
    ]
  );

  // ---- Sprint ----
  const sprint = await run(
    `INSERT INTO sprints (name, main_outcome, king_metric, secondary_metrics, constraints, start_date, end_date, wake_time, sleep_time, work_capacity_hours, assistant_tone, smoking_plan, body_goals, goals, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active')`,
    [
      "Stability & Momentum Sprint",
      "Reach income and execution stability.",
      "Income-generating actions completed per day",
      JSON.stringify([
        "Job applications submitted",
        "High-quality tailored applications",
        "Client work hours shipped",
        "Personal project blocks completed",
        "Personal assets shipped",
        "Workouts/walks completed",
        "Smoking reduction progress",
        "Journal/review consistency",
      ]),
      "Energy dips mid-afternoon. Client deadlines cluster mid-week. Momentum is fragile in the morning — first block decides the day.",
      sprintStart,
      sprintEnd,
      "07:30",
      "23:30",
      8,
      "firm-tactical",
      "Track daily count. Reduce gradually. No smoking before 10:00.",
      "Home workouts, daily walks, meditation. Consistency over intensity.",
      JSON.stringify([
        "250–400 job applications submitted",
        "40–60 high-quality tailored applications",
        "60+ client deliverables/tasks shipped",
        "2–3 personal projects/assets launched",
        "120+ work blocks completed",
        "45+ walks/workouts",
        "Smoking reduced and tracked daily",
        "8 weekly CEO reviews completed",
      ]),
    ]
  );
  const sprintId = sprint.lastInsertRowid;

  // ---- Clients ----
  const insClient = (args: InValue[]) =>
    run(
      `INSERT INTO clients (name, aliases, type, description, priority, active, weekly_target_hours, recurring_deliverables, brand_voice)
       VALUES (?,?,?,?,?,1,?,?,?)`,
      args
    );
  const nayam = (
    await insClient([
      "Nayam Events",
      JSON.stringify(["nayam"]),
      "Events venue",
      "Bucharest events venue with garden — weddings, outdoor events, ads, landing page, lead generation.",
      1,
      5,
      JSON.stringify([
        "Wedding/event lead generation",
        "Reels",
        "Captions",
        "Ads",
        "Offer page",
        "Garden content",
        "WhatsApp/form lead tracking",
      ]),
      "Elegant, aspirational, event-focused.",
    ])
  ).lastInsertRowid;
  const siLounge = (
    await insClient([
      "SI Lounge",
      JSON.stringify(["si", "si lounge"]),
      "Restaurant & events venue",
      "Restaurant/events venue with garden, corporate offers, movie nights, event promotions.",
      2,
      4,
      JSON.stringify([
        "Reels",
        "Captions",
        "Corporate/event offers",
        "Movie night content",
        "Garden events",
        "Ads",
      ]),
      "Warm, social, upscale-casual.",
    ])
  ).lastInsertRowid;
  const saint = (
    await insClient([
      "The Saint Cocktail Bar",
      JSON.stringify(["saint", "the saint"]),
      "Cocktail bar",
      "Cocktail bar focused on witty, stylish social content — reels, cocktail visuals, funny hooks, visual storytelling.",
      2,
      3,
      JSON.stringify([
        "Reels",
        "Cocktail captions",
        "“Who is she / who is he” concepts",
        "Drink personality content",
        "Bar atmosphere content",
      ]),
      "Witty, stylish, a little provocative.",
    ])
  ).lastInsertRowid;
  const sanki = (
    await insClient([
      "Sanki Ramen Bar",
      JSON.stringify(["sanki"]),
      "Ramen restaurant",
      "Ramen restaurant — funny food reels, ramen content, captions, odd/funny food situations.",
      2,
      3,
      JSON.stringify(["Ramen reels", "Captions", "Funny short-form concepts", "Food visuals"]),
      "Playful, absurd, food-obsessed.",
    ])
  ).lastInsertRowid;

  // ---- Personal projects ----
  const insProject = (args: InValue[]) =>
    run(
      `INSERT INTO projects (name, aliases, description, category, priority, status, outcome_60d, weekly_block_target, milestone, next_actions)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args
    );
  const alexOs = (
    await insProject([
      "Alex OS",
      JSON.stringify(["jarvis", "life os", "alex os"]),
      "Personal execution command center / Jarvis-style assistant.",
      "Productivity / life OS",
      "high",
      "active",
      "Build and use daily for the 60-day sprint.",
      4,
      "Daily driver: Command Center + Telegram loop live",
      "Wire Telegram reminders. Run Gmail sync daily.",
    ])
  ).lastInsertRowid;
  const jobAuto = (
    await insProject([
      "AI job automation",
      JSON.stringify(["job automation", "job bot"]),
      "Job search automation: Gmail, resume tailoring, job boards, tracking, application workflow.",
      "Career / automation",
      "high",
      "active",
      "Reduce application friction, increase volume.",
      3,
      "Gmail detection pipeline v1",
      "Build resume tailoring prompt set.",
    ])
  ).lastInsertRowid;
  const perpetuum = (
    await insProject([
      "Perpetuum / health platform",
      JSON.stringify(["perpetuum", "health thing", "health platform"]),
      "Health, biohacking, longevity platform/product direction.",
      "Health / business",
      "medium-high",
      "active",
      "Build health/biohacking product assets.",
      2,
      "Positioning doc + first asset outline",
      "Draft the core offer one-pager.",
    ])
  ).lastInsertRowid;
  await insProject([
    "Event radar app",
    JSON.stringify(["event radar"]),
    "Bucharest/Romania events radar with WhatsApp/calendar alerts.",
    "Events / local product",
    "medium",
    "idea",
    "Validate event discovery product.",
    1,
    "Scrape 3 event sources",
    "List data sources. Sketch alert flow.",
  ]);
  await insProject([
    "AI business map",
    JSON.stringify(["business map"]),
    "AI business stack generator / educational product / map.",
    "Education / AI",
    "medium",
    "idea",
    "Build MVP / product asset.",
    1,
    "Outline the map structure",
    "Draft table of contents.",
  ]);
  const contentAuto = (
    await insProject([
      "Restaurant content automation",
      JSON.stringify(["content automation"]),
      "Automation system for discovering and generating restaurant content/reels.",
      "Marketing / automation",
      "high",
      "active",
      "Support client work and potential productization.",
      2,
      "Reel concept generator v1",
      "Build caption template bank.",
    ])
  ).lastInsertRowid;
  await insProject([
    "AI agency",
    JSON.stringify(["agency", "ai agency"]),
    "Productized AI/marketing services offer built on top of client work and automation systems.",
    "Business / services",
    "high",
    "active",
    "Define the offer and land the first productized retainer.",
    2,
    "Offer + pricing one-pager",
    "Draft service menu. Pick 2 pilot prospects.",
  ]);
  await insProject([
    "PDF farming system",
    JSON.stringify(["pdf farming", "pdf system"]),
    "Niche PDF/digital product system using short-form content funnels.",
    "Digital products",
    "medium",
    "idea",
    "Launch and test monetizable PDFs.",
    1,
    "Pick first niche",
    "Research 3 niches with demand.",
  ]);

  // ---- Extra aliases ----
  const insAlias = (alias: string, type: string, id: number) =>
    run("INSERT INTO entity_aliases (alias, entity_type, entity_id) VALUES (?,?,?)", [alias, type, id]);
  await insAlias("saint reels", "client", saint);
  await insAlias("ramen", "client", sanki);
  await insAlias("wedding", "client", nayam);
  await insAlias("movie night", "client", siLounge);
  await insAlias("health", "project", perpetuum);
  await insAlias("reels automation", "project", contentAuto);

  // ---- Rules ----
  const rules: [string, string, string, number][] = [
    ["Jobs in the morning", "Job search happens in the morning whenever possible.", "jobs", 1],
    ["Protect client work", "Client work must be protected daily.", "client", 1],
    ["Project minimum", "Personal projects need at least 90 minutes on active days.", "project", 2],
    ["Derail response", "If Alex derails, give one small action, not a lecture.", "emotional", 1],
    ["Tone", "Assistant tone is firm, tactical, direct, non-cringey.", "general", 1],
    ["No option overload", "Avoid giving too many options when drifting.", "emotional", 2],
    ["Shrink, don't collapse", "If a day is going badly, shrink the target to Bronze instead of letting the day collapse.", "general", 1],
    ["Job miss → earlier", "If job target is missed, move job sprint earlier tomorrow.", "jobs", 2],
    ["Client miss → protect", "If client work is missed, protect a client block tomorrow.", "client", 2],
    ["Body miss ×2 → Bronze body", "If body habit is missed two days, make tomorrow a Bronze body day.", "body", 2],
    ["Smoking over → gate", "If smoking exceeds target, add a no-smoking-before rule tomorrow.", "smoking", 2],
    ["Project miss → 45-min block", "If project work is missed, schedule a 45-minute minimum block.", "project", 2],
    ["Derail → log + reset", "If Alex hits derail mode, log the trigger and give a reset.", "emotional", 1],
  ];
  for (const r of rules) {
    await run("INSERT INTO assistant_rules (name, description, domain, priority) VALUES (?,?,?,?)", r);
  }

  // ---- Habits ----
  const habits: [string, string, string, string, string, string][] = [
    ["workout", "Workout", "body", "4x / week", "session", "💪"],
    ["stretch", "Stretching", "body", "daily", "session", "🧘"],
    ["walk", "Walk", "body", "daily 20 min", "walk", "🚶"],
    ["meditation", "Meditation", "body", "10 min daily", "session", "🧠"],
    ["smoke", "Smoking log", "smoking", "≤ 10 / day", "cig", "🚬"],
    ["journal", "Journal", "journal", "nightly", "entry", "📓"],
    ["sleep", "Sleep quality", "body", "7+", "score", "😴"],
    ["mood", "Mood", "emotional", "track", "score", "🎯"],
    ["energy", "Energy", "body", "track", "score", "⚡"],
  ];
  for (const h of habits) {
    await run("INSERT INTO habits (key, name, domain, target, unit, icon) VALUES (?,?,?,?,?,?)", h);
  }

  // ---- Weekly plan (active) ----
  const targets = {
    job_applications: 35,
    tailored_applications: 6,
    follow_ups: 5,
    client_hours: 14,
    client_deliverables: 8,
    project_hours: 8,
    shipped_assets: 1,
    workouts: 4,
    walks: 6,
    meditations: 5,
    smoking_limit: 10,
    journal_entries: 6,
  };
  const wp = await run(
    `INSERT INTO weekly_plans (sprint_id, week_start, targets, status, messy_input, notes)
     VALUES (?,?,?,'active',?,?)`,
    [
      sprintId,
      wkStart,
      JSON.stringify(targets),
      "Apply for jobs every morning, finish Nayam ads, create SI Lounge reels, build AI job automation, work out at home, walk daily, meditate, smoke less, launch one personal project asset.",
      "Week focus: application volume + Nayam ad delivery.",
    ]
  );
  const wpId = wp.lastInsertRowid;

  // ---- Daily plans + blocks for the whole week ----
  type BlockSpec = [
    name: string, domain: string, etype: string | null, eid: number | null,
    start: string, end: string, goal: string, criteria: string, reminder: string
  ];
  const dayBlocks = (d: string): BlockSpec[] => {
    const base: BlockSpec[] = [
      ["Morning activation", "body", null, null, "07:45", "08:15",
        "Wake the body: stretch, water, 10 push-ups, no phone.",
        "Stretch + push-ups done before first coffee.",
        "Body first. 10 push-ups, 5-minute stretch, water. Then the day starts."],
      ["Job sprint", "jobs", null, null, "08:30", "10:00",
        "5 applications, 1 tailored. Highest-leverage roles first.",
        "5 applications logged.",
        "No applications logged yet. Start one clean application now. Reply START."],
      ["Recovery block", "body", null, null, "10:00", "10:20",
        "Walk outside or stretch. No screens.",
        "20 minutes away from the desk.",
        "Step away. 20-minute walk. The next block needs a fresh head."],
      ["Client sprint — Nayam", "client", "client", nayam, "10:30", "12:30",
        "Finish wedding lead-gen ad set + captions.",
        "Ad set shipped to Nayam.",
        "Client block. Nayam ads. 2 hours, ship the ad set. Reply START."],
      ["Own project — Alex OS", "project", "project", alexOs, "14:00", "15:30",
        "90 minutes on Alex OS. One shippable improvement.",
        "One improvement committed.",
        "Project block: Alex OS. 90 minutes. One shippable improvement. Start."],
      ["Body block", "body", null, null, "18:00", "18:40",
        "Home workout or long walk.",
        "Workout or 40-minute walk logged.",
        "Body minimum: 10 push-ups, 5 minutes stretch, 10-minute walk. Shrink it if needed, but don't skip it."],
      ["Evening review", "journal", null, null, "22:00", "22:20",
        "Journal + end-of-day review. Score the day.",
        "Journal written, day scored.",
        "Close the day. 5 lines in the journal, score the day, set tomorrow's first block."],
    ];
    return base.map((b, i) => {
      if (i === 3) {
        const dow = new Date(d + "T12:00:00").getDay();
        const rotation: [string, string, number][] = [
          ["Client sprint — Nayam", "Finish wedding lead-gen ad set + captions.", nayam],
          ["Client sprint — SI Lounge", "SI Lounge reels: shoot list + 2 captions.", siLounge],
          ["Client sprint — The Saint", "The Saint: 2 reel concepts + cocktail captions.", saint],
          ["Client sprint — Sanki", "Sanki: funny ramen reel + captions.", sanki],
        ];
        const pick = rotation[dow % 4];
        return [pick[0], "client", "client", pick[2], b[4], b[5], pick[1], b[7],
          `Client block. ${pick[0].replace("Client sprint — ", "")}. 2 hours. Ship it. Reply START.`] as BlockSpec;
      }
      return b;
    });
  };

  const missionFor = (i: number) =>
    [
      "Volume day: 5 applications before noon, ship the Nayam ad set.",
      "Tailored day: 2 tailored applications + SI Lounge reels shot.",
      "Ship day: client deliverables out the door by 15:00.",
      "Build day: 2 project blocks. Protect them.",
      "Close-the-loop day: follow-ups, invoicing, loose ends.",
      "Reset day: body, long walk, light planning.",
      "CEO day: weekly review + next sprint plan.",
    ][i];

  for (let i = 0; i < 7; i++) {
    const d = addDays(wkStart, i);
    const dp = await run(
      "INSERT INTO daily_plans (weekly_plan_id, date, mission, status) VALUES (?,?,?,?)",
      [wpId, d, missionFor(i), d < today ? "done" : "planned"]
    );
    const dpId = dp.lastInsertRowid;
    const past = d < today;
    const blocks = dayBlocks(d);
    for (let idx = 0; idx < blocks.length; idx++) {
      const b = blocks[idx];
      let status = "upcoming";
      let actual = 0;
      if (past) {
        const missed = (i * 7 + idx) % 9 === 5;
        status = missed ? "missed" : "completed";
        actual = missed ? 0 : Math.round(timeDiff(b[4], b[5]) * (0.8 + ((i + idx) % 3) * 0.1));
      }
      await run(
        `INSERT INTO work_blocks (daily_plan_id, date, name, domain, entity_type, entity_id, start_time, end_time, goal, rules, completion_criteria, reminder_copy, status, actual_minutes, sort)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [dpId, d, b[0], b[1], b[2], b[3], b[4], b[5], b[6], "", b[7], b[8], status, actual, idx]
      );
    }
  }

  // ---- Tasks ----
  const insTask = (args: InValue[]) =>
    run(
      `INSERT INTO tasks (title, notes, domain, entity_type, entity_id, entity_name, priority, effort_min, due_date, status, scheduled_date, recurring)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      args
    );
  await insTask(["Finish Nayam wedding ad set", "3 ad variations + audience setup", "client", "client", nayam, "Nayam Events", 1, 120, today, "today", today, 0]);
  await insTask(["SI Lounge — 2 reels + captions", "Garden angle, corporate offer teaser", "client", "client", siLounge, "SI Lounge", 2, 90, addDays(today, 1), "scheduled", addDays(today, 1), 0]);
  await insTask(["The Saint — 'who is she' reel concept", "Write 3 hooks, pick 1", "client", "client", saint, "The Saint Cocktail Bar", 2, 45, addDays(today, 2), "scheduled", addDays(today, 2), 0]);
  await insTask(["Sanki — funny ramen caption batch", "5 captions, absurd tone", "client", "client", sanki, "Sanki Ramen Bar", 3, 30, addDays(today, 3), "scheduled", addDays(today, 3), 0]);
  await insTask(["Apply to 5 growth roles", "Prioritize remote EU/US", "jobs", null, null, null, 1, 90, today, "today", today, 1]);
  await insTask(["Tailor CV for top 2 roles", "Rewrite summary per role", "jobs", null, null, null, 1, 60, today, "today", today, 0]);
  await insTask(["Alex OS — wire Telegram reminders", "Bot token + schedule", "project", "project", alexOs, "Alex OS", 1, 90, addDays(today, 1), "scheduled", addDays(today, 1), 0]);
  await insTask(["Job automation — resume tailoring prompts", "Draft 3 prompt templates", "project", "project", jobAuto, "AI job automation", 2, 60, null, "inbox", null, 0]);
  await insTask(["Perpetuum — offer one-pager", "Positioning + first asset", "project", "project", perpetuum, "Perpetuum / health platform", 2, 60, null, "backlog", null, 0]);
  await insTask(["Order protein + creatine", "", "body", null, null, null, 3, 15, null, "inbox", null, 0]);
  await insTask(["Invoice SI Lounge for May", "", "admin", null, null, null, 2, 20, addDays(today, 1), "scheduled", addDays(today, 1), 0]);

  // ---- Check-ins: past 10 days + today partial ----
  const insCheck = (args: InValue[]) =>
    run("INSERT INTO check_ins (date, type, value, note, source, created_at) VALUES (?,?,?,?,?,?)", args);
  for (let i = 10; i >= 1; i--) {
    const d = addDays(today, -i);
    const good = i % 3 !== 0;
    await insCheck([d, "jobs", good ? 4 + (i % 3) : 2, "", "seed", d + " 11:30:00"]);
    if (i % 2 === 0) await insCheck([d, "tailored", 1, "", "seed", d + " 11:45:00"]);
    await insCheck([d, "client_minutes", good ? 120 : 60, "", "seed", d + " 16:00:00"]);
    if (good) await insCheck([d, "project_minutes", 90, "", "seed", d + " 20:00:00"]);
    await insCheck([d, "walk", 1, "", "seed", d + " 18:30:00"]);
    if (i % 2 === 0) await insCheck([d, "workout", 1, "", "seed", d + " 18:40:00"]);
    if (i % 2 === 1) await insCheck([d, "meditation", 1, "", "seed", d + " 08:00:00"]);
    await insCheck([d, "smoke", Math.max(6, 14 - i), "", "seed", d + " 21:00:00"]);
    await insCheck([d, "mood", 5 + (i % 4), "", "seed", d + " 22:00:00"]);
    await insCheck([d, "energy", 5 + ((i + 1) % 4), "", "seed", d + " 22:00:00"]);
  }
  await insCheck([today, "jobs", 2, "Applied via LinkedIn", "seed", today + " 09:40:00"]);
  await insCheck([today, "meditation", 1, "", "seed", today + " 08:05:00"]);
  await insCheck([today, "smoke", 3, "", "seed", today + " 12:00:00"]);

  // ---- Journal entries for past days ----
  const insJournal = (args: InValue[]) =>
    run(
      `INSERT INTO journal_entries (date, moved, avoided, trigger, proud, tomorrow_first_block, one_truth)
       VALUES (?,?,?,?,?,?,?)`,
      args
    );
  await insJournal([addDays(today, -1),
    "5 applications, Nayam captions shipped, 40-min walk.",
    "Tailoring the CV for the senior role.",
    "Opened Instagram after lunch — lost 50 minutes.",
    "Kept the morning job sprint clean.",
    "Job sprint 08:30 — 5 applications.",
    "Volume is fine. Quality applications are what I'm dodging."]);
  await insJournal([addDays(today, -2),
    "Client work done early. 2 project blocks on Alex OS.",
    "Follow-up emails.",
    "Late start — snoozed twice.",
    "Push-ups + walk despite low energy.",
    "Morning activation 07:45.",
    "The day is decided before 09:00."]);
  await insJournal([addDays(today, -3),
    "SI Lounge reels shipped. 3 applications.",
    "Perpetuum one-pager. Again.",
    "News scrolling with coffee.",
    "Said no to a low-value meeting.",
    "Job sprint first.",
    "If it's not scheduled, it doesn't happen."]);

  // ---- Daily scores for past days ----
  const scoreSeed: [number, number, string][] = [
    [1, 78, "silver"], [2, 71, "silver"], [3, 52, "bronze"], [4, 84, "gold"],
    [5, 66, "bronze"], [6, 43, "below"], [7, 74, "silver"], [8, 69, "bronze"],
    [9, 81, "silver"], [10, 58, "bronze"],
  ];
  for (const [off, sc, lvl] of scoreSeed) {
    const d = addDays(today, -off);
    await run(
      `INSERT INTO daily_scores (date, score, level, breakdown, hard_truth, adjustment, mvw)
       VALUES (?,?,?,?,?,?,?)`,
      [d, sc, lvl,
        JSON.stringify({ jobs: Math.round(sc * 0.25), client: Math.round(sc * 0.2), project: Math.round(sc * 0.2), body: Math.round(sc * 0.15), smoking: Math.round(sc * 0.1), journal: Math.round(sc * 0.1) }),
        "", "", ""]
    );
  }

  // ---- Job applications (Gmail-detected, mock) ----
  const insApp = (args: InValue[]) =>
    run(
      `INSERT INTO job_applications (company, role, applied_date, source, status, confidence, review_state, email_subject, sender, gmail_message_id, gmail_thread_id, last_email_date, reply_type, next_action)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args
    );
  await insApp(["OLIPOP", "Growth Marketing Lead", addDays(today, -4), "Greenhouse", "applied", 0.95, "auto",
    "Thank you for applying to OLIPOP!", "no-reply@greenhouse.io", "mock-msg-001", "mock-thr-001", addDays(today, -4), "", "Follow up in 5 days"]);
  await insApp(["Austin Bazaar", "Amazon Marketplace Performance Manager", addDays(today, -3), "Indeed", "applied", 0.92, "auto",
    "Your application has been submitted — Austin Bazaar", "apply@indeed.com", "mock-msg-002", "mock-thr-002", addDays(today, -3), "", ""]);
  const repliedApp = await insApp(["Northbeam", "Senior Growth Marketing Manager", addDays(today, -7), "Lever", "interview", 0.97, "auto",
    "We received your application — Northbeam", "no-reply@lever.co", "mock-msg-003", "mock-thr-003", addDays(today, -1), "Interview", "Reply with availability today"]);
  await insApp(["Deel", "Performance Marketing Manager", addDays(today, -8), "Ashby", "rejected", 0.94, "auto",
    "Update on your application to Deel", "talent@deel.com", "mock-msg-004", "mock-thr-004", addDays(today, -2), "Rejection", "Archive"]);
  await insApp(["Remote-first Startup", "Head of Marketing (maybe)", addDays(today, -1), "LinkedIn", "applied", 0.55, "pending",
    "Thanks for your interest", "jobs-noreply@linkedin.com", "mock-msg-005", "mock-thr-005", addDays(today, -1), "", ""]);
  await insApp(["Whoop", "Growth Lead, EMEA", today, "Workday", "applied", 0.9, "auto",
    "Application received — WHOOP", "whoop@myworkday.com", "mock-msg-006", "mock-thr-006", today, "", ""]);

  await run(
    "INSERT INTO job_application_events (application_id, ts, type, detail) VALUES (?,?,?,?)",
    [repliedApp.lastInsertRowid, addDays(today, -1) + " 14:22:00", "interview",
      "Recruiter: 'We'd like to invite you to a 30-minute intro call this week.'"]
  );

  // ---- Gmail connection (mock) ----
  await run(
    "INSERT INTO gmail_connections (id, email, status, last_sync, scan_start) VALUES (1, '', 'disconnected', '', ?)",
    [addDays(today, -30)]
  );

  // ---- Reminders ----
  const insRem = (time: string, label: string, message: string) =>
    run("INSERT INTO reminders (time, label, message, enabled, days) VALUES (?,?,?,1,'[1,2,3,4,5]')", [time, label, message]);
  await insRem("08:25", "Job sprint", "No applications logged yet. Start one clean application now. Reply START.");
  await insRem("10:25", "Client block", "Client block starts in 5. Protect it. Reply START when you begin.");
  await insRem("13:55", "Project block", "90 minutes on your own thing. This is how the escape gets built. Start.");
  await insRem("17:55", "Body block", "Body minimum: 10 push-ups, 5 minutes stretch, 10-minute walk. Shrink it if needed, but don't skip it.");
  await insRem("21:55", "Evening review", "Close the day. Journal + score. 10 minutes. Reply DONE after.");

  // ---- Telegram message history (example) ----
  const insTg = (args: InValue[]) =>
    run("INSERT INTO telegram_messages (ts, direction, text, command, status) VALUES (?,?,?,?,?)", args);
  await insTg([addDays(today, -1) + " 08:25:00", "out", "No applications logged yet. Start one clean application now. Reply START.", "reminder", "sent"]);
  await insTg([addDays(today, -1) + " 08:31:00", "in", "start", "start", "processed"]);
  await insTg([addDays(today, -1) + " 10:05:00", "in", "jobs 3", "jobs", "processed"]);
  await insTg([addDays(today, -1) + " 14:23:00", "out", "Job update detected: Northbeam — Senior Growth Marketing Manager. Type: Interview. Open in Alex OS.", "job_alert", "sent"]);
  await insTg([addDays(today, -1) + " 21:58:00", "out", "Close the day. Journal + score. 10 minutes. Reply DONE after.", "reminder", "sent"]);
  await insTg([addDays(today, -1) + " 22:14:00", "in", "smoked 8", "smoked", "processed"]);

  // ---- Derail event (example) ----
  await run(
    "INSERT INTO derail_events (ts, trigger, reset_choice, outcome, related) VALUES (?,?,?,?,?)",
    [addDays(today, -3) + " 15:10:00", "Overwhelmed after checking bank account", "25-minute work sprint", "Completed sprint, mood recovered", "Client sprint — Nayam"]
  );

  // ---- Weekly review (last week, example) ----
  await run(
    `INSERT INTO weekly_reviews (week_start, stats, best_day, worst_day, derail_trigger, double_down, kill, next_week)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      addDays(wkStart, -7),
      JSON.stringify({
        jobs_applied: 24, tailored: 4, follow_ups: 3, client_hours: 11.5,
        client_shipped: 6, project_hours: 6, assets_shipped: 0, blocks_completed: 31,
        workouts: 3, walks: 6, meditations: 4, smoking_avg: 11.2, avg_score: 64,
      }),
      addDays(wkStart, -3),
      addDays(wkStart, -5),
      "Afternoon phone drift after lunch",
      "Morning job sprints — every completed one produced a strong day.",
      "Late-night planning sessions. They feel productive and produce nothing.",
      "35 applications, 6 tailored. Ship Nayam ads by Wednesday. One project asset live by Sunday.",
    ]
  );
}

function timeDiff(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}
