# Way to Asia

Premium multilingual travel website for tailor-made and small-group journeys across China, Japan, Thailand, Vietnam and Indonesia.

## Architecture

- Astro + React islands, TypeScript strict mode, custom CSS design tokens.
- Static output deployed to Cloudflare Pages. This is the documented fallback from the original brief: Cloudflare deprecated `@cloudflare/next-on-pages` for full-stack Next.js, while Astro cleanly supports Pages, Git previews and Pages Functions.
- Sanity is the editorial source. The typed local dataset in `src/content/data.ts` keeps preview builds deterministic until the Sanity project ID is configured.
- Nine locale-prefixed routes with English as source language. Non-English travel-specific copy should be reviewed by a human translator before launch.
- Prices are explicitly managed in USD, EUR, DKK, SEK, NOK and HUF for each tour. There is no automatic exchange-rate conversion.

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

The GitHub workflow runs lint, typecheck, build, Playwright smoke tests and Lighthouse CI. It deploys `main` to production and each PR branch to a unique Cloudflare Pages preview URL. Add these GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN` — scoped to Pages deployments for this account.
- `CLOUDFLARE_ACCOUNT_ID`.

In Cloudflare Pages, set the production branch to `main`, output directory to `dist`, and add the same environment variables used locally.

### Manual domain step

Once `waytoasia.com` DNS is delegated to Cloudflare, open **Workers & Pages → waytoasia → Custom domains** and attach `waytoasia.com` and `www.waytoasia.com`. Then add a zone-level **Redirect Rule** that permanently redirects `www.waytoasia.com/*` to `https://waytoasia.com/${1}` while preserving the path and query string. Pages `_redirects` only accepts relative source paths, so host canonicalization belongs at zone level. Registrar access and nameserver changes are intentionally manual.

### Rollback

In **Workers & Pages → waytoasia → Deployments**, choose the last known-good production deployment and select **Rollback to this deployment**. Then revert the responsible Git commit so the next automated build remains aligned with production.

## Translation checklist

The current non-English UI chrome proves locale routing. Destination narratives, cultural details, tour names, itineraries and image alt text require professional human translation before public launch; do not publish machine-generated cultural copy without review.
