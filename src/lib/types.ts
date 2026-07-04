// Core domain types for Alex OS

export type Domain =
  | "jobs"
  | "client"
  | "project"
  | "body"
  | "smoking"
  | "journal"
  | "admin"
  | "emotional"
  | "backlog";

export type BlockStatus =
  | "upcoming"
  | "active"
  | "completed"
  | "missed"
  | "rescheduled"
  | "shrunk";

export type TaskStatus =
  | "inbox"
  | "backlog"
  | "scheduled"
  | "today"
  | "done"
  | "killed";

export type DayLevel = "below" | "bronze" | "silver" | "gold";

export interface Sprint {
  id: number;
  name: string;
  main_outcome: string;
  king_metric: string;
  secondary_metrics: string; // JSON string[]
  constraints: string;
  start_date: string;
  end_date: string;
  wake_time: string;
  sleep_time: string;
  work_capacity_hours: number;
  assistant_tone: string;
  smoking_plan: string;
  body_goals: string;
  goals: string; // JSON string[]
  status: "active" | "completed" | "draft";
}

export interface WeeklyPlan {
  id: number;
  sprint_id: number;
  week_start: string;
  targets: string; // JSON WeeklyTargets
  status: "draft" | "active" | "completed";
  messy_input: string;
  notes: string;
}

export interface WeeklyTargets {
  job_applications: number;
  tailored_applications: number;
  follow_ups: number;
  client_hours: number;
  client_deliverables: number;
  project_hours: number;
  shipped_assets: number;
  workouts: number;
  walks: number;
  meditations: number;
  smoking_limit: number;
  journal_entries: number;
}

export interface DailyPlan {
  id: number;
  weekly_plan_id: number | null;
  date: string;
  mission: string;
  status: string;
  adaptation_note: string;
}

export interface WorkBlock {
  id: number;
  daily_plan_id: number | null;
  date: string;
  name: string;
  domain: Domain;
  entity_type: string | null;
  entity_id: number | null;
  start_time: string;
  end_time: string;
  goal: string;
  rules: string;
  completion_criteria: string;
  reminder_copy: string;
  status: BlockStatus;
  actual_minutes: number;
  result: string;
  sort: number;
}

export interface Task {
  id: number;
  title: string;
  notes: string;
  domain: Domain;
  entity_type: string | null; // 'client' | 'project'
  entity_id: number | null;
  entity_name: string | null;
  priority: number; // 1 high - 3 low
  effort_min: number;
  due_date: string | null;
  status: TaskStatus;
  scheduled_date: string | null;
  recurring: number; // 0/1
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  aliases: string; // JSON string[]
  type: string;
  description: string;
  priority: number;
  active: number;
  weekly_target_hours: number;
  recurring_deliverables: string; // JSON string[]
  brand_voice: string;
  notes: string;
  links: string;
}

export interface Project {
  id: number;
  name: string;
  aliases: string; // JSON string[]
  description: string;
  category: string;
  priority: string;
  status: string;
  outcome_60d: string;
  weekly_block_target: number;
  milestone: string;
  next_actions: string;
  notes: string;
}

export interface FitnessProfile {
  id: number;
  goal: string;
  workout_type: string;
  constraints: string;
  preferred_habits: string;
  weekly_targets: string; // JSON
  smoking_goal: string;
  smoking_daily_target: number;
  no_smoke_before: string;
  walking_target: string;
  meditation_target: string;
}

export interface AssistantRule {
  id: number;
  name: string;
  description: string;
  domain: string;
  priority: number;
}

export type CheckInType =
  | "workout"
  | "stretch"
  | "walk"
  | "meditation"
  | "smoke"
  | "mood"
  | "energy"
  | "sleep"
  | "jobs"
  | "tailored"
  | "followup"
  | "client_minutes"
  | "project_minutes"
  | "protein"
  | "shipped";

export interface CheckIn {
  id: number;
  date: string;
  type: CheckInType;
  value: number;
  note: string;
  source: "app" | "telegram" | "gmail" | "seed";
  created_at: string;
}

export interface JournalEntry {
  id: number;
  date: string;
  moved: string;
  avoided: string;
  trigger: string;
  proud: string;
  tomorrow_first_block: string;
  one_truth: string;
  created_at: string;
}

export interface DailyScore {
  id: number;
  date: string;
  score: number;
  level: DayLevel;
  breakdown: string; // JSON ScoreBreakdown
  hard_truth: string;
  adjustment: string;
  mvw: string;
}

export interface ScoreBreakdown {
  jobs: number;
  client: number;
  project: number;
  body: number;
  smoking: number;
  journal: number;
}

export interface DerailEvent {
  id: number;
  ts: string;
  trigger: string;
  reset_choice: string;
  outcome: string;
  related: string;
}

export interface TelegramMessage {
  id: number;
  ts: string;
  direction: "in" | "out";
  text: string;
  command: string;
  status: string;
}

export interface Reminder {
  id: number;
  time: string;
  label: string;
  message: string;
  enabled: number;
  days: string; // JSON number[] 0-6
}

export interface JobApplication {
  id: number;
  company: string;
  role: string;
  applied_date: string;
  source: string;
  status:
    | "applied"
    | "replied"
    | "interview"
    | "assessment"
    | "rejected"
    | "followup"
    | "offer"
    | "archived";
  confidence: number;
  review_state: "auto" | "pending" | "confirmed" | "ignored";
  email_subject: string;
  sender: string;
  gmail_message_id: string;
  gmail_thread_id: string;
  last_email_date: string;
  reply_type: string;
  next_action: string;
  notes: string;
}

export interface JobEvent {
  id: number;
  application_id: number;
  ts: string;
  type: string;
  detail: string;
}

export interface GmailConnection {
  id: number;
  email: string;
  status: "disconnected" | "connected" | "mock";
  last_sync: string;
  scan_start: string;
  included_keywords: string;
  excluded_keywords: string;
  ignored_senders: string;
  ignored_companies: string;
}

export interface EntityAlias {
  id: number;
  alias: string;
  entity_type: "client" | "project";
  entity_id: number;
}

export interface Settings {
  id: number;
  wake_time: string;
  sleep_time: string;
  work_capacity_hours: number;
  assistant_tone: string;
  score_weights: string; // JSON ScoreBreakdown-shaped weights
  telegram_chat_id: string;
  telegram_enabled: number;
  reminder_windows: string;
  block_default_minutes: number;
}
