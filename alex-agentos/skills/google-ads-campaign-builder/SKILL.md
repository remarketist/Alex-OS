---
name: google-ads-campaign-builder
description: Build a complete Google Search campaign for a local-service lead-gen client — campaign structure, ad groups by intent, keyword themes, negative keywords, ad copy, assets/extensions, landing-page alignment, and conversion tracking. Use when planning or rebuilding Google Ads. Pairs with the google-ads-strategist.
---

# Google Ads Campaign Builder

Google is intent capture. Build to catch high-commercial-intent searches profitably and to refuse the rest.

## Inputs
- Vertical, location/catchment, offer, price, average customer value (for cost-per-booked math).
- Landing page URL(s) and what the business can actually deliver/answer (hours, response speed).

## Build
1. **Intent diagnosis** — separate buyers ("emergency dentist near me", "book X") from researchers ("is X safe", "X cost"). Structure and bid by tier.
2. **Campaign structure** — split by intent tier / service line / margin; not one bucket.
3. **Ad groups** — tight, by single intent theme, so ad + landing match the query.
4. **Keyword themes** — per ad group, with modern match-type logic (phrase/exact for control; broad only with strong signals + tight negatives).
5. **Negative keyword list** — the starter blocklist ("jobs", "free", "DIY", "cheap", "salary", "course", competitor brand terms if not bidding on them, non-service terms). This is where the budget is saved.
6. **Ad copy** — 3 headlines mirroring the query + offer + proof; descriptions with CTA and trust; per ad group.
7. **Assets / extensions** — sitelinks, callouts, structured snippets, call, location, lead form where relevant.
8. **Landing page requirements** — each ad group's page must match the query theme and ad promise (hand to `landing-page-cro-agent`).
9. **Conversion tracking** — calls (call tracking), form fills, bookings; define the primary conversion and cost-per-booked target.

## Output
The 9 sections above as a launch-ready plan, plus a **week 1-4 optimization plan** (search-term mining → negatives, pausing losers, scaling winners).

## Never
- Treat all keywords as equal value or send buyers to a generic homepage.
- Launch without conversion tracking and a cost-per-booked target.
- Skip the negative list.
