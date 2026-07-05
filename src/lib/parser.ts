import { q } from "./db";
import type { Domain } from "./types";
import { safeJson } from "./scoring";

export interface ParsedTask {
  title: string;
  domain: Domain;
  entity_type: "client" | "project" | null;
  entity_id: number | null;
  entity_name: string | null;
  priority: number;
  effort_min: number;
  recurring: boolean;
}

interface AliasEntry {
  alias: string;
  entity_type: "client" | "project";
  entity_id: number;
  entity_name: string;
}

/** Build the alias map from the knowledge base (client/project names + aliases + alias table). */
export async function getAliasMap(): Promise<AliasEntry[]> {
  const out: AliasEntry[] = [];
  const clients = await q("SELECT id, name, aliases FROM clients").all<{ id: number; name: string; aliases: string }>();
  for (const c of clients) {
    out.push({ alias: c.name.toLowerCase(), entity_type: "client", entity_id: c.id, entity_name: c.name });
    for (const a of safeJson<string[]>(c.aliases, [])) {
      out.push({ alias: a.toLowerCase(), entity_type: "client", entity_id: c.id, entity_name: c.name });
    }
  }
  const projects = await q("SELECT id, name, aliases FROM projects").all<{ id: number; name: string; aliases: string }>();
  for (const p of projects) {
    out.push({ alias: p.name.toLowerCase(), entity_type: "project", entity_id: p.id, entity_name: p.name });
    for (const a of safeJson<string[]>(p.aliases, [])) {
      out.push({ alias: a.toLowerCase(), entity_type: "project", entity_id: p.id, entity_name: p.name });
    }
  }
  const extra = await q("SELECT alias, entity_type, entity_id FROM entity_aliases").all<{ alias: string; entity_type: "client" | "project"; entity_id: number }>();
  const clientNames = new Map(clients.map((c) => [c.id, c.name]));
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));
  for (const e of extra) {
    const name = e.entity_type === "client" ? clientNames.get(e.entity_id) : projectNames.get(e.entity_id);
    if (name) out.push({ alias: e.alias.toLowerCase(), entity_type: e.entity_type, entity_id: e.entity_id, entity_name: name });
  }
  // Longest aliases first so "si lounge" wins over "si"
  return out.sort((a, b) => b.alias.length - a.alias.length);
}

const DOMAIN_KEYWORDS: [Domain, string[]][] = [
  ["jobs", ["job", "apply", "application", "cv", "resume", "recruiter", "interview", "linkedin", "cover letter", "tailor"]],
  ["body", ["workout", "work out", "gym", "walk", "run", "stretch", "push-up", "pushup", "meditat", "sleep", "protein", "smok", "cigarette", "yoga", "train"]],
  ["client", ["client", "ad", "ads", "reel", "caption", "content", "campaign", "post", "deliverable", "brief", "shoot"]],
  ["project", ["build", "launch", "mvp", "automation", "app", "product", "asset", "code", "prototype", "ship"]],
  ["admin", ["invoice", "email", "tax", "bank", "pay", "bill", "book", "schedule", "call", "order", "renew", "admin"]],
  ["emotional", ["journal", "reflect", "worry", "anxious", "stress", "feel", "mood", "avoid"]],
];

function matchEntity(text: string, aliases: AliasEntry[]): AliasEntry | null {
  const lower = text.toLowerCase();
  for (const a of aliases) {
    const re = new RegExp(`\\b${escapeRegex(a.alias)}\\b`, "i");
    if (re.test(lower)) return a;
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectDomain(text: string, entity: AliasEntry | null): Domain {
  if (entity) return entity.entity_type === "client" ? "client" : "project";
  const lower = text.toLowerCase();
  for (const [domain, words] of DOMAIN_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return domain;
  }
  return "backlog";
}

function detectPriority(text: string): number {
  const lower = text.toLowerCase();
  if (/(urgent|asap|must|deadline|today|critical|now)/.test(lower)) return 1;
  if (/(someday|maybe|later|eventually|idea)/.test(lower)) return 3;
  return 2;
}

function detectEffort(text: string, domain: Domain): number {
  const m = text.match(/(\d+)\s*(min|minute|m\b)/i);
  if (m) return parseInt(m[1], 10);
  const h = text.match(/(\d+(?:\.\d+)?)\s*(h|hour|hr)/i);
  if (h) return Math.round(parseFloat(h[1]) * 60);
  if (domain === "client" || domain === "project") return 90;
  if (domain === "jobs") return 60;
  if (domain === "admin") return 20;
  return 45;
}

function detectRecurring(text: string): boolean {
  return /(every day|daily|every morning|each day|every week|weekly|recurring)/i.test(text);
}

/** Split messy input into task-sized fragments. */
export function splitMessy(input: string): string[] {
  return input
    .split(/\n|[.;]\s+|,\s+(?:and\s+)?|\s+and\s+(?=\w)/i)
    .map((s) => s.trim().replace(/^(i need to|i should|i want to|need to|have to|must|also|then|plus)\s+/i, ""))
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

/** Deterministic parse of messy input into categorized tasks using the knowledge base. */
export async function parseMessyInput(input: string): Promise<ParsedTask[]> {
  const aliases = await getAliasMap();
  return splitMessy(input).map((fragment) => {
    const entity = matchEntity(fragment, aliases);
    const domain = detectDomain(fragment, entity);
    return {
      title: capitalize(fragment),
      domain,
      entity_type: entity?.entity_type ?? null,
      entity_id: entity?.entity_id ?? null,
      entity_name: entity?.entity_name ?? null,
      priority: detectPriority(fragment),
      effort_min: detectEffort(fragment, domain),
      recurring: detectRecurring(fragment),
    };
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
