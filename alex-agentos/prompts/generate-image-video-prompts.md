# Prompt: Generate image / video prompts

---
Turn this creative direction into production-ready prompts. Use the `creative-brief-to-production-prompts` skill and `image-video-prompt-engineer`.

Input: <paste creative brief / direction, or the client + asset>.
Target tool: <Higgsfield / Runway / Veo / Midjourney / Krea>.

Deliver (via `templates/image-video-prompt-template.md`): prompt type, locked brief interpretation, a fully-specified main prompt, 2-3 meaningfully-different variations, tool-tuned negative constraints, an edit/inpainting prompt if needed (protecting face/pose/product/logo), tool-specific notes, a shot list for video, and a QC checklist.

If Higgsfield MCP is connected, also generate the assets (`generate_image` / `generate_video`, then upscale/reframe/remove-background as needed) and QC them against the checklist before delivering.
