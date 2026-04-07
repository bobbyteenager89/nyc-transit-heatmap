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
