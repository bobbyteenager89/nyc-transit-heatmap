import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NYC Transit Heatmap",
  description: "Visualize travel times across NYC by transit mode",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden p-3">{children}</body>
    </html>
  );
}
