# iMessage Viral Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the explore page's share flow into a viral iMessage loop: short URLs (`/p/[slug]`), recipient lands on a "drop your own pin" conversion page that shows the sender's isochrone, native share sheet with iMessage priority on mobile.

**Architecture:** Stateless base62 slug encodes lat/lng/mode/time into a short URL — no DB required. The existing `/api/og` dynamic OG image already renders the sender's actual Mapbox static map, so iMessage unfurls work the moment metadata is wired into the new `/p/[slug]` route. ShareSheet uses the Web Share API (`navigator.share`) with a clipboard fallback.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, existing Mapbox + ImageResponse stack.

---

## File Structure

**Create:**
- `src/lib/share-slug.ts` — base62 encoder/decoder for share params
- `src/lib/share-slug.test.ts` — round-trip + edge-case tests
- `src/app/p/[slug]/page.tsx` — recipient landing (server component, generates metadata)
- `src/app/p/[slug]/recipient-cta.tsx` — client component: "drop your pin" CTA + redirect to /explore
- `src/components/share/share-sheet.tsx` — `navigator.share()` button with clipboard fallback

**Modify:**
- `src/components/results/results-sidebar.tsx` — replace existing share button with `<ShareSheet>` and use short URL
- `src/app/api/og/route.tsx` — accept the same params shape used by share-slug (no breaking changes; additive)

**Test:**
- `src/lib/share-slug.test.ts` — unit
- `src/app/p/[slug]/page.test.tsx` — integration: slug → page render

---

## Param Shape (locked once, reused everywhere)

```ts
export type ShareParams = {
  lat: number;     // -90..90, 4 decimal places
  lng: number;    // -180..180, 4 decimal places
  t: number;      // 1..60 minutes
  m: string[];    // subset of: subway, bus, walk, bike, car, ferry
  address?: string; // optional, max 60 chars after slugification
};
```

Slug format: base62 of compact JSON, URL-safe. Address truncated to keep slugs under ~40 chars for typical inputs.

---

## Task 1: Share slug encoder/decoder

**Files:**
- Create: `src/lib/share-slug.ts`
- Test: `src/lib/share-slug.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/share-slug.test.ts
import { describe, it, expect } from "vitest";
import { encodeShareSlug, decodeShareSlug, type ShareParams } from "./share-slug";

describe("share-slug", () => {
  const sample: ShareParams = {
    lat: 40.7128,
    lng: -74.006,
    t: 30,
    m: ["subway", "walk"],
    address: "Lower Manhattan",
  };

  it("round-trips a typical share", () => {
    const slug = encodeShareSlug(sample);
    expect(decodeShareSlug(slug)).toEqual(sample);
  });

  it("produces a URL-safe slug under 60 chars for typical input", () => {
    const slug = encodeShareSlug(sample);
    expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(slug.length).toBeLessThan(60);
  });

  it("clamps lat/lng/t to valid ranges", () => {
    const decoded = decodeShareSlug(
      encodeShareSlug({ lat: 999, lng: -999, t: 999, m: ["subway"] }),
    );
    expect(decoded.lat).toBeLessThanOrEqual(90);
    expect(decoded.lng).toBeGreaterThanOrEqual(-180);
    expect(decoded.t).toBeLessThanOrEqual(60);
  });

  it("filters invalid mode names", () => {
    const decoded = decodeShareSlug(
      encodeShareSlug({ lat: 40.7, lng: -74, t: 15, m: ["subway", "spaceship" as never] }),
    );
    expect(decoded.m).toEqual(["subway"]);
  });

  it("returns null for malformed slug", () => {
    expect(decodeShareSlug("not-a-real-slug-!!!")).toBeNull();
  });

  it("truncates long addresses", () => {
    const long = "x".repeat(200);
    const decoded = decodeShareSlug(encodeShareSlug({ ...sample, address: long }));
    expect(decoded?.address?.length).toBeLessThanOrEqual(60);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/share-slug.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the encoder/decoder**

```ts
// src/lib/share-slug.ts
const VALID_MODES = ["subway", "bus", "walk", "bike", "car", "ferry"] as const;
type Mode = typeof VALID_MODES[number];

export type ShareParams = {
  lat: number;
  lng: number;
  t: number;
  m: string[];
  address?: string;
};

