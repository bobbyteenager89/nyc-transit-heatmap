"use client";

import { useState, useCallback } from "react";

interface ShareButtonProps {
  url: string;
}

export function ShareButton({ url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    // Try native share API first (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "NYC Transit Heatmap",
          text: "Check out my neighborhood commute heatmap",
          url,
        });
        return;
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: prompt
      window.prompt("Copy this link:", url);
    }
  }, [url]);

  return (
    <button
      onClick={handleShare}
      className="w-full border-3 border-red p-3 font-display italic uppercase text-sm hover:bg-red hover:text-pink transition-colors cursor-pointer"
    >
      {copied ? "Copied!" : "Share This Heatmap"}
    </button>
  );
}
