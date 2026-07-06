"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import type { Client, Project, FitnessProfile, AssistantRule, EntityAlias } from "@/lib/types";

const TABS = ["Clients", "Projects", "Body", "Rules", "Aliases"] as const;

export function KnowledgeClient({
  clients, projects, fitness, rules, aliases,
}: {
  clients: Client[];
  projects: Project[];
  fitness: FitnessProfile;
  rules: AssistantRule[];
  aliases: EntityAlias[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Clients");

  const post = async (entity: string, body: Record<string, unknown>) => {
    await fetch(`/api/knowledge/${entity}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  };

  const del = async (entity: string, id: number) => {
    await fetch(`/api/knowledge/${entity}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        subtitle="Teach the system who you are, what you're building, and what matters."
      />

      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              tab === t
                ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
                : "border-white/10 text-mute hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Clients" && <ClientsTab clients={clients} onSave={(b) => post("clients", b)} onDelete={(id) => del("clients", id)} />}
      {tab === "Projects" && <ProjectsTab projects={projects} onSave={(b) => post("projects", b)} onDelete={(id) => del("projects", id)} />}
      {tab === "Body" && <FitnessTab fitness={fitness} onSave={(b) => post("fitness", b)} />}
      {tab === "Rules" && <RulesTab rules={rules} onSave={(b) => post("rules", b)} onDelete={(id) => del("rules", id)} />}
      {tab === "Aliases" && (
        <AliasesTab
          aliases={aliases}
          clients={clients}
          projects={projects}
          onSave={(b) => post("aliases", b)}
          onDelete={(id) => del("aliases", id)}
        />
      )}
    </div>
  );
}

// ---------- Clients ----------

function ClientsTab({ clients, onSave, onDelete }: { clients: Client[]; onSave: (b: Record<string, unknown>) => void; onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  return (
    <div className="space-y-3">
      <button onClick={() => setEditing("new")} className="btn btn-ghost text-[12.5px]">+ Add client</button>
      {editing === "new" && (
        <ClientForm onSave={(b) => { onSave(b); setEditing(null); }} onCancel={() => setEditing(null)} />
      )}
      {clients.map((c) => (
        <Card key={c.id} className="!p-4" hover>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-bold">{c.name}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10.5px] text-mute">{c.type}</span>
                {!c.active && <span className="text-[10.5px] font-bold uppercase text-faint">inactive</span>}
                <span className="font-mono text-[11px] text-violet-300/80">{c.weekly_target_hours}h/wk</span>
              </div>
              <p className="mt-1 text-[12.5px] text-mute">{c.description}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {parseList(c.recurring_deliverables).map((d, i) => (
                  <span key={i} className="rounded-md bg-violet-400/10 px-1.5 py-0.5 text-[10.5px] text-violet-300/90">{d}</span>
                ))}
              </div>
              {parseList(c.aliases).length > 0 && (
                <p className="mt-1.5 text-[11px] text-faint">aka: {parseList(c.aliases).join(", ")}</p>
              )}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setEditing(editing === c.id ? null : c.id)} className="btn btn-ghost !px-2.5 !py-1 text-[12px]">Edit</button>
              <button onClick={() => onDelete(c.id)} className="btn btn-danger !px-2.5 !py-1 text-[12px]">Delete</button>
            </div>
          </div>
          {editing === c.id && (
            <ClientForm client={c} onSave={(b) => { onSave({ ...b, id: c.id }); setEditing(null); }} onCancel={() => setEditing(null)} />
          )}
        </Card>
      ))}
    </div>
  );
}

function ClientForm({ client, onSave, onCancel }: { client?: Client; onSave: (b: Record<string, unknown>) => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: client?.name || "",
    type: client?.type || "",
    description: client?.description || "",
    priority: client?.priority ?? 2,
    active: client?.active ?? 1,
    weekly_target_hours: client?.weekly_target_hours ?? 4,
    aliases: parseList(client?.aliases).join(", "),
    recurring_deliverables: parseList(client?.recurring_deliverables).join("\n"),
    brand_voice: client?.brand_voice || "",
    notes: client?.notes || "",
  });
  return (
    <div className="mt-3 grid gap-3 border-t border-white/5 pt-4 sm:grid-cols-2">
      <div><label className="label">Name</label><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className="label">Type</label><input className="field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} /></div>
      <div className="sm:col-span-2"><label className="label">Description</label><textarea className="field min-h-[56px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div><label className="label">Aliases (comma separated)</label><input className="field" value={f.aliases} onChange={(e) => setF({ ...f, aliases: e.target.value })} /></div>
      <div className="grid grid-cols-3 gap-2">
        <div><label className="label">Priority</label><input type="number" min={1} max={3} className="field" value={f.priority} onChange={(e) => setF({ ...f, priority: Number(e.target.value) })} /></div>
        <div><label className="label">Hours/wk</label><input type="number" className="field" value={f.weekly_target_hours} onChange={(e) => setF({ ...f, weekly_target_hours: Number(e.target.value) })} /></div>
        <div><label className="label">Active</label><select className="field" value={f.active} onChange={(e) => setF({ ...f, active: Number(e.target.value) })}><option value={1}>Yes</option><option value={0}>No</option></select></div>
      </div>
      <div className="sm:col-span-2"><label className="label">Recurring deliverables (one per line)</label><textarea className="field min-h-[72px]" value={f.recurring_deliverables} onChange={(e) => setF({ ...f, recurring_deliverables: e.target.value })} /></div>
      <div><label className="label">Brand voice</label><input className="field" value={f.brand_voice} onChange={(e) => setF({ ...f, brand_voice: e.target.value })} /></div>
      <div><label className="label">Notes</label><input className="field" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <button
          onClick={() =>
            onSave({
              ...f,
              aliases: JSON.stringify(f.aliases.split(",").map((s) => s.trim()).filter(Boolean)),
              recurring_deliverables: JSON.stringify(f.recurring_deliverables.split("\n").map((s) => s.trim()).filter(Boolean)),
            })
          }
          disabled={!f.name}
          className="btn btn-primary"
        >
          Save
        </button>
        <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
      </div>
    </div>
  );
}

// ---------- Projects ----------

function ProjectsTab({ projects, onSave, onDelete }: { projects: Project[]; onSave: (b: Record<string, unknown>) => void; onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  return (
    <div className="space-y-3">
      <button onClick={() => setEditing("new")} className="btn btn-ghost text-[12.5px]">+ Add project</button>
      {editing === "new" && (
        <ProjectForm onSave={(b) => { onSave(b); setEditing(null); }} onCancel={() => setEditing(null)} />
      )}
      {projects.map((p) => (
        <Card key={p.id} className="!p-4" hover>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-bold">{p.name}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10.5px] text-mute">{p.category}</span>
                <span className={`text-[10.5px] font-bold uppercase tracking-wider ${p.priority === "high" ? "text-amber-300" : "text-faint"}`}>{p.priority}</span>
                <span className={`text-[10.5px] font-bold uppercase tracking-wider ${p.status === "active" ? "text-emerald-300" : "text-faint"}`}>{p.status}</span>
              </div>
              <p className="mt-1 text-[12.5px] text-mute">{p.description}</p>
              <p className="mt-1 text-[11.5px] text-faint">
                60-day: {p.outcome_60d || "—"} · {p.weekly_block_target} blocks/wk
                {p.milestone && <> · milestone: {p.milestone}</>}
              </p>
              {p.next_actions && <p className="mt-0.5 text-[11.5px] text-amber-300/80">→ {p.next_actions}</p>}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setEditing(editing === p.id ? null : p.id)} className="btn btn-ghost !px-2.5 !py-1 text-[12px]">Edit</button>
              <button onClick={() => onDelete(p.id)} className="btn btn-danger !px-2.5 !py-1 text-[12px]">Delete</button>
            </div>
          </div>
          {editing === p.id && (
            <ProjectForm project={p} onSave={(b) => { onSave({ ...b, id: p.id }); setEditing(null); }} onCancel={() => setEditing(null)} />
          )}
        </Card>
      ))}
    </div>
  );
}

function ProjectForm({ project, onSave, onCancel }: { project?: Project; onSave: (b: Record<string, unknown>) => void; onCancel: () => void }) {
  const [f, setF] = useState({
    name: project?.name || "",
    category: project?.category || "",
    description: project?.description || "",
    priority: project?.priority || "medium",
    status: project?.status || "active",
    outcome_60d: project?.outcome_60d || "",
    weekly_block_target: project?.weekly_block_target ?? 2,
    milestone: project?.milestone || "",
    next_actions: project?.next_actions || "",
    aliases: parseList(project?.aliases).join(", "),
  });
  return (
    <div className="mt-3 grid gap-3 border-t border-white/5 pt-4 sm:grid-cols-2">
      <div><label className="label">Name</label><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className="label">Category</label><input className="field" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
      <div className="sm:col-span-2"><label className="label">Description</label><textarea className="field min-h-[56px]" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="grid grid-cols-3 gap-2">
        <div><label className="label">Priority</label><select className="field" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option>high</option><option>medium-high</option><option>medium</option><option>low</option></select></div>
        <div><label className="label">Status</label><select className="field" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option>active</option><option>idea</option><option>paused</option><option>done</option></select></div>
        <div><label className="label">Blocks/wk</label><input type="number" className="field" value={f.weekly_block_target} onChange={(e) => setF({ ...f, weekly_block_target: Number(e.target.value) })} /></div>
      </div>
      <div><label className="label">Aliases (comma separated)</label><input className="field" value={f.aliases} onChange={(e) => setF({ ...f, aliases: e.target.value })} /></div>
      <div className="sm:col-span-2"><label className="label">60-day outcome</label><input className="field" value={f.outcome_60d} onChange={(e) => setF({ ...f, outcome_60d: e.target.value })} /></div>
      <div><label className="label">Current milestone</label><input className="field" value={f.milestone} onChange={(e) => setF({ ...f, milestone: e.target.value })} /></div>
      <div><label className="label">Next actions</label><input className="field" value={f.next_actions} onChange={(e) => setF({ ...f, next_actions: e.target.value })} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <button
          onClick={() => onSave({ ...f, aliases: JSON.stringify(f.aliases.split(",").map((s) => s.trim()).filter(Boolean)) })}
          disabled={!f.name}
          className="btn btn-primary"
        >
          Save
        </button>
        <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
      </div>
    </div>
  );
}

// ---------- Fitness ----------

function FitnessTab({ fitness, onSave }: { fitness: FitnessProfile; onSave: (b: Record<string, unknown>) => void }) {
  const [f, setF] = useState({
    goal: fitness?.goal || "",
    workout_type: fitness?.workout_type || "",
    constraints: fitness?.constraints || "",
    preferred_habits: fitness?.preferred_habits || "",
    smoking_goal: fitness?.smoking_goal || "",
    smoking_daily_target: fitness?.smoking_daily_target ?? 10,
    no_smoke_before: fitness?.no_smoke_before || "10:00",
    walking_target: fitness?.walking_target || "",
    meditation_target: fitness?.meditation_target || "",
  });
  const [saved, setSaved] = useState(false);
  return (
    <Card>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label">Current goal</label><textarea className="field min-h-[56px]" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} /></div>
        <div><label className="label">Workout type</label><textarea className="field min-h-[56px]" value={f.workout_type} onChange={(e) => setF({ ...f, workout_type: e.target.value })} /></div>
        <div><label className="label">Constraints</label><textarea className="field min-h-[56px]" value={f.constraints} onChange={(e) => setF({ ...f, constraints: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Preferred habits</label><input className="field" value={f.preferred_habits} onChange={(e) => setF({ ...f, preferred_habits: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Smoke target/day</label><input type="number" className="field font-mono" value={f.smoking_daily_target} onChange={(e) => setF({ ...f, smoking_daily_target: Number(e.target.value) })} /></div>
          <div><label className="label">No smoking before</label><input type="time" className="field" value={f.no_smoke_before} onChange={(e) => setF({ ...f, no_smoke_before: e.target.value })} /></div>
        </div>
        <div><label className="label">Smoking goal</label><input className="field" value={f.smoking_goal} onChange={(e) => setF({ ...f, smoking_goal: e.target.value })} /></div>
        <div><label className="label">Walking target</label><input className="field" value={f.walking_target} onChange={(e) => setF({ ...f, walking_target: e.target.value })} /></div>
        <div><label className="label">Meditation target</label><input className="field" value={f.meditation_target} onChange={(e) => setF({ ...f, meditation_target: e.target.value })} /></div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => { onSave(f); setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="btn btn-primary">Save body profile</button>
        {saved && <span className="text-[12.5px] font-semibold text-emerald-300 fade-up">Saved.</span>}
      </div>
    </Card>
  );
}

// ---------- Rules ----------

function RulesTab({ rules, onSave, onDelete }: { rules: AssistantRule[]; onSave: (b: Record<string, unknown>) => void; onDelete: (id: number) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState("general");
  return (
    <div className="space-y-3">
      <Card className="!p-4">
        <div className="section-title mb-2">Add rule</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto_auto]">
          <input className="field" placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="field" placeholder="What should the assistant do?" value={description} onChange={(e) => setDescription(e.target.value)} />
          <select className="field !w-auto" value={domain} onChange={(e) => setDomain(e.target.value)}>
            {["general", "jobs", "client", "project", "body", "smoking", "emotional"].map((d) => <option key={d}>{d}</option>)}
          </select>
          <button
            onClick={() => { onSave({ name, description, domain, priority: 2 }); setName(""); setDescription(""); }}
            disabled={!name}
            className="btn btn-primary"
          >
            Add
          </button>
        </div>
      </Card>
      {rules.map((r) => (
        <Card key={r.id} className="!p-3.5 flex items-center justify-between gap-3" hover>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{r.name}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-mute">{r.domain}</span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-mute">{r.description}</p>
          </div>
          <button onClick={() => onDelete(r.id)} className="btn btn-danger !px-2.5 !py-1 text-[12px] shrink-0">Delete</button>
        </Card>
      ))}
    </div>
  );
}

// ---------- Aliases ----------

function AliasesTab({
  aliases, clients, projects, onSave, onDelete,
}: {
  aliases: EntityAlias[];
  clients: Client[];
  projects: Project[];
  onSave: (b: Record<string, unknown>) => void;
  onDelete: (id: number) => void;
}) {
  const [alias, setAlias] = useState("");
  const [target, setTarget] = useState("");
  const options = [
    ...clients.map((c) => ({ key: `client-${c.id}`, label: `${c.name} (client)` })),
    ...projects.map((p) => ({ key: `project-${p.id}`, label: `${p.name} (project)` })),
  ];
  const nameOf = (a: EntityAlias) =>
    a.entity_type === "client"
      ? clients.find((c) => c.id === a.entity_id)?.name
      : projects.find((p) => p.id === a.entity_id)?.name;

  return (
    <div className="space-y-3">
      <Card className="!p-4">
        <div className="section-title mb-2">Add alias — “what you say” → “what the system hears”</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input className="field" placeholder={`e.g. "the health thing"`} value={alias} onChange={(e) => setAlias(e.target.value)} />
          <select className="field" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">— target —</option>
            {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <button
            onClick={() => {
              const [entity_type, id] = target.split("-");
              onSave({ alias: alias.trim(), entity_type, entity_id: Number(id) });
              setAlias("");
              setTarget("");
            }}
            disabled={!alias.trim() || !target}
            className="btn btn-primary"
          >
            Add
          </button>
        </div>
        <p className="mt-2 text-[11px] text-faint">
          Client/project names and their built-in aliases are matched automatically — this list is for extra shorthand.
        </p>
      </Card>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {aliases.map((a) => (
          <Card key={a.id} className="!p-3 flex items-center justify-between gap-2">
            <div className="text-[13px]">
              <span className="font-semibold text-cyan-300">“{a.alias}”</span>
              <span className="text-faint"> → </span>
              <span className="font-semibold">{nameOf(a) || "?"}</span>
              <span className="text-[10.5px] text-faint"> ({a.entity_type})</span>
            </div>
            <button onClick={() => onDelete(a.id)} className="text-[11px] font-semibold text-rose-400/80 hover:text-rose-300 shrink-0">remove</button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function parseList(raw?: string): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
