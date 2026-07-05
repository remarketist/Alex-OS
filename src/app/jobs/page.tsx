import { q } from "@/lib/db";
import { jobMetrics } from "@/lib/gmail";
import { JobsClient } from "./JobsClient";
import type { JobApplication, GmailConnection } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const apps = await q(
    "SELECT * FROM job_applications WHERE review_state != 'ignored' ORDER BY applied_date DESC, id DESC"
  ).all<JobApplication>();
  const metrics = await jobMetrics();
  const conn = await q("SELECT * FROM gmail_connections WHERE id=1").get<GmailConnection>();
  const lastSync = await q(
    "SELECT ts, mode, scanned, detected FROM gmail_sync_runs ORDER BY id DESC LIMIT 1"
  ).get<{ ts: string; mode: string; scanned: number; detected: number }>();
  const events = await q(
    "SELECT e.id, e.ts, e.type, e.detail, a.company, a.role FROM job_application_events e JOIN job_applications a ON a.id = e.application_id ORDER BY e.ts DESC LIMIT 8"
  ).all<{ id: number; ts: string; type: string; detail: string; company: string; role: string }>();

  return (
    <JobsClient
      apps={apps}
      metrics={metrics}
      connectionStatus={conn?.status ?? "disconnected"}
      lastSync={lastSync ?? null}
      events={events}
    />
  );
}
