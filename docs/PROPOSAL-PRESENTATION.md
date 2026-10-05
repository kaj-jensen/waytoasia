# Client proposal presentation

The renderer is `functions/_lib/proposals.ts`. Existing token URLs, expiry/revocation checks and enquiry identifiers remain unchanged. The new brochure uses private server-rendered inline SVG; there are no public proposal map endpoints. Every request still passes the D1 token/expiry check before any map is returned. Response pages use private/no-store headers. Ordinary public destination photos contain no customer information.

## Map data and privacy

`proposal-map.ts` uses the existing D3/world-atlas dependencies and bundled Natural Earth 1:50m country boundaries and rivers, filtered to the current viewport before rendering. Separate desktop and phone SVG layouts retain readable labels. Natural Earth data is public domain: https://www.naturalearthdata.com/about/. River source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_rivers_lake_centerlines.geojson (downloaded 4 October 2026; descriptive properties removed, geometry retained). No API credentials, new environment variables, provider subscription or per-map fee. Standard Cloudflare function usage still applies.

The bounded isolate cache holds 100 route/style/language variants, includes actual stop order/coordinates, and automatically misses when the route changes. It holds only map geometry/labels, never traveller names, email, tokens or proposal content. It is opportunistic across warm requests and resets on cold starts/deploys. Map generation never contacts a provider. SVG retains resolution in print. Country labels and rivers provide geographic context; connections are illustrative, not surveyed roads/railways. No inferred transport modes or travel times. Explicit onward-travel prose is retained in each chapter.

Curated city/landmark coordinates reuse `src/content/mapCoordinates.ts`, excluding broad representative regions and the generic Great Wall entry. Mutianyu uses Wikidata Q212610 (40°26′16.86″N, 116°33′42.84″E); Shaxi is only accepted with Yunnan/Dali context. Sources: https://www.wikidata.org/wiki/Q212610 and https://www.openstreetmap.org/node/705132259. Attribution remains visible. Missing/ambiguous locations stay in the numbered text route, are never connected across a missing stop, and generate a consultant-editor review notice.

For additional verified locations, an optional route field `coordinates: [longitude,latitude]` plus `coordinatesVerified: true` accepts reviewed WGS84 points. Do not populate it from unreviewed AI coordinates. It supports places beyond the current five-country catalogue, return trips and multi-country journeys. Geographic detail panels separate nearby stops. Up to 80 route stops can be resolved; existing generation currently limits routes to eight chapters.

## Images

Dedicated destination assets in `public/images/proposals/` have no overlap with existing tour asset IDs. They depict destinations, never the named hotels or selected experiences. Sources/licenses are shown next to images. CSS crops their display; resized images remain under their original licenses:

- Beijing: Balon Greyjoy, Temple of Heaven, CC0 — https://commons.wikimedia.org/wiki/File:20200110_Temple_of_Heaven-1.jpg
- Mutianyu: Velatrix, CC0 — https://commons.wikimedia.org/wiki/File:Great_Wall_of_China_July_2006.JPG
- Dali: Colin W, CC BY-SA 3.0 — https://commons.wikimedia.org/wiki/File:Dali_Old_Town_-_panoramio_-_Colin_W_(2).jpg
- Shaxi: Rod Waddington, CC BY-SA 2.0 — https://commons.wikimedia.org/wiki/File:Shaxi_Town,_Yunnan_(52374101155).jpg

Other destinations use a balanced text fallback. Optional `suggestion.proposalImages` entries accept only approved local `/images/proposals/` assets with `place`, `src`, `alt`, `source`, `credit`, `approved: true`. Add sourced/licensed imagery in Git, then match exact route place. This does not load arbitrary third-party URLs or expose the private token through referrers. Hotel source links come from existing selected option sources; no ratings, amenities or booking confirmations are invented. Hotel photography is withheld until verified.

## Language and responses

UI strings use the same nine locale keys as `src/i18n.ts` via a server-compatible proposal dictionary. Supplied itinerary/hotel prose stays verbatim, even when older stored content mixes languages; it is not silently rewritten. Recognized legacy total/per-person pricing suffixes and numeric days/nights durations are localized without changing their meaning. Amounts and other arbitrary price wording remain intact.

Native HTML forms work without JS. JS provides required change notes and double-click protection. The response endpoint suppresses exact repeated status/note submissions. Migration `0004_proposal_response_receipt.sql` adds an opaque receipt column; an atomic updated_at lock plus receipt-gated activity/audit statements prevent concurrent duplicate notifications and preserve transactional dashboard capture. Apply this additive migration before deploying the renderer. A stale conflicting response returns 409 for review rather than claiming a different action succeeded. Emails remain governed by existing configuration; staging fixtures must never configure Resend delivery. Approval is explicitly only direction approval, not a booking/payment.

Print CSS preserves map, facts, estimate disclaimers, all daily detail and stays. Script opens details before print and restores them afterwards.

Validation: 22 proposal tests, 13 dashboard tests, lint, Astro type checks, production build, and hosted desktop/mobile response and image checks passed. Browser PDF export remains unverified: the native print dialog stalled during this session. Test a saved PDF before production approval.

## Review

Run `node --import tsx scripts/proposal-preview.ts` for synthetic localhost fixtures at http://127.0.0.1:8790, with `?variant=missing`, `?variant=return`, or `?locale=fr` variants. The local preview never reads production storage. Live example inspection is read-only. Run `npm run test:proposal`, `node --import tsx --test tests/proposal-map.test.ts`, `npm run lint`, `npm run build` before the Cloudflare preview deploy. Keep production unchanged until the preview is approved.

## Map layout revision
The compact opening uses a smaller title and photo. The route overview spans the content width with nearby-stop detail panels alongside on desktop, and a numbered destination strip below. Bundled Natural Earth 1:50m lake geometry adds geographic context, together with labelled nearby cities from the reviewed gazetteer. Data source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_lakes.geojson. Context labels are collision-spaced, never treated as additional itinerary stops. Map style version v2 invalidates cached v1 layouts. No new provider requests or credentials.
