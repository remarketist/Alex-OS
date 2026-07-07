# Test: Google Ads local service

## Scenario
A med spa wants Google Search leads for "botox <city>" and related. Considered but high-intent; limited budget.

## Run
Use `prompts/build-google-campaign.md` → `google-ads-strategist` + `google-ads-campaign-builder`. Avg customer value provided for cost-per-booked.

## Pass bar
- Intent diagnosis separates buyers ("botox near me", "book botox <city>") from researchers ("botox side effects", "botox cost").
- Campaign/ad-group structure is tight by intent theme (not one bucket).
- Keyword themes with sane match-type logic.
- Starter negative list present and meaningful ("jobs", "training", "at home", "cheap", "reviews of…", competitor terms) — this is explicitly called out as where budget is saved.
- Ad copy mirrors the query + offer + proof; assets/extensions listed.
- Landing requirements per ad group (match query + promise).
- Conversion tracking (calls + forms + bookings) and a cost-per-booked target; week 1-4 optimization (search-term mining → negatives).

## Fail if
- Treats all keywords equally; no negatives; sends buyers to a generic page; no tracking/cost-per-booked.
