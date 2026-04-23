import Link from "next/link";
import type { ReactNode } from "react";

interface ModeCardProps {
  href: string;
  title: string;
  description: string;
  cta: string;
  primary?: boolean;
  preview?: ReactNode;
  /** Tailwind arbitrary animation-delay class e.g. "[animation-delay:100ms]" */
  enterDelay?: string;
}

export function ModeCard({
  href,
  title,
  description,
  cta,
  primary,
  preview,
  enterDelay = "",
}: ModeCardProps) {
  return (
    <Link
      href={href}
      className={[
        "card-enter",
        enterDelay,
        "relative border-2 p-8 flex flex-col gap-4 overflow-hidden",
        "transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out group",
        "hover:-translate-y-1 active:scale-[0.98]",
        primary
          ? "border-white/30 bg-white/5 hover:bg-white/10 hover:border-accent hover:shadow-[0_0_32px_rgba(34,211,238,0.15)]"
          : "border-white/15 bg-white/[0.02] hover:bg-white/5 hover:border-white/25 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Animated preview area */}
      {preview && (
        <div className="w-full h-24 flex items-center justify-center mb-2 overflow-hidden">
          {preview}
        </div>
      )}

      <h2 className="text-2xl leading-tight text-white font-display italic uppercase">
        {title}
      </h2>

      <p className="font-body text-sm leading-relaxed text-white/50 transition-colors duration-300 group-hover:text-white/70">
        {description}
      </p>

      {/* CTA with animated arrow */}
      <span
        className={[
          "font-display italic uppercase text-lg mt-auto",
          "flex items-center gap-2",
          "transition-colors duration-300",
          primary
            ? "text-accent/70 group-hover:text-accent"
            : "text-white/70 group-hover:text-white",
        ].join(" ")}
      >
        {cta}
        <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
          &rarr;
        </span>
      </span>

      {/* Bottom edge accent line on hover */}
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute bottom-0 left-0 right-0 h-px",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          primary
            ? "bg-gradient-to-r from-transparent via-accent to-transparent"
            : "bg-gradient-to-r from-transparent via-white/30 to-transparent",
        ].join(" ")}
      />
    </Link>
  );
}
