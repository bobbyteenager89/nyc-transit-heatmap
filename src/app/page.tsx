import { ModeCard } from "@/components/landing/mode-card";

export default function LandingPage() {
  return (
    <div className="relative flex items-center justify-center h-full bg-[#0a0a12] overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-73.97,40.75,11,0/1400x900@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 max-w-2xl w-full px-6">
        <h1 className="text-5xl md:text-6xl text-center mb-2 text-white font-display italic uppercase">
          Transit<br />Heatmap
        </h1>
        <p className="text-center font-body text-sm text-white/40 mb-12">
          See how far you can go in NYC — by subway, bike, or foot
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>
    </div>
  );
}
