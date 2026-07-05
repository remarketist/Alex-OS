import { getKnowledgeBaseContext } from "@/lib/services";
import { KnowledgeClient } from "./KnowledgeClient";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const kb = await getKnowledgeBaseContext();
  return (
    <KnowledgeClient
      clients={kb.clients}
      projects={kb.projects}
      fitness={kb.fitness!}
      rules={kb.rules}
      aliases={kb.aliases}
    />
  );
}
