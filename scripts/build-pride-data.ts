/**
 * Build-time pride-stat tables: population (Census) + POIs/parks (OSM Overpass),
 * aggregated to res-9 H3 cells. Output committed to public/data/.
 *
 * Usage: npx tsx scripts/build-pride-data.ts
 *
 * Sources (no API key required):
 *  - Census 2020 Centers of Population, block-group level (centroid + population)
 *  - OpenStreetMap via Overpass API (restaurants, cafes, bars/pubs/clubs, parks)
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { latLngToCell } from "h3-js";

const OUT = resolve(__dirname, "../public/data");
const PRIDE_RES = 9;
const NYC_COUNTIES = new Set(["005", "047", "061", "081", "085"]);
const UA = { "User-Agent": "nyc-transit-heatmap-build/1.0 (+https://github.com)" };
const CENPOP_URL =
  "https://www2.census.gov/geo/docs/reference/cenpop2020/blkgrp/CenPop2020_Mean_BG.txt";
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
// All five boroughs + a small margin.
const BBOX = "40.49,-74.27,40.92,-73.68";

async function buildPopulation(): Promise<Record<string, number>> {
  const res = await fetch(CENPOP_URL, { headers: UA });
  if (!res.ok) throw new Error(`CenPop HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.split("\n").slice(1); // drop header
  const pop: Record<string, number> = {};
  let people = 0;
  for (const line of lines) {
    if (!line) continue;
    const [state, county, , , population, lat, lng] = line.split(",");
    if (state !== "36" || !NYC_COUNTIES.has(county)) continue;
    const p = Number(population);
    if (!p) continue;
    const cell = latLngToCell(Number(lat), Number(lng), PRIDE_RES);
    pop[cell] = (pop[cell] ?? 0) + p;
    people += p;
  }
  console.log(`  population: ${Object.keys(pop).length} res-9 cells, ${people.toLocaleString()} people`);
  return pop;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function overpass(query: string): Promise<{ elements?: any[] }> {
  const body = "data=" + encodeURIComponent(query);
  let lastErr: unknown;
  // Try each mirror with a couple of backoff attempts — Overpass 429/504 are common.
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = OVERPASS_MIRRORS[attempt % OVERPASS_MIRRORS.length];
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { ...UA, "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (res.ok) return res.json();
      lastErr = new Error(`Overpass HTTP ${res.status} (${url})`);
    } catch (e) {
      lastErr = e;
    }
    const wait = 3000 * (attempt + 1);
    console.log(`  retry in ${wait / 1000}s (${lastErr})`);
    await sleep(wait);
  }
  throw lastErr;
}

function elCenter(el: any): { lat: number; lng: number } | null {
  if (typeof el.lat === "number") return { lat: el.lat, lng: el.lon };
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

async function buildPois(): Promise<Record<string, [number, number, number]>> {
  // tuple slots: 0 restaurants, 1 cafes, 2 bars/pubs/nightclubs
  const groups: [string, number][] = [
    ['node["amenity"="restaurant"]', 0],
    ['node["amenity"="cafe"]', 1],
    ['node["amenity"~"^(bar|pub|nightclub)$"]', 2],
  ];
  const out: Record<string, [number, number, number]> = {};
  for (const [selector, idx] of groups) {
    const data = await overpass(`[out:json][timeout:90];${selector}(${BBOX});out;`);
    let n = 0;
    for (const el of data.elements ?? []) {
      const c = elCenter(el);
      if (!c) continue;
      const cell = latLngToCell(c.lat, c.lng, PRIDE_RES);
      const t = (out[cell] ??= [0, 0, 0]);
      t[idx]++;
      n++;
    }
    console.log(`  pois[${idx}]: ${n}`);
    await sleep(2000); // be polite to the Overpass mirror
  }
  return out;
}

async function buildParks(): Promise<Record<string, number[]>> {
  const data = await overpass(
    `[out:json][timeout:120];(way["leisure"="park"](${BBOX});relation["leisure"="park"](${BBOX}););out center;`
  );
  const out: Record<string, number[]> = {};
  let pid = 0;
  for (const el of data.elements ?? []) {
    const c = elCenter(el);
    if (!c) continue;
    const id = pid++;
    const cell = latLngToCell(c.lat, c.lng, PRIDE_RES);
    (out[cell] ??= []).push(id);
  }
  console.log(`  parks: ${pid} parks across ${Object.keys(out).length} res-9 cells`);
  return out;
}

async function main() {
  console.log("Building pride-stat tables...");
  const population = await buildPopulation();
  const pois = await buildPois();
  const parks = await buildParks();
  writeFileSync(resolve(OUT, "pride-population.json"), JSON.stringify(population));
  writeFileSync(resolve(OUT, "pride-pois.json"), JSON.stringify(pois));
  writeFileSync(resolve(OUT, "pride-parks.json"), JSON.stringify(parks));
  console.log("Wrote pride-population.json, pride-pois.json, pride-parks.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
