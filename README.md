# Way to Asia

Premium multilingual travel website for tailor-made and small-group journeys across China, Japan, Thailand, Vietnam and Indonesia.

## Architecture

- Astro + React islands, TypeScript strict mode, custom CSS design tokens.
- Static output deployed to Cloudflare Pages. This is the documented fallback from the original brief: Cloudflare deprecated `@cloudflare/next-on-pages` for full-stack Next.js, while Astro cleanly supports Pages, Git previews and Pages Functions.
- Sanity is the editorial source. The typed local dataset in `src/content/data.ts` keeps preview builds deterministic until the Sanity project ID is configured.
- Nine locale-prefixed routes with English as source language. Non-English travel-specific copy should be reviewed by a human translator before launch.
- Prices are explicitly managed in USD, EUR, DKK, SEK, NOK and HUF for each tour. There is no automatic exchange-rate conversion.
- The discovery layer models destinations, journey styles, editorial stories and departures separately, allowing the catalogue to grow without duplicating page components.

## Product direction

The website is evolving as a real travel platform rather than a brochure-site clone. Its structure follows the strongest specialist-tour-operator patterns: destination-led navigation, intent-based journey collections, guided discovery, substantial country hubs, transparent itinerary detail and a conversational planning funnel. Text and photography remain original or appropriately licensed so the private demonstration can later become a public product without a content migration.

The current increment adds:

- A keyboard-accessible destination and journey-style mega-navigation.
- A guided journey finder based on country, duration and travel style.
- Editorial collections for first journeys, food and culture, nature, and private celebrations.
- A four-stage consultation and trip-design explanation.
- Sanity document types for journey styles and travel stories, plus structured tour departures, galleries, inclusions and exclusions.
- An editorial inspiration hub and reusable story-detail routes in every locale.
- Query-aware catalogue filtering, so homepage discovery selections carry into the journey collection.

Collaboration sources and future import controls are documented in [`CONTENT_SOURCES.md`](./CONTENT_SOURCES.md).

The next increments will connect published Sanity content to the front end, add editorial story routes and introduce a Worker-backed proposal workflow. D1, R2 and Queues stay intentionally deferred until the product needs persistent enquiries, owned media storage or asynchronous supplier integrations.

## Local development

```bash
npm install
npm run dev
npm run build
npm run test
```

Copy `.env.example` to `.env` and add the Sanity project values. Secrets never belong in Git.

## Content editing

The source-controlled Studio schemas live in `sanity/schemaTypes`. Create the hosted Studio in the Sanity project and copy these schemas into it (or install the Studio as a separate workspace). Keeping the editor out of this public application avoids shipping its large dependency graph in Cloudflare builds. Country and tour documents contain per-locale translation arrays. English is the source of truth; translators update one locale entry at a time and should never edit schema or components.

To add a tour, create a Tour document, select its country, upload imagery with localized alt text, add independently approved prices for every supported currency, complete the itinerary and publish. The front-end query layer can replace the local fallback without changing components.

To add a sixth country, create a Country document with its route code and locale content, then associate tours with it. The current launch fallback additionally needs one typed entry in `src/content/data.ts` until Sanity is connected.

To add a tenth language, add the locale code and UI strings in `src/i18n.ts`, then add that locale entry to every Sanity country and tour document. Routes, `hreflang`, footer links and the language switcher are generated from the locale list.

## Photography

Launch imagery uses curated Unsplash URLs with responsive CDN parameters. Every image slot has a stable aspect ratio and maps one-to-one to a Sanity image field. Replace an image in Sanity, preserve its crop/hotspot, and supply localized alt text. Final production assets can be migrated to Cloudflare Images without changing the content model.

## Lead form

`functions/api/lead.ts` forwards enquiries through Resend. Configure `RESEND_API_KEY` and `LEAD_TO_EMAIL` in both Cloudflare Pages production and preview environments. Verify `journeys@waytoasia.com` in Resend before launch.

## Deployment

The GitHub workflow runs lint, typecheck, build, Playwright smoke tests and Lighthouse CI. The Cloudflare Pages Git integration is the deployment authority: every push to `main` deploys production and pull requests receive unique preview URLs. This avoids a second deploy from GitHub Actions and requires no long-lived Cloudflare API token in GitHub.

In Cloudflare Pages, set the production branch to `main`, output directory to `dist`, and add the same environment variables used locally.

### Manual domain step

Once `waytoasia.com` DNS is delegated to Cloudflare, open **Workers & Pages → waytoasia → Custom domains** and attach `waytoasia.com` and `www.waytoasia.com`. Then add a zone-level **Redirect Rule** that permanently redirects `www.waytoasia.com/*` to `https://waytoasia.com/${1}` while preserving the path and query string. Pages `_redirects` only accepts relative source paths, so host canonicalization belongs at zone level. Registrar access and nameserver changes are intentionally manual.

### Rollback

In **Workers & Pages → waytoasia → Deployments**, choose the last known-good production deployment and select **Rollback to this deployment**. Then revert the responsible Git commit so the next automated build remains aligned with production.

## Translation checklist

The current non-English UI chrome proves locale routing. Destination narratives, cultural details, tour names, itineraries and image alt text require professional human translation before public launch; do not publish machine-generated cultural copy without review.
