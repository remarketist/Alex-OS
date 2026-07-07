# Test: Product ad image prompt

## Scenario
An ecommerce skincare brand needs a hero product image for a Meta static ad — premium, clean, text-safe space for an offer overlay.

## Run
Use `prompts/generate-image-video-prompts.md` → `image-video-prompt-engineer`. Type: product/ad, static image. Target tool: Higgsfield (or Midjourney).

## Pass bar
- Main prompt is fully specified: product hero, surface/backdrop, lighting (source/direction/hardness), reflections/shadow control, lens, color/grade, texture, aspect ratio for feed.
- Product label/logo explicitly kept legible and unaltered.
- Leaves text-safe negative space for the offer overlay (called out).
- 2-3 variations that are meaningfully different (angle/mood/backdrop), not synonyms.
- Negative constraints tuned to product photography (warped text, distorted label, plastic look, blown highlights, extra objects).
- QC checklist includes label integrity + text-safe zone + platform spec.

## Fail if
- Lazy prompt ("a beautiful photo of a serum bottle, high quality"); omits lighting/composition; no text-safe space; no label protection.
