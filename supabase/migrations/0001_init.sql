-- Alex OS — Postgres/Supabase schema (phase 2 target).
-- The v1 app runs on a local SQLite database with this same shape
-- (see src/lib/db.ts). When moving to Supabase, port the data layer
-- to these tables and add RLS policies keyed on user_id.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz default now()
);

create table if not exists settings (
  id bigint primary key,
  user_id uuid references users(id),
  wake_time text default '07:30',
  sleep_time text default '23:30',
  work_capacity_hours real default 8,
  assistant_tone text default 'firm-tactical',
  score_weights jsonb default '{"jobs":25,"client":20,"project":20,"body":15,"smoking":10,"journal":10}',
  telegram_chat_id text default '',
  telegram_enabled boolean default false,
  reminder_windows jsonb default '[]',
  block_default_minutes int default 90
);

create table if not exists sprints (
  id bigint generated always as identity primary key,
  user_id uuid references users(id),
  name text not null,
  main_outcome text default '',
  king_metric text default '',
  secondary_metrics jsonb default '[]',
  constraints text default '',
  start_date date not null,
  end_date date not null,
  wake_time text default '07:30',
  sleep_time text default '23:30',
  work_capacity_hours real default 8,
  assistant_tone text default 'firm-tactical',
  smoking_plan text default '',
  body_goals text default '',
  goals jsonb default '[]',
  status text default 'active'
);

create table if not exists weekly_plans (
  id bigint generated always as identity primary key,
  sprint_id bigint references sprints(id),
  week_start date not null,
  targets jsonb default '{}',
  status text default 'draft',
  messy_input text default '',
  notes text default ''
);

create table if not exists daily_plans (
  id bigint generated always as identity primary key,
  weekly_plan_id bigint references weekly_plans(id),
  date date not null unique,
  mission text default '',
  status text default 'planned',
  adaptation_note text default ''
);

create table if not exists work_blocks (
  id bigint generated always as identity primary key,
  daily_plan_id bigint references daily_plans(id),
  date date not null,
  name text not null,
  domain text default 'admin',
  entity_type text,
  entity_id bigint,
  start_time text default '09:00',
  end_time text default '10:00',
  goal text default '',
  rules text default '',
  completion_criteria text default '',
  reminder_copy text default '',
  status text default 'upcoming',
  actual_minutes int default 0,
  result text default '',
  sort int default 0
);
create index if not exists idx_blocks_date on work_blocks(date);

create table if not exists tasks (
  id bigint generated always as identity primary key,
  title text not null,
  notes text default '',
  domain text default 'backlog',
  entity_type text,
  entity_id bigint,
  entity_name text,
  priority int default 2,
  effort_min int default 45,
  due_date date,
  status text default 'inbox',
  scheduled_date date,
  recurring boolean default false,
  created_at timestamptz default now()
);

create table if not exists clients (
  id bigint generated always as identity primary key,
  name text not null,
  aliases jsonb default '[]',
  type text default '',
  description text default '',
  priority int default 2,
  active boolean default true,
  weekly_target_hours real default 4,
  recurring_deliverables jsonb default '[]',
  brand_voice text default '',
  notes text default '',
  links text default ''
);

create table if not exists personal_projects (
  id bigint generated always as identity primary key,
  name text not null,
  aliases jsonb default '[]',
  description text default '',
  category text default '',
  priority text default 'medium',
  status text default 'active',
  outcome_60d text default '',
  weekly_block_target int default 2,
  milestone text default '',
  next_actions text default '',
  notes text default ''
);

create table if not exists fitness_profiles (
  id bigint primary key,
  goal text default '',
  workout_type text default '',
  constraints text default '',
  preferred_habits text default '',
  weekly_targets jsonb default '{}',
  smoking_goal text default '',
  smoking_daily_target int default 10,
  no_smoke_before text default '10:00',
  walking_target text default '',
  meditation_target text default ''
);

create table if not exists assistant_rules (
  id bigint generated always as identity primary key,
  name text not null,
  description text default '',
  domain text default 'general',
  priority int default 2
);

create table if not exists entity_aliases (
  id bigint generated always as identity primary key,
  alias text not null,
  entity_type text not null,
  entity_id bigint not null
);

