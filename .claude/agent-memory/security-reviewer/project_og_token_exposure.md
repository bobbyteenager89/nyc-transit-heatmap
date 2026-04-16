---
name: OG route Mapbox token in server-side fetch URL
description: The /api/og edge route embeds NEXT_PUBLIC_MAPBOX_TOKEN in a server-side Mapbox Static API URL — token stays server-side, but the route has no rate limiting
type: project
---

`src/app/api/og/route.tsx` builds a Mapbox Static Image API URL with the Mapbox token:
```
const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/...?access_token=${mapboxToken}`;
```

This runs server-side in the edge runtime — the token is NOT exposed in the rendered PNG response. `ImageResponse` fetches the image and renders it as pixels. This is distinct from the previously tracked landing-page style-prop exposure.

**Risk:** The OG route is publicly accessible and has no rate limiting. An attacker can hit `/api/og?lat=...&lng=...` in a loop to exhaust Mapbox API quota (billed per request on Static API). Cache-Control is set to `public, max-age=86400` which mitigates repeat identical requests via CDN, but unique lat/lng combinations bypass the cache.

**Why:** No auth, no rate limit, and Mapbox Static API charges per tile request.

**How to apply:** Flag this on future reviews. A fix would be: add `Cache-Control` with a Vercel CDN cache tag, or enforce stricter lat/lng quantization (2 decimal places instead of 4) to increase cache hit rate, or add Vercel's Edge rate limiting.
