import { ModeCard } from "@/components/landing/mode-card";
import { PreviewIsochrone } from "@/components/landing/preview-isochrone";
import { PreviewHex } from "@/components/landing/preview-hex";
import { PreviewRankings } from "@/components/landing/preview-rankings";

export default function LandingPage() {
  return (
    <div className="relative flex items-center justify-center h-full bg-[#0a0a12] overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(/landing-map.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 max-w-4xl w-full px-6">
        <h1
          className="card-enter text-5xl md:text-6xl text-center mb-2 text-white font-display italic uppercase"
          style={{ animationDelay: "0ms" }}
        >
          Isochrone<br /><span className="text-accent">NYC</span>
        </h1>
        <p
          className="card-enter text-center font-body text-sm text-white/40 mb-12"
          style={{ animationDelay: "80ms" }}
        >
          See how far you can go — by subway, bike, or foot
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ModeCard
            href="/explore"
            title="Isochrone NYC"
            description="Drop a pin and see your reach in 10-minute bands — subway, bus, ferry, Citi Bike, or car."
            cta="Explore"
            primary
            preview={<PreviewIsochrone />}
            enterDelay="[animation-delay:180ms]"
          />
          <ModeCard
            href="/find"
            title="Find My Neighborhood"
            description="Tell us where you go. We'll show you where to live to minimize your commute."
            cta="Get Started"
            preview={<PreviewHex />}
            enterDelay="[animation-delay:280ms]"
          />
          <ModeCard
            href="/rankings"
            title="Rankings"
            description="See which NYC neighborhoods have the best transit access. Ranked by average commute time."
            cta="View Rankings"
            preview={<PreviewRankings />}
            enterDelay="[animation-delay:380ms]"
          />
        </div>
      </div>
    </div>
  );
}
