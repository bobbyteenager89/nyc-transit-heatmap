---
name: Mapbox token exposure pattern
description: NEXT_PUBLIC_MAPBOX_TOKEN is used in both client-side SDK calls (expected/safe) and in server-rendered HTML (dangerous). The landing page dark redesign introduced a CSS background-image URL with the token in a Server Component, exposing it in page source.
type: project
---

The Mapbox token (`NEXT_PUBLIC_MAPBOX_TOKEN`) is legitimately used client-side (Mapbox GL JS SDK, fetch calls to Isochrone/Geocoding APIs). These usages are expected by Mapbox's browser SDK design.

The new risk (introduced in `dc983ab`, dark landing redesign) is `src/app/page.tsx:9` — the token is embedded in a `style` prop of a Server Component as a `background-image` CSS URL. Next.js inlines this into static HTML, making it trivially extractable via View Source.

**Why:** Server Components render once at build/request time and send HTML to the browser. Unlike client component JS bundles (where the token is also technically present but requires JS parsing), a `style` attribute is plaintext in the HTML response body.

**How to apply:** On every review, check whether `NEXT_PUBLIC_MAPBOX_TOKEN` appears in any Server Component (files without `"use client"`) inside JSX props, template literals used in rendered output, or `style=` attributes. Flag immediately if found. Safe locations: `"use client"` component bodies, `useEffect` hooks, event handlers.
