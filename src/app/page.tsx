import { ModeCard } from "@/components/landing/mode-card";

export default function LandingPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="max-w-2xl w-full px-4">
        <h1 className="text-5xl md:text-6xl text-center mb-2">
          Transit<br />Heatmap
        </h1>
        <p className="text-center font-body text-sm text-red/60 mb-12">
          Find the NYC neighborhood that minimizes your commute
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModeCard
            href="/find"
            title="Find My Neighborhood"
            description="Tell us where you work, work out, and hang out. We'll show you where to live to minimize your monthly transit time."
            cta="Get Started"
          />
          <ModeCard
            href="/explore"
            title="Isochrone Explorer"
            description="Drop a pin and see how far you can go. Glowing contour rings show your reach by subway, bike, foot, and car — drag the slider to watch them grow."
            cta="Explore"
          />
        </div>
      </div>
    </div>
  );
}
