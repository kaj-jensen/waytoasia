# Journey map data

The map uses WGS84 longitude/latitude pairs. No arbitrary x/y locations, horizontal stretching, generated coastlines, geocoding at page load, or live tile service is used.

## Boundaries

- Package: `world-atlas@2.0.2`, `countries-50m.json` plus `countries-10m.json` for itineraries spanning less than five degrees.
- Upstream: https://github.com/topojson/world-atlas
- Source: Natural Earth Admin 0 boundaries at 1:50 million, switching to 1:10 million for closer regional maps. Natural Earth data is public domain; world-atlas code is ISC licensed.
- Country IDs: China 156, South Korea 410, Thailand 764, Vietnam 704, Indonesia 360.
- `topojson-client.feature()` converts the topology to GeoJSON. `d3-geo.geoMercator()` projects both boundaries and stops. `geoPath()` clips and renders the country plus neighboring land in SVG.
- Boundaries are generalized. Small islands and local shoreline details may be absent at this scale. Country geometry is context, not a statement about disputed boundaries.

## Stops

`mapCoordinates.ts` records rounded geographic centres for cities and landmarks. These are itinerary-scale coordinates, not hotel entrances or confirmed pickup points. Gazetteer references: https://www.geonames.org/ and https://www.wikidata.org/.

Coordinate spot checks:
- Bangkok and Chiang Mai: https://www.geonames.org/advanced-search.html?country=TH
- Teshima: https://www.wikidata.org/wiki/Q7705474

Several existing itinerary names describe broad regions. Their `note` explicitly records the selected representative place: Southern islands → Koh Yao Noi; Yunnan → Lijiang; Mekong → Can Tho; Bali → Ubud; Flores → Ruteng. Shiretoko uses the Utoro gateway. The Great Wall uses Jinshanling. These choices should be refined when the actual local arrangements are confirmed, without changing geography to make the drawing prettier.

## Rendering

D3 and the topology are used during Astro's static build. Rendered SVG requires no D3 download, API keys, attribution-bound tile service, or network request to display. A cache reuses geography across locales. The main map fits the itinerary while the inset shows its location within the full country. Neighbouring countries are subdued.

Catmull–Rom curves indicate connections and travel order; they do not represent precise road, rail, sailing or flight alignments. Distinct line patterns and the transport list retain the known travel modes. When stops are too close, the number can move while a small anchored point and leader retain the exact projected position. Labels are laid out independently without modifying coordinates. The visible map note explains regional representatives and schematic connections.

## Shared tour maps and South Korea examples

All 20 canonical tours in nine locales use `TourProduct.astro`, `tourPresentation.ts` and `tourProduct.ts`. Maps load lazily with MapLibre GL JS and OpenFreeMap; the geographic outline remains available if detailed tiles fail. Galleries contain photographs only.

The 12-day Seoul & Ancient Kingdoms example has individual daily entries. Transfer days show the preceding base and arrival city; marker selection opens the first day at that base. The three other South Korea examples use multi-day chapters, with explicit stop groups for Sokcho and Seoraksan. Coordinates are representative city or visitor-area centres, not booked hotels or precise paths. Connections are indicative, not verified tracks. Return flights and rail connections are described in the itinerary rather than shown as extra overnight bases.

South Korea's ISO numeric boundary ID is 410. North Korea remains surrounding geographic context only.
