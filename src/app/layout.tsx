import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const TITLE = "Isochrone NYC — How far can you go?";
const DESCRIPTION =
  "Drop a pin anywhere in NYC and see your reach in 10-minute bands. Subway, bus, ferry, Citi Bike, and car — the real answer to 'how do I get there?'";
const OG_URL = "/api/og?lat=40.758&lng=-73.985&t=30&modes=subway,bus,walk,ferry,bike";

export const metadata: Metadata = {
  metadataBase: new URL("https://nyc-transit-heatmap.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Isochrone NYC",
    images: [{ url: OG_URL, width: 1200, height: 630, alt: "Isochrone NYC reach map" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_URL],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-dvh overflow-hidden">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
