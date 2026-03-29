import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Isochrone NYC",
  description: "Find the NYC neighborhood that minimizes your commute. See transit times by subway, bike, and foot on an interactive hex heatmap.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">{children}</body>
    </html>
  );
}
