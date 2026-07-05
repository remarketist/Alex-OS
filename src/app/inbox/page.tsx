import { q } from "@/lib/db";
import { InboxClient } from "./InboxClient";
import type { Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const tasks = await q(
    "SELECT * FROM tasks WHERE status IN ('inbox','backlog','scheduled','today') ORDER BY CASE status WHEN 'inbox' THEN 0 WHEN 'today' THEN 1 WHEN 'scheduled' THEN 2 ELSE 3 END, priority, id DESC"
  ).all<Task>();
  return <InboxClient tasks={tasks} />;
}
