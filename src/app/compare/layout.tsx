import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Neighborhoods — Isochrone NYC",
  description:
    "Compare 2-3 NYC neighborhoods side by side. See which has the best subway commute, Citi Bike access, and bus coverage.",
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
