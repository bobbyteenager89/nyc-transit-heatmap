import Link from "next/link";

interface ModeCardProps {
  href: string;
  title: string;
  description: string;
  cta: string;
  primary?: boolean;
}

export function ModeCard({ href, title, description, cta, primary }: ModeCardProps) {
  return (
    <Link
      href={href}
      className={`border-2 p-8 flex flex-col gap-4 transition-all group ${
        primary
          ? "border-white/30 bg-white/5 hover:bg-white/10 hover:border-white/50"
          : "border-white/15 bg-white/[0.02] hover:bg-white/5 hover:border-white/30"
      }`}
    >
      <h2 className="text-2xl leading-tight text-white font-display italic uppercase">
        {title}
      </h2>
      <p className="font-body text-sm leading-relaxed text-white/50 group-hover:text-white/70">
        {description}
      </p>
      <span className="font-display italic uppercase text-lg mt-auto text-white/70 group-hover:text-white">
        {cta} &rarr;
      </span>
    </Link>
  );
}
