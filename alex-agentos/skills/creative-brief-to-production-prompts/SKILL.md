---
name: creative-brief-to-production-prompts
description: Turn a business goal into production-ready image and video generation prompts — objective, platform, audience, creative direction, then image prompt, video prompt, edit/inpainting prompt, variations, negative constraints, and a QC checklist. Use to produce ad/social/product visuals. Chains creative-direction-agent → image-video-prompt-engineer and can drive Higgsfield MCP.
---

# Creative Brief → Production Prompts

Bridges strategy and generation. Never jump straight to a prompt — lock the direction first, then engineer prompts that hit it repeatably.

## Flow
1. **Understand the goal** — what business outcome must this visual drive (stop the scroll for a Friday promo, make implants feel safe/premium, hero a product for a sale)?
2. **Campaign objective & platform** — feed reel / story / static ad / landing hero. This sets aspect ratio, pacing, text-safe zones.
3. **Audience** — who + what makes them feel/act. Direction serves them.
4. **Creative direction** — run `creative-direction-agent`: concept, mood, composition, lighting, color, texture, references, motion. Concrete, not "cinematic".
5. **Image prompt** — via `image-video-prompt-engineer`: subject + composition + lens + lighting + color/grade + texture + environment + style + aspect ratio.
6. **Video prompt** — camera MOVE + subject motion + pacing + shot type + duration + continuity. A shot description, not a moving still.
7. **Edit / inpainting prompt (if needed)** — state exactly what changes AND protect what must not (face, pose, product label, logo).
8. **Variations** — 2-3 meaningfully different (framing/mood/angle), not synonyms.
9. **Negative constraints** — tool-tuned exclusions (warped text, extra limbs, logo distortion, plastic skin, blown highlights, off-brand color).
10. **QC checklist** — brand fit, message clarity, text-safe zones, product/label integrity, artifact check, platform spec.

## Production
If Higgsfield MCP is connected, generate the assets (`generate_image` / `generate_video`, then upscale/reframe/remove-background as needed) and QC against the checklist. Otherwise output prompts formatted for the target tool (Higgsfield / Runway / Veo / Midjourney / Krea).

## Output
Direction summary + the image prompt, video prompt, edit prompt (if any), variations, negatives, tool notes, and QC checklist — ready to run.

## Never
- Skip the direction step and produce a lazy prompt.
- Blur image vs video prompting.
- Let an edit prompt alter protected regions.