create table if not exists recurring_deliverables (
  id bigint generated always as identity primary key,
  client_id bigint references clients(id),
  name text not null,
  cadence text default 'weekly',
  notes text default ''
);

create table if not exists habits (
  id bigint generated always as identity primary key,
  key text unique not null,
  name text not null,
  domain text default 'body',
  target text default '',
  unit text default '',
  icon text default ''
);

create table if not exists check_ins (
  id bigint generated always as identity primary key,
  date date not null,
  type text not null,
  value real default 1,
  note text default '',
  source text default 'app',
  created_at timestamptz default now()
);
create index if not exists idx_checkins_date on check_ins(date);

create table if not exists habit_logs (
  id bigint generated always as identity primary key,
  habit_id bigint references habits(id),
  date date not null,
  value real default 1,
  note text default ''
);

create table if not exists journal_entries (
  id bigint generated always as identity primary key,
  date date not null unique,
  moved text default '',
  avoided text default '',
  trigger text default '',
  proud text default '',
  tomorrow_first_block text default '',
  one_truth text default '',
  created_at timestamptz default now()
);

create table if not exists daily_scores (
  id bigint generated always as identity primary key,
  date date not null unique,
  score int default 0,
  level text default 'below',
  breakdown jsonb default '{}',
  hard_truth text default '',
  adjustment text default '',
  mvw text default ''
);

create table if not exists weekly_reviews (
  id bigint generated always as identity primary key,
  week_start date not null unique,
  stats jsonb default '{}',
  best_day text default '',
  worst_day text default '',
  derail_trigger text default '',
  double_down text default '',
  kill text default '',
  next_week text default '',
  created_at timestamptz default now()
);

create table if not exists derail_events (
  id bigint generated always as identity primary key,
  ts timestamptz default now(),
  trigger text default '',
  reset_choice text default '',
  outcome text default '',
  related text default ''
);

create table if not exists telegram_messages (
  id bigint generated always as identity primary key,
  ts timestamptz default now(),
  direction text default 'out',
  text text default '',
  command text default '',
  status text default 'sent'
);

create table if not exists reminders (
  id bigint generated always as identity primary key,
  time text not null,
  label text default '',
  message text default '',
  enabled boolean default true,
  days jsonb default '[0,1,2,3,4,5,6]'
);

-- Gmail / Jobs
create table if not exists gmail_connections (
  id bigint primary key,
  email text default '',
  status text default 'disconnected',
  tokens jsonb,
  last_sync timestamptz,
  scan_start date,
  included_keywords text default '',
  excluded_keywords text default '',
  ignored_senders text default '',
  ignored_companies text default ''
);

create table if not exists gmail_sync_runs (
  id bigint generated always as identity primary key,
  ts timestamptz default now(),
  mode text default 'manual',
  scanned int default 0,
  detected int default 0,
  notes text default ''
);

create table if not exists gmail_detected_messages (
  id bigint generated always as identity primary key,
  gmail_message_id text unique,
  gmail_thread_id text,
  subject text default '',
  sender text default '',
  received_at timestamptz,
  classification text default '',
  confidence real default 0
);

create table if not exists job_applications (
  id bigint generated always as identity primary key,
  company text not null,
  role text default '',
  applied_date date not null,
  source text default '',
  status text default 'applied',
  confidence real default 1,
  review_state text default 'auto',
  email_subject text default '',
  sender text default '',
  gmail_message_id text default '',
  gmail_thread_id text default '',
  last_email_date date,
  reply_type text default '',
  next_action text default '',
  notes text default ''
);

create table if not exists job_application_events (
  id bigint generated always as identity primary key,
  application_id bigint references job_applications(id),
  ts timestamptz default now(),
  type text default '',
  detail text default ''
);

create table if not exists job_reply_alerts (
  id bigint generated always as identity primary key,
  application_id bigint references job_applications(id),
  ts timestamptz default now(),
  reply_type text default '',
  sent_via text default 'telegram',
  status text default 'sent'
);

create table if not exists job_detection_rules (
  id bigint generated always as identity primary key,
  pattern text not null,
  kind text default 'application',
  enabled boolean default true
);

create table if not exists ignored_email_senders (
  id bigint generated always as identity primary key,
  sender text not null
);

create table if not exists ignored_job_companies (
  id bigint generated always as identity primary key,
  company text not null
);
