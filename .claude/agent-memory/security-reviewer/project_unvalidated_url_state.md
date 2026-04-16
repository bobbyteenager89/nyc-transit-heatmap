---
name: Unvalidated URL state deserialization
description: decodeShareableState in url-state.ts deserializes base64 JSON from URL without validating mode values or clamping lat/lng/frequency fields
type: project
---

`src/lib/url-state.ts` `decodeShareableState()` decodes a base64 JSON blob from the `?d=` query parameter and returns `destinations` and `modes` arrays without:
- Validating that mode strings are members of the `TransportMode` union
- Clamping or validating lat/lng coordinates on destinations
- Validating name/address strings for length or character set
- Validating frequency values (used in cost calculations)

The decoded `modes` array is passed directly into `computeHexGrid` and cost calculations. The destination name/address strings are rendered as JSX text content (safe from XSS via React, but could carry oversized payloads).

**Why:** The share-slug encoder (`share-slug.ts`) does clamp and sanitize, but `url-state.ts` (used by the `/find` page) has no equivalent sanitization layer.

**How to apply:** On every review, check both encoding paths — `share-slug.ts` (binary, for `/explore` sharing) and `url-state.ts` (base64 JSON, for `/find` sharing). Both need input validation on decode.
