# Hotel demonstrations

The Journey Designer enriches dated adult-only itineraries with LiteAPI sandbox hotel rates. Configure `LITEAPI_SANDBOX_KEY` as a Cloudflare Pages secret on the `waytoasia` project. Only `sand_` keys are accepted; credentials and offer IDs never reach the browser. No booking or paid lookup endpoints are used.

Each stop gets two distinct hotels where possible, with the first preselected. Searches use known city coordinates or a country/city pair, the requested hotel tier, and consecutive overnight dates beginning on the trip start date. This is a demo assumption, not flight-arrival reconciliation. Searches assume Denmark guest nationality and two adults per room (with a final single room for odd parties), explicitly disclosed alongside sample prices. Children need ages, which the current brief does not collect, so family trips retain researched recommendations without supplier rates.

The rates are sample stay totals and must not be counted as confirmed revenue, customer quotations or reservations. The independent trip planning estimate remains based on public research. Provider failures, unsupported locations or fewer than two matching properties retain the existing researched choices with an explanation.

Images come only from the supplier's static.cupid.travel host, use the existing cream/forest-green card design, and hide on failure. Hotel selections continue through the existing proposal payload; sample prices are not imported into financial totals.

Checks: `npm run test:trip-planner`, `npm run lint`, `npm run build`.
