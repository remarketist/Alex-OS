# Test: Creative direction — hospitality campaign

## Scenario
A garden events venue launches a summer wedding campaign across Meta (reel + static) and a landing hero. Positioning: elegant, aspirational.

## Run
Use `prompts/create-creative-direction.md` → `creative-direction-agent`.

## Pass bar
- Creative goal states the feeling (aspiration/romance/trust) AND the action (book a tour).
- Concept is specific and defensible, tied to the elegant/aspirational positioning.
- Mood/aesthetic uses describable references (e.g., golden-hour warmth, soft diffused light, airy pastels, film grain) — NOT "beautiful cinematic".
- Composition, lighting, color/grade, texture all specified concretely.
- Brand-fit guardrails named (what would look off-brand / too cheap / too corporate).
- Platform fit: different framing/pacing/text-safe direction for reel vs static vs landing hero.
- Ends with exact attributes to hand to `image-video-prompt-engineer`.

## Fail if
- Generic "beautiful cinematic" direction; ignores positioning; impressive-but-off-goal visuals; no platform-specific direction; no handoff attributes.
