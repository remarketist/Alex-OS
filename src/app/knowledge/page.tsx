import { getKnowledgeBaseContext } from "@/lib/services";
import { KnowledgeClient } from "./KnowledgeClient";
import type { Client, Project, FitnessProfile, AssistantRule, EntityAlias } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function KnowledgePage() {
  const kb = getKnowledgeBaseContext();
  return (
    <KnowledgeClient
      clients={kb.clients as Client[]}
      projects={kb.projects as Project[]}
      fitness={kb.fitness as FitnessProfile}
      rules={kb.rules as AssistantRule[]}
      aliases={kb.aliases as EntityAlias[]}
    />
  );
}
