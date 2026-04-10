import { ModeCard } from "@/components/landing/mode-card";

function ExploreIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M14.5 9.5l-5 2 2 5 5-2z" fill="currentColor" opacity="0.3" />
      <path d="M14.5 9.5l-5 2 2 5 5-2z" />
    </svg>
  );
}

function FindIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function RankingsIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="14" width="4" height="7" rx="0.5" />
      <rect x="10" y="8" width="4" height="13" rx="0.5" />
      <rect x="16" y="11" width="4" height="10" rx="0.5" />
      <path d="M12 3l1.5 3 3 .5-2.25 2 .75 3L12 10.5 9 12.5l.75-3L7.5 7.5l3-.5z" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="relative flex items-center justify-center h-full bg-[#0a0a12] overflow-hidden">
      {/* Background map — subtle breathing animation */}
      <div
        className="absolute inset-0 animate-map-breathe"
        style={{
          backgroundImage: `url(/landing-map.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a12_75%)]" />

      <div className="relative z-10 max-w-4xl w-full px-6">
        {/* Title with entrance animation */}
        <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <h1 className="text-5xl md:text-6xl text-center mb-2 text-white font-display italic uppercase">
            Isochrone<br /><span className="text-accent">NYC</span>
          </h1>
          <p className="text-center font-body text-sm text-white/40 mb-12">
            Drop a pin. See how far you can get by subway, bus, ferry, Citi Bike, or car.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ModeCard
            href="/explore"
            title="Isochrone NYC"
            description="Drop a pin and see your reach in 10-minute bands — subway, bus, ferry, Citi Bike, or car."
            cta="Explore"
            icon={<ExploreIcon />}
            delay={300}
            primary
          />
          <ModeCard
            href="/find"
            title="Find My Neighborhood"
            description="Tell us where you go. We'll show you where to live to minimize your commute."
            cta="Get Started"
            icon={<FindIcon />}
            delay={450}
          />
          <ModeCard
            href="/rankings"
            title="Rankings"
            description="See which NYC neighborhoods have the best transit access. Ranked by average commute time."
            cta="View Rankings"
            icon={<RankingsIcon />}
            delay={600}
          />
        </div>
      </div>
    </div>
  );
}
