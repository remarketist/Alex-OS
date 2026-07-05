import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal config: the app is fully dynamic (no ISR), so no incremental cache is needed.
export default defineCloudflareConfig();
