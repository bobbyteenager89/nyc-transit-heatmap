import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find My Neighborhood — Isochrone NYC",
  description:
    "Tell us where you work, gym, and hang out. We'll show you the best NYC neighborhood to minimize your total commute.",
};

export default function FindLayout({ children }: { children: React.ReactNode }) {
  return children;
}