const clampLat = (n: number) => Math.max(-90, Math.min(90, n));
const clampLng = (n: number) => Math.max(-180, Math.min(180, n));
const clampT = (n: number) => Math.max(1, Math.min(60, Math.round(n)));
const sanitizeModes = (m: string[]) =>
  m.filter((x): x is Mode => (VALID_MODES as readonly string[]).includes(x));
const sanitizeAddress = (a?: string) => (a ? a.slice(0, 60) : undefined);

function base64UrlEncode(bytes: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array | null {
  try {
    const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
    const bin = atob(padded);
    return new Uint8Array(bin.split("").map((c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

export function encodeShareSlug(p: ShareParams): string {
  const compact = {
    a: Number(clampLat(p.lat).toFixed(4)),
    o: Number(clampLng(p.lng).toFixed(4)),
    t: clampT(p.t),
    m: sanitizeModes(p.m),
    n: sanitizeAddress(p.address),
  };
  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  return base64UrlEncode(bytes);
}

export function decodeShareSlug(slug: string): ShareParams | null {
  const bytes = base64UrlDecode(slug);
  if (!bytes) return null;
  try {
    const obj = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof obj !== "object" || obj === null) return null;
    return {
      lat: clampLat(Number(obj.a)),
      lng: clampLng(Number(obj.o)),
      t: clampT(Number(obj.t)),
      m: sanitizeModes(Array.isArray(obj.m) ? obj.m : []),
      address: sanitizeAddress(obj.n),
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/share-slug.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/share-slug.ts src/lib/share-slug.test.ts
git commit -m "Add stateless share slug encoder/decoder for short URLs"
```

---

## Task 2: Recipient landing page `/p/[slug]`

**Files:**
- Create: `src/app/p/[slug]/page.tsx`
- Create: `src/app/p/[slug]/recipient-cta.tsx`

- [ ] **Step 1: Write the recipient CTA client component**

```tsx
// src/app/p/[slug]/recipient-cta.tsx
"use client";

import Link from "next/link";

type Props = {
  senderAddress?: string;
  t: number;
  exploreHref: string;
};

export function RecipientCTA({ senderAddress, t, exploreHref }: Props) {
  const label = senderAddress ?? "their pin";
  return (
    <div className="flex flex-col items-center gap-4 mt-8">
      <p className="text-white/70 text-center max-w-md">
        Your friend can reach this area in {t} min from <span className="text-accent">{label}</span>.
        Where can <em>you</em> go?
      </p>
      <Link
        href={exploreHref}
        className="px-6 py-3 rounded-full bg-accent text-black font-semibold hover:bg-accent/80 transition"
      >
        Drop your pin →
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Write the server page with metadata**

```tsx
// src/app/p/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { decodeShareSlug } from "@/lib/share-slug";
import { RecipientCTA } from "./recipient-cta";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = decodeShareSlug(slug);
  if (!p) return { title: "Isochrone NYC" };

  const ogParams = new URLSearchParams({
    lat: String(p.lat),
    lng: String(p.lng),
    t: String(p.t),
    m: p.m.join(","),
    ...(p.address ? { address: p.address } : {}),
  });
  const ogUrl = `/api/og?${ogParams.toString()}`;

  const title = p.address
    ? `${p.address} — ${p.t} min reach`
    : `${p.t}-minute reach in NYC`;
  const description = `See how far you can go in ${p.t} minutes from ${p.address ?? "this spot"} on Isochrone NYC.`;

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [ogUrl] },
  };
}

export default async function SharedPinPage({ params }: Props) {
  const { slug } = await params;
  const p = decodeShareSlug(slug);
  if (!p) notFound();

  const exploreParams = new URLSearchParams({
    lat: String(p.lat),
    lng: String(p.lng),
    t: String(p.t),
    m: p.m.join(","),
    compare: slug,
  });
  const exploreHref = `/explore?${exploreParams.toString()}`;

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center px-6 py-12">
      <h1 className="text-4xl md:text-5xl text-white font-display italic uppercase text-center">
        Shared Reach
      </h1>
      <p className="text-white/40 mt-2 text-sm">Isochrone NYC</p>
      <RecipientCTA senderAddress={p.address} t={p.t} exploreHref={exploreHref} />
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke test**

Run: `npm run build`
Expected: clean build, `/p/[slug]` shows up as a dynamic route in the route table.

- [ ] **Step 4: Commit**

```bash
git add src/app/p
git commit -m "Add /p/[slug] recipient landing with dynamic OG metadata"
```

---

## Task 3: ShareSheet component

**Files:**
- Create: `src/components/share/share-sheet.tsx`

- [ ] **Step 1: Implement the ShareSheet**

```tsx
// src/components/share/share-sheet.tsx
"use client";

import { useState } from "react";

type Props = {
  url: string;
  title: string;
  text: string;
};

export function ShareSheet({ url, title, text }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // Resolve absolute URL for iMessage previews
    const absolute = url.startsWith("http") ? url : `${window.location.origin}${url}`;

    // Web Share API — iMessage shows up natively on iOS Safari
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text, url: absolute });
        return;
      } catch (err) {
        // User cancelled — fall through to clipboard fallback only on real errors
        if ((err as Error).name === "AbortError") return;
      }
    }

    // Clipboard fallback for desktop
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Final fallback: open mailto
      window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${absolute}`)}`;
    }
  }

  return (
    <button
      onClick={handleShare}
      className="px-4 py-2 rounded-full bg-accent text-black font-semibold text-sm hover:bg-accent/80 transition"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/share
git commit -m "Add ShareSheet with Web Share API and clipboard fallback"
```

---

## Task 4: Wire short URL into results sidebar

**Files:**
- Modify: `src/components/results/results-sidebar.tsx`

- [ ] **Step 1: Read existing share button code**

Run: `grep -n "share\|Share" src/components/results/results-sidebar.tsx`
Identify the existing share button JSX and the source of `lat`, `lng`, `t`, `m`, `address` props.

- [ ] **Step 2: Replace the share button with ShareSheet using short URL**

Add at the top of the file:

```tsx
import { encodeShareSlug } from "@/lib/share-slug";
import { ShareSheet } from "@/components/share/share-sheet";
```

In the render, where the existing share button lives, replace it with:

```tsx
{(() => {
  const slug = encodeShareSlug({ lat, lng, t, m, address });
  const url = `/p/${slug}`;
  const label = address ?? "this spot";
  return (
    <ShareSheet
      url={url}
      title={`${t}-minute reach from ${label}`}
      text={`See how far you can go in ${t} minutes by ${m.join(", ")} from ${label}.`}
    />
  );
})()}
```

(Adapt prop names to whatever the sidebar actually uses — the variable names above are the contract from `ShareParams`.)

- [ ] **Step 3: Build + smoke test**

Run: `npm run build && npm test`
Expected: clean build, all 62+ existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/results/results-sidebar.tsx
git commit -m "Wire ShareSheet + short URL into results sidebar"
```

---

## Task 5: Verify viral loop end-to-end on deployed preview

- [ ] **Step 1: Push and wait for Vercel preview**

```bash
git push
```

- [ ] **Step 2: Open the preview deployment in Chrome**

Navigate to `https://nyc-transit-heatmap.vercel.app/explore`, drop a pin, click Share. Verify:
- On desktop: clipboard copy fires, button says "Copied!"
- Copy the URL → it's `/p/[slug]` format, not raw query string.

- [ ] **Step 3: Verify the unfurl**

Paste the `/p/[slug]` URL into:
- The Twitter card validator (https://cards-dev.twitter.com/validator)
- An iMessage thread to yourself

Expected: rich preview shows the sender's actual Mapbox map with overlay text, title is `[address] — [t] min reach`.

- [ ] **Step 4: Verify recipient flow**

Open the `/p/[slug]` URL → confirm "Drop your pin →" CTA navigates to `/explore` with the sender's params preloaded as query string.

- [ ] **Step 5: Update PROGRESS.md and commit**

Add a new session entry for the iMessage viral loop, commit, push.

---

## Out of Scope (deferred)

- **"You vs. Me" intersection compare** — recipient lands on `/explore` with sender params, but does NOT yet show the intersection of two isochrones. That's Phase 4.
- **Custom domain** — `nyc-transit-heatmap.vercel.app/p/abc` works fine for v1. Pretty domain is a separate 1-way door decision.
- **Persisted slugs / DB** — stateless encoding is sufficient until URLs get unwieldy or we want analytics per-share.
- **Share funnel analytics** — track via Vercel Analytics in a follow-up; not blocking the loop.
- **Phase 2 landing polish + Phase 3 explore delight sprinkles** — separate plans.
