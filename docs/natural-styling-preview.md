# Natural styling preview

The 20 October 2026 pilot takes inspiration from the light backgrounds, natural palette, simple typography and moving hero on Stjernegaard Rejser. It preserves Way to Asia's wordmark and content.

## Scope

The `natural` prop on `BaseLayout` opts a page into `src/styles/natural-theme.css`. It is enabled for all nine localized homepages, the Thailand destination hub, and the Northern Table, Southern Sea tour. Other pages retain their existing styling so this can be reviewed before wider rollout.

The homepage uses a warm white header, olive calls to action, sand section backgrounds and Inter headings. The compact journey finder sits immediately below the photographic hero; destinations and selected tours appear before the longer editorial sections.

## Hero

The original Arashiyama photograph is restored following owner feedback. Its existing provenance and private-preview permission notes remain in `IMAGE_CREDITS.md`. The rejected Krabi clip and poster are removed.

On 21 October the owner supplied local video clips and requested a real three-scene hero. The homepage now plays a silent 22.4-second sequence: mountain flyover, green waterfall, Vietnam riverfront. Soft 0.8-second crossfades include the final transition back to the opening. `scripts/prepare-hero-videos.py` produces 1280×720 desktop and separately cropped 576×648 mobile H.264 MP4 derivatives with fast-start metadata and bounded bitrates (approximately 3.5 MB and 1.5 MB). Audio tracks are removed.

The original Arashiyama photograph remains visible while loading and if playback fails. Only the matching desktop or mobile video is requested, after the image and page load. Reduced motion and data saving retain the still photograph without requesting video; the visitor can explicitly press the translated play control. Playback pauses outside the viewport, in hidden tabs and on user request. The video caption describes a general glimpse of Asia; it does not mislabel the footage as Arashiyama. Existing private Access protection remains required.

## Validation

- Lint, Astro diagnostics and the production build, including brand preservation, localized HTML and SEO checks.
- Content, planner, dashboard, finance and proposal suites.
- Full browser suite, including real map tiles under production CSP for all 20 tours, mobile map bounds, all nine locales and enquiry flows.
- Hero checks cover real video playback and looping under CSP, pause/resume, offscreen pause, dynamic reduced motion, data saving, mobile-only delivery, failed media fallback and all nine mobile layouts.
- Mobile Lighthouse checks cover all three pilot pages. Results are local laboratory measurements, not production field data.

The owner authorized deployment to the protected test website on 20 October 2026. Merging into `main` deploys through the existing Cloudflare Pages Git integration. The matching project is `waytoasia`, serving `waytoasia.com`, `www.waytoasia.com` and `proposal.waytoasia.com`. Production Access policies and account settings are not part of the styling change.
