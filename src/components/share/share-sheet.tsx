"use client";

import { useState } from "react";

type Props = {
  url: string;
  title: string;
  text: string;
};

export function ShareSheet({ url, title, text }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // Resolve absolute URL for iMessage previews
    const absolute = url.startsWith("http") ? url : `${window.location.origin}${url}`;

    // Web Share API — iMessage shows up natively on iOS Safari
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text, url: absolute });
        return;
      } catch (err) {
        // User cancelled — abort silently, don't fall through
        if ((err as Error).name === "AbortError") return;
      }
    }

    // Clipboard fallback for desktop
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Final fallback: open mailto
      window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${absolute}`)}`;
    }
  }

  return (
    <button
      onClick={handleShare}
      className="px-4 py-2 rounded-full bg-accent text-black font-semibold text-sm hover:bg-accent/80 transition"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
