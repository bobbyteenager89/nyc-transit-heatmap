import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NYC Transit Heatmap — Find Your Neighborhood",
  description: "Find the NYC neighborhood that minimizes your commute. See transit times by subway, bike, and foot on an interactive hex heatmap.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden p-3">{children}</body>
    </html>
  );
}
