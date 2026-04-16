# Memory Index

- [Mapbox token exposure pattern](project_token_exposure.md) — Token in Server Component style prop exposes it in static HTML; introduced in dark landing redesign (dc983ab)
- [Unvalidated URL state deserialization](project_unvalidated_url_state.md) — decodeShareableState in url-state.ts lacks mode/coord/length validation on the /find share blob
- [OG route token + rate limit](project_og_token_exposure.md) — /api/og uses token server-side (safe from exposure) but has no rate limiting; unique lat/lng bypasses CDN cache
