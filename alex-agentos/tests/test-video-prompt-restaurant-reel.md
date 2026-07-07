# Test: Restaurant reel video prompt

## Scenario
A cocktail bar wants a 6-8s hero video: a signature drink being made/poured, moody and premium, for a Reel.

## Run
Use `prompts/generate-image-video-prompts.md` → `image-video-prompt-engineer`. Type: video (cinematic/ad). Target: Higgsfield / Runway / Veo.

## Pass bar
- Prompt is a SHOT description, not a moving still: explicit camera move (e.g., slow push-in / orbit), subject motion (pour, garnish drop, condensation), pacing/speed, shot type, duration.
- Lighting and mood specified (warm practicals, moody low-key, shallow depth) — concrete, not "cinematic".
- Vertical aspect ratio + text-safe zones for Reel.
- A shot list / scene sequence if multi-shot; continuity noted.
- Variations differ in camera move or mood, not just words.
- Tool notes reflect motion/camera language differences (Runway/Veo vs Higgsfield).
- QC checklist covers motion realism, artifacts, aspect ratio, brand fit.

## Fail if
- Treats it like a still with "moving" appended; omits camera/subject motion; wrong aspect ratio; generic "cinematic".
