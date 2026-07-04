import { getDb } from "@/lib/db";
import { InboxClient } from "./InboxClient";
import type { Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function InboxPage() {
  const db = getDb();
  const tasks = db
    .prepare("SELECT * FROM tasks WHERE status IN ('inbox','backlog','scheduled','today') ORDER BY CASE status WHEN 'inbox' THEN 0 WHEN 'today' THEN 1 WHEN 'scheduled' THEN 2 ELSE 3 END, priority, id DESC")
    .all() as Task[];
  return <InboxClient tasks={tasks} />;
}
