# Natural styling preview

The 20 October 2026 pilot takes inspiration from the light backgrounds, natural palette, simple typography and moving hero on Stjernegaard Rejser. It preserves Way to Asia's wordmark and content.

## Scope

The `natural` prop on `BaseLayout` opts a page into `src/styles/natural-theme.css`. It is enabled for all nine localized homepages, the Thailand destination hub, and the Northern Table, Southern Sea tour. Other pages retain their existing styling so this can be reviewed before wider rollout.

The homepage uses a warm white header, olive calls to action, sand section backgrounds and Inter headings. The compact journey finder sits immediately below the photographic hero; destinations and selected tours appear before the longer editorial sections.

## Hero

The homepage uses a nine-second Krabi aerial clip by Trent Kloter, Pexels asset 17012994. Its first frame provides a responsive AVIF/WebP photograph. Local silent H.264 files are approximately 241 KiB at 1280 pixels and 64 KiB at 720 pixels. The files and source are documented in `IMAGE_CREDITS.md` and are exclusive to this hero across language variants.

Video loads after the poster, with a 1.2-second delay. Reduced motion, data saving and slow connections retain the photograph. Data-saving users may explicitly opt into playback. Video pauses outside the viewport or while the document is hidden. A user-requested pause persists when scrolling away and back. Playback failure retains the photograph. Every locale has translated motion controls and alternative text. No third-party video player or new CSP host is required.

## Validation

- Lint, Astro diagnostics and the production build, including brand preservation, localized HTML and SEO checks.
- Content, planner, dashboard, finance and proposal suites.
- Full browser suite, including real map tiles under production CSP for all 20 tours, mobile map bounds, all nine locales and enquiry flows.
- Hero checks cover real video under CSP, pause/resume, dynamic reduced motion, no download for reduced motion/data saving, explicit opt-in, playback failure and the mobile media selection.
- Mobile Lighthouse checks cover all three pilot pages. Results are local laboratory measurements, not production field data.

This is a branch preview; merging into `main` deploys production through the existing Cloudflare Pages Git integration. The matching project is `waytoasia`, serving `waytoasia.com`, `www.waytoasia.com` and `proposal.waytoasia.com`. Production Access policies and account settings are not part of the styling change.
