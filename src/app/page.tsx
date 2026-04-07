import { ModeCard } from "@/components/landing/mode-card";

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
        <h1 className="text-5xl md:text-6xl text-center mb-2 text-white font-display italic uppercase">
          Isochrone<br /><span className="text-accent">NYC</span>
        </h1>
        <p className="text-center font-body text-sm text-white/40 mb-12">
          See how far you can go — by subway, bike, or foot
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ModeCard
            href="/explore"
            title="Isochrone NYC"
            description="Drop a pin and see how far you can go. Smooth contour rings show your reach by every mode."
            cta="Explore"
            primary
          />
          <ModeCard
            href="/find"
            title="Find My Neighborhood"
            description="Tell us where you go. We'll show you where to live to minimize your commute."
            cta="Get Started"
          />
          <ModeCard
            href="/rankings"
            title="Rankings"
            description="See which NYC neighborhoods have the best transit access. Ranked by average commute time."
            cta="View Rankings"
          />
        </div>
      </div>
    </div>
  );
}
