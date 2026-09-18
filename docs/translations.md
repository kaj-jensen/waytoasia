# Website translations

English content in `src/content/data.ts`, `src/content/tourOverviews.ts` and the page templates is the reference. The site has eight translated locales: Spanish, Italian, French, Dutch, Hungarian, Swedish, Danish and Norwegian Bokmål.

`src/content/translations.generated.json` is a machine-generated cache, not an editorial authority. Corrections belong in `src/content/editorial/<locale>.json`, keyed by the exact English source text. `tr()` and the legacy post-build HTML localization pass both give these corrections precedence. Regenerating the cache must not overwrite editorial corrections. Placeholders such as `{country}` and the company name Way to Asia must remain intact.

Use `tr(locale, source, variables)` for complete sentences with dynamic values. Pass localized labels into interactive components; never rely on HTML replacement to translate text that React or browser scripts will create later. Existing translated sentences must survive the HTML pass unchanged.

When English text changes, update its translations in every locale. The build checks active content coverage, untranslated long sentences, placeholder parity and brand preservation. It also compares all translated pages with their English equivalents for missing pages, unchanged English sentences, metadata, accessible labels and unresolved placeholders. Photographer credits are explicitly exempt. The browser suite verifies all 160 translated tour overviews and checks filters, galleries and enquiry review in all eight locales.

These checks prevent omissions and implementation regressions; they cannot certify grammar, idiomatic style or semantic equivalence. Editorial review against English remains necessary, especially after itinerary facts, prices or inclusions change. Do not describe automated coverage as a guarantee of perfect translation.

Validation: `npm run lint`, `npm run build`, `npm run test:smoke`, followed by the existing CI performance/accessibility/SEO gates. Verify localized pages after deployment before reporting the changes live.
