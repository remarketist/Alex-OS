import { getDb } from "@/lib/db";
import { jobMetrics } from "@/lib/gmail";
import { JobsClient } from "./JobsClient";
import type { JobApplication, GmailConnection } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function JobsPage() {
  const db = getDb();
  const apps = db
    .prepare("SELECT * FROM job_applications WHERE review_state != 'ignored' ORDER BY applied_date DESC, id DESC")
    .all() as JobApplication[];
  const metrics = jobMetrics();
  const conn = db.prepare("SELECT * FROM gmail_connections WHERE id=1").get() as GmailConnection | undefined;
  const lastSync = db
    .prepare("SELECT ts, mode, scanned, detected FROM gmail_sync_runs ORDER BY id DESC LIMIT 1")
    .get() as { ts: string; mode: string; scanned: number; detected: number } | undefined;
  const events = db
    .prepare("SELECT e.*, a.company, a.role FROM job_application_events e JOIN job_applications a ON a.id = e.application_id ORDER BY e.ts DESC LIMIT 8")
    .all() as { id: number; ts: string; type: string; detail: string; company: string; role: string }[];

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
