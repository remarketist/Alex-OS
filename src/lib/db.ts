import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { seed } from "./seed";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  wake_time TEXT DEFAULT '07:30',
  sleep_time TEXT DEFAULT '23:30',
  work_capacity_hours REAL DEFAULT 8,
  assistant_tone TEXT DEFAULT 'firm-tactical',
  score_weights TEXT DEFAULT '{"jobs":25,"client":20,"project":20,"body":15,"smoking":10,"journal":10}',
  telegram_chat_id TEXT DEFAULT '',
  telegram_enabled INTEGER DEFAULT 0,
  reminder_windows TEXT DEFAULT '[]',
  block_default_minutes INTEGER DEFAULT 90
);

CREATE TABLE IF NOT EXISTS sprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  main_outcome TEXT DEFAULT '',
  king_metric TEXT DEFAULT '',
  secondary_metrics TEXT DEFAULT '[]',
  constraints TEXT DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  wake_time TEXT DEFAULT '07:30',
  sleep_time TEXT DEFAULT '23:30',
  work_capacity_hours REAL DEFAULT 8,
  assistant_tone TEXT DEFAULT 'firm-tactical',
  smoking_plan TEXT DEFAULT '',
  body_goals TEXT DEFAULT '',
  goals TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS weekly_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sprint_id INTEGER,
  week_start TEXT NOT NULL,
  targets TEXT DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  messy_input TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS daily_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekly_plan_id INTEGER,
  date TEXT NOT NULL UNIQUE,
  mission TEXT DEFAULT '',
  status TEXT DEFAULT 'planned',
  adaptation_note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS work_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  daily_plan_id INTEGER,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT DEFAULT 'admin',
  entity_type TEXT,
  entity_id INTEGER,
  start_time TEXT DEFAULT '09:00',
  end_time TEXT DEFAULT '10:00',
  goal TEXT DEFAULT '',
  rules TEXT DEFAULT '',
  completion_criteria TEXT DEFAULT '',
  reminder_copy TEXT DEFAULT '',
  status TEXT DEFAULT 'upcoming',
  actual_minutes INTEGER DEFAULT 0,
  result TEXT DEFAULT '',
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  domain TEXT DEFAULT 'backlog',
  entity_type TEXT,
  entity_id INTEGER,
  entity_name TEXT,
  priority INTEGER DEFAULT 2,
  effort_min INTEGER DEFAULT 45,
  due_date TEXT,
  status TEXT DEFAULT 'inbox',
  scheduled_date TEXT,
  recurring INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  aliases TEXT DEFAULT '[]',
  type TEXT DEFAULT '',
  description TEXT DEFAULT '',
  priority INTEGER DEFAULT 2,
  active INTEGER DEFAULT 1,
  weekly_target_hours REAL DEFAULT 4,
  recurring_deliverables TEXT DEFAULT '[]',
  brand_voice TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  links TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  aliases TEXT DEFAULT '[]',
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'active',
  outcome_60d TEXT DEFAULT '',
  weekly_block_target INTEGER DEFAULT 2,
  milestone TEXT DEFAULT '',
  next_actions TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS fitness_profiles (
  id INTEGER PRIMARY KEY,
  goal TEXT DEFAULT '',
  workout_type TEXT DEFAULT '',
  constraints TEXT DEFAULT '',
  preferred_habits TEXT DEFAULT '',
  weekly_targets TEXT DEFAULT '{}',
  smoking_goal TEXT DEFAULT '',
  smoking_daily_target INTEGER DEFAULT 10,
  no_smoke_before TEXT DEFAULT '10:00',
  walking_target TEXT DEFAULT 'Daily 20-minute walk',
  meditation_target TEXT DEFAULT '10 minutes daily'
);

CREATE TABLE IF NOT EXISTS assistant_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  domain TEXT DEFAULT 'general',
  priority INTEGER DEFAULT 2
);

CREATE TABLE IF NOT EXISTS entity_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alias TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  domain TEXT DEFAULT 'body',
  target TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  icon TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS check_ins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  value REAL DEFAULT 1,
  note TEXT DEFAULT '',
  source TEXT DEFAULT 'app',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON check_ins(date);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  moved TEXT DEFAULT '',
  avoided TEXT DEFAULT '',
  trigger TEXT DEFAULT '',
  proud TEXT DEFAULT '',
  tomorrow_first_block TEXT DEFAULT '',
  one_truth TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  score INTEGER DEFAULT 0,
  level TEXT DEFAULT 'below',
  breakdown TEXT DEFAULT '{}',
  hard_truth TEXT DEFAULT '',
  adjustment TEXT DEFAULT '',
  mvw TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS weekly_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL UNIQUE,
  stats TEXT DEFAULT '{}',
  best_day TEXT DEFAULT '',
  worst_day TEXT DEFAULT '',
  derail_trigger TEXT DEFAULT '',
  double_down TEXT DEFAULT '',
  kill TEXT DEFAULT '',
  next_week TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS derail_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT DEFAULT (datetime('now')),
  trigger TEXT DEFAULT '',
  reset_choice TEXT DEFAULT '',
  outcome TEXT DEFAULT '',
  related TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS telegram_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT DEFAULT (datetime('now')),
  direction TEXT DEFAULT 'out',
  text TEXT DEFAULT '',
  command TEXT DEFAULT '',
  status TEXT DEFAULT 'sent'
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time TEXT NOT NULL,
  label TEXT DEFAULT '',
  message TEXT DEFAULT '',
  enabled INTEGER DEFAULT 1,
  days TEXT DEFAULT '[0,1,2,3,4,5,6]'
);

CREATE TABLE IF NOT EXISTS gmail_connections (
  id INTEGER PRIMARY KEY,
  email TEXT DEFAULT '',
  status TEXT DEFAULT 'disconnected',
  tokens TEXT DEFAULT '',
  last_sync TEXT DEFAULT '',
  scan_start TEXT DEFAULT '',
  included_keywords TEXT DEFAULT '',
  excluded_keywords TEXT DEFAULT '',
  ignored_senders TEXT DEFAULT '',
  ignored_companies TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS gmail_sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT DEFAULT (datetime('now')),
  mode TEXT DEFAULT 'manual',
  scanned INTEGER DEFAULT 0,
  detected INTEGER DEFAULT 0,
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  role TEXT DEFAULT '',
  applied_date TEXT NOT NULL,
  source TEXT DEFAULT '',
  status TEXT DEFAULT 'applied',
  confidence REAL DEFAULT 1,
  review_state TEXT DEFAULT 'auto',
  email_subject TEXT DEFAULT '',
  sender TEXT DEFAULT '',
  gmail_message_id TEXT DEFAULT '',
  gmail_thread_id TEXT DEFAULT '',
  last_email_date TEXT DEFAULT '',
  reply_type TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS job_application_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER,
  ts TEXT DEFAULT (datetime('now')),
  type TEXT DEFAULT '',
  detail TEXT DEFAULT ''
);
`;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "alexos.db");
  _db = new Database(file);
  _db.pragma("journal_mode = WAL");
  _db.exec(SCHEMA);
  const hasSprint = _db.prepare("SELECT COUNT(*) as c FROM sprints").get() as {
    c: number;
  };
  if (hasSprint.c === 0) seed(_db);
  return _db;
}
