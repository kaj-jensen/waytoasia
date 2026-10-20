# Natural styling preview

The 20 October 2026 pilot takes inspiration from the light backgrounds, natural palette, simple typography and moving hero on Stjernegaard Rejser. It preserves Way to Asia's wordmark and content.

## Scope

The `natural` prop on `BaseLayout` opts a page into `src/styles/natural-theme.css`. It is enabled for all nine localized homepages, the Thailand destination hub, and the Northern Table, Southern Sea tour. Other pages retain their existing styling so this can be reviewed before wider rollout.

The homepage uses a warm white header, olive calls to action, sand section backgrounds and Inter headings. The compact journey finder sits immediately below the photographic hero; destinations and selected tours appear before the longer editorial sections.

## Hero

The original Arashiyama photograph is restored following owner feedback. Its existing provenance and private-preview permission notes remain in `IMAGE_CREDITS.md`. The rejected Krabi clip and poster are removed.

The photograph has a gentle 16-second pan-and-zoom animation. This is animated photography, not video, and its translated controls describe image motion. Reduced motion retains a still image; data-saving visitors can explicitly start animation. Motion pauses outside the viewport, in hidden tabs, or when the visitor pauses it. Responsive AVIF and WebP images use the original source dimensions without upscaling. The animated image has its own compositing layer to keep motion smooth. No extra media download or video autoplay is required.

## Validation

- Lint, Astro diagnostics and the production build, including brand preservation, localized HTML and SEO checks.
- Content, planner, dashboard, finance and proposal suites.
- Full browser suite, including real map tiles under production CSP for all 20 tours, mobile map bounds, all nine locales and enquiry flows.
- Hero checks cover actual photograph motion under CSP, pause/resume, dynamic reduced motion, data saving, no video download, and mobile layout.
- Mobile Lighthouse checks cover all three pilot pages. Results are local laboratory measurements, not production field data.

The owner authorized deployment to the protected test website on 20 October 2026. Merging into `main` deploys through the existing Cloudflare Pages Git integration. The matching project is `waytoasia`, serving `waytoasia.com`, `www.waytoasia.com` and `proposal.waytoasia.com`. Production Access policies and account settings are not part of the styling change.
