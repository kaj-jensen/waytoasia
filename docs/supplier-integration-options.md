# Supplier integration options

Research checked against official supplier documentation on 24 September 2026.

## Recommendation

The free **HBX / Hotelbeds evaluation account is active**, with sandbox keys available for Hotels, Activities and Transfers. Use it only for read-only evaluation after the normalized proposal flow has been tested against deterministic local fixtures. Do not start certification, commercial onboarding, live booking or traveller-data transmission.

Keep **HBX / Hotelbeds** as the preferred future commercial candidate because it covers all three product types through one supplier relationship. Revisit certification only after Way to Asia has a registered company and is ready to assess contracts, settlement and production responsibilities.

In parallel, qualify **Mozio** for transfers and **Viator** for tours and activities. They provide specialist benchmarks for coverage, content quality, support and commercial terms. Keep **Booking.com Demand API** and **Expedia Rapid** as later accommodation alternatives rather than adding four integrations at once.

## Candidate comparison

| Provider | Products relevant to Way to Asia | Entry route | Strength for this project | Main constraint |
| --- | --- | --- | --- | --- |
| HBX / Hotelbeds | Hotels, activities, transfers | Self-service evaluation keys, then certification/commercial approval | One suite and authentication pattern for all three verticals | Production terms, certification, settlement and Asian route depth still need confirmation |
| Mozio | Airport and point-to-point transfers | Commercial contact; API, white label, widget or agent tool | Specialist ground transport with partner support and several integration depths | Public technical detail is limited until partner onboarding |
| Viator | Tours and activities | Partner approval with basic, full, booking-affiliate and merchant tiers | Strong specialist activity API and a low-complexity redirect path | Transactional endpoints depend on the approved access tier |
| Booking.com Demand | Accommodation; attractions in limited/beta flows | Affiliate/partner credentials | Can begin with search/look/redirect and later expand to orders | Attractions and ordering scope depend on partner access; not a complete transfer solution |
| Expedia Rapid | Accommodation and activities | Partner application, restricted development key, launch review | Mature lodging shopping, price and cancellation detail | Separate launch requirements and production approval increase initial scope |

## Evidence from official documentation

- HBX registration provides separate Hotel, Activities and Transfers evaluation keys. Authentication uses an API key plus a SHA-256 signature, and the evaluation plan is limited to 50 requests per day. This remains background research, not a current registration task. <https://developer.hotelbeds.com/documentation/getting-started/>
- HBX hotel APIs separate live booking/availability from static hotel content. <https://developer.hotelbeds.com/documentation/hotels/booking-api/>
- HBX activities cover availability, real-time detail/check-rate, booking and post-booking. Activity rate keys are short-lived and must be refreshed before booking. <https://developer.hotelbeds.com/documentation/activities/booking-api/overview/> and <https://developer.hotelbeds.com/documentation/activities/booking-api/details-checkrate/detail-simple-and-full-request/>
- Mozio offers API, white label, widget and travel-agent tooling for transfers, with real-time availability/pricing available through its API route. <https://www.mozio.com/business-partners>
- Viator exposes different endpoint sets for affiliate and merchant access, with booking and cancellation available only at the relevant transactional tiers. <https://docs.viator.com/partner-api/technical/>
- Booking.com Demand supports content-only, search-and-redirect, integrated ordering and post-booking flows, but availability varies by vertical and partner access. <https://developers.booking.com/demand/docs/getting-started/overview>
- Expedia Rapid requires partner approval, development credentials, testing and a site review before production enablement. <https://developers.expediagroup.com/rapid/setup>

## Stage 2 technical boundary

Stage 2 is **search and proposal support only**:

1. A traveller accepts or refines the AI itinerary idea.
2. A travel designer supplies exact dates, room allocation, child ages, traveller country, currency and transfer locations.
3. Server-side adapters query one or more sandboxes.
4. Supplier responses are converted into the Way to Asia types in `src/lib/suppliers/contracts.ts`.
5. The proposal displays retrieval time, supplier, currency, total, cancellation rules and a clear “recheck required” state.
6. No booking, cancellation, payment or traveller-data transmission is enabled in this stage.

Short-lived rate keys and offer tokens are not durable product identifiers. Store stable supplier product IDs separately and recheck every selected offer before it appears in a final proposal.

## Information needed before a real search

- Exact check-in/check-out or activity dates—not only a travel month.
- Adults, every child’s age and room allocation.
- Traveller country/point of sale and display currency.
- Precise transfer pickup/drop-off identifiers, local time and timezone.
- Flight number, luggage, mobility/accessibility needs where relevant.
- Consent before sending any personal details to a supplier.

## Questions for HBX before certification or production

1. Which commercial model applies to Way to Asia: agency, merchant, net rates or commission?
2. What certification is required for each of Hotels, Activities and Transfers?
3. What is the live inventory depth in China, South Korea, Thailand, Vietnam and Indonesia?
4. Which currencies can be searched, settled and refunded independently?
5. Who is merchant of record and who handles customer payment, chargebacks and refunds?
6. What are the support and escalation procedures for in-trip failures?
7. Which customer fields are mandatory for search versus confirmation?
8. Are webhooks available for amendments/cancellations under the proposed agreement?
9. What rate limits and caching rules apply in certification and production?
10. Can one contract and settlement account cover all three API suites?

## Delivery sequence

- **2A — Local simulation:** create deterministic hotel, activity and transfer fixtures covering availability, sold-out results, price changes, cancellation terms and supplier errors.
- **2B — Normalization:** implement a read-only fixture adapter behind the supplier contract and verify that no supplier-specific fields leak into the proposal UI.
- **2C — Internal proposal view:** let a Way to Asia designer compare normalized offers; do not expose raw supplier payloads to the browser.
- **2D — HBX sandbox validation:** connect the existing evaluation credentials server-side, using secrets rather than source files, and compare selected destinations without enabling booking.
- **2E — Company and supplier readiness:** once a legal company exists, assess HBX certification plus Mozio and Viator onboarding, then choose the provider mix using coverage, net price, cancellation quality, response time, support and settlement—not inventory count alone.
- **Stage 3 — Transaction design:** only after the commercial decision, design recheck, payment, booking, cancellation, audit and human-approval flows.

## Implemented HBX safety boundary

The server-side adapter in `src/lib/suppliers/hbx.ts` is locked to `https://api.test.hotelbeds.com`, signs requests with Web Crypto and accepts only allowlisted search/check-rate endpoints. It has no booking, cancellation, profile or live-host methods. Real credentials belong in Cloudflare Pages secrets; `.dev.vars.example` contains names only and `.dev.vars` is ignored by Git.
