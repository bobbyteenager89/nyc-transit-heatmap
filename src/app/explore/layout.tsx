import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const lat = params?.lat;
  const lng = params?.lng;
  const t = params.t ?? "30";
  const m = params.m ?? "subway,walk,bike";
  const address = params.address;

  if (!lat || !lng) {
    return {
      title: "Isochrone NYC — Explore",
      description:
        "See how far you can go in NYC by subway, bike, or foot",
    };
  }

  const ogUrl = `/api/og?lat=${lat}&lng=${lng}&t=${t}&m=${m}${address ? `&address=${encodeURIComponent(address)}` : ""}`;

  return {
    title: `Isochrone NYC — ${address ?? "Explore"}`,
    description: `See what's reachable in ${t} minutes from ${address ?? "this location"} by ${m.replace(/,/g, ", ")}`,
    openGraph: {
      title: `Isochrone NYC — ${t} min reach`,
      description: `Transit accessibility from ${address ?? `${lat}, ${lng}`}`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Isochrone NYC — ${t} min reach`,
      images: [ogUrl],
    },
  };
}

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
