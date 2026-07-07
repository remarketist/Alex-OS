# Test: Dental implant landing page audit

## Scenario
A dental clinic runs Google Ads for "dental implants <city>" to a generic homepage. Cost-per-booked is too high. Audit the page.

## Run
Use `prompts/audit-landing-page.md` with:
- URL: (any real dental implant clinic homepage, or a described mock)
- Offer: full-arch / single implant, free consultation
- Traffic: Google Search, ad promise "Permanent implants, free consult"

## Pass bar
- All 9 dimensions scored with reasons; total /45.
- Diagnosis names a real killer (generic homepage ≠ query intent, or buried offer / weak trust for a high-consideration medical purchase) — NOT "change button color".
- Trust/proof section reflects medical-buyer skepticism (credentials, before/afters compliance, reviews).
- Priority fixes each carry a business reason and rough cost-per-booked impact.
- Flags message-match failure between "dental implants <city>" query → generic homepage.
- Notes any forbidden/compliance issues (guarantees a clinic can't make).

## Fail if
- Scores on aesthetics; ignores ad-to-page match; recommends redesign without revenue reasons.
