---
name: client-growth-audit
description: Run a complete growth audit for a local business or ecommerce client — business diagnosis, competitor scan, landing page audit, offer audit, ads-angle audit, content audit, creative direction, plus a 7-day action plan and 30-day roadmap. Use when onboarding a client, doing a paid audit deliverable, or diagnosing why growth stalled. Produces one client-ready report.
---

# Client Growth Audit

The agency's flagship deliverable. Runs the specialist agents in dependency order and synthesizes one report. Sell this as a paid audit or use it to open every engagement.

## Inputs to gather first
- Business: type, location/catchment, offer, price point, current monthly revenue/leads if known.
- Assets: website/landing URL, ad accounts (or screenshots), social handles, Google Business Profile.
- Read any existing `CLAUDE.md`, `client-intake.md`, `competitors.md` in the project.

## Sequence (each step feeds the next)
1. **Business diagnosis** → `local-business-growth-agent`: model, stage, constraint, funnel, revenue levers.
2. **Competitor scan** → `competitor-intel-agent`: positioning gaps, offer comparison, open angle. (Skill: `competitor-scan`.)
3. **Landing page audit** → `landing-page-cro-agent`: conversion diagnosis + priority fixes. (Skill: `landing-page-audit`.)
4. **Offer audit** → `offer-strategy-agent`: is the offer sellable/differentiated? Sharpen it — everything downstream depends on it.
5. **Ads angle audit** → `meta-ads-strategist` + `google-ads-strategist`: are current ads aligned to offer + page? Best channel for the buying cycle.
6. **Content audit** → `social-content-agent`: pillars, gaps, quick wins.
7. **Creative direction audit** → `creative-direction-agent`: is the visual language on-brand and converting?
8. **Synthesize** → `alex-chief-strategy-agent`: collapse all findings into ONE prioritized plan by commercial impact.

## Output (use templates/monthly-report-template.md structure, audit variant)
- **Executive summary** — the 3 findings that matter, in owner language
- **The #1 constraint** — the single highest-leverage fix, with rough revenue impact
- **Findings by area** — growth / competitors / landing / offer / ads / content / creative (2-4 bullets each, each ending in a recommendation)
- **7-day action plan** — doable now with existing assets
- **30-day roadmap** — sequenced, each step's unlock named
- **What we recommend the agency does next** — the paid engagement this audit justifies

## Quality bar
- Every finding ends in a recommendation tied to revenue.
- No area gets more attention than its commercial impact deserves.
- The report is readable by a busy owner in 5 minutes (summary) or 20 (full).
