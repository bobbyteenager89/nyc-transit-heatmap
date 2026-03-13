# NYC Transit Heatmap — Progress

## Session 1 — 2026-03-12
- Brainstormed design: two-screen flow (setup survey → results map), brutalist pink/red design
- Wrote design spec and implementation plan (18 tasks across 6 chunks)
- Built core lib: types, constants, travel-time, cost, subway (Floyd-Warshall on GTFS)
- Built GTFS parser: 496 stations, 1111 edges, ~956KB station matrix
- Built CitiBike fetcher, geocoding wrapper, grid computation web worker
- Built setup survey screen: address input, mode toggles, destination list with live estimates
- Built results screen: Mapbox heatmap, sidebar, view switch, monthly footer
- All 19 tests passing
- Deployed to Vercel: https://nyc-transit-heatmap.vercel.app
- GitHub: https://github.com/bobbyteenager89/nyc-transit-heatmap
- **Pending:** Mapbox token needs to be set in Vercel env vars
