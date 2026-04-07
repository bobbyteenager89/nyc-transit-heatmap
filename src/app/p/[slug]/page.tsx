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
