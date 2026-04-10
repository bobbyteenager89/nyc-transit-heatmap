import Link from "next/link";

interface ModeCardProps {
  href: string;
  title: string;
  description: string;
  cta: string;
  primary?: boolean;
  icon?: React.ReactNode;
  delay?: number;
}

export function ModeCard({ href, title, description, cta, primary, icon, delay = 0 }: ModeCardProps) {
  return (
    <Link
      href={href}
      className={`relative border-2 p-8 flex flex-col gap-4 transition-all duration-300 group overflow-hidden animate-fade-up ${
        primary
          ? "border-white/30 bg-white/5 hover:bg-white/10 hover:border-accent/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]"
          : "border-white/15 bg-white/[0.02] hover:bg-white/5 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.03)]"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Hover glow accent line at top */}
      <div className={`absolute inset-x-0 top-0 h-[2px] transition-opacity duration-300 ${
        primary ? "bg-accent opacity-0 group-hover:opacity-100" : "bg-white/30 opacity-0 group-hover:opacity-50"
      }`} />

      {/* Icon */}
      {icon && (
        <div className="text-white/20 group-hover:text-accent/60 transition-colors duration-300 group-hover:scale-110 origin-left transform">
          {icon}
        </div>
      )}

      <h2 className="text-2xl leading-tight text-white font-display italic uppercase">
        {title}
      </h2>
      <p className="font-body text-sm leading-relaxed text-white/50 group-hover:text-white/70 transition-colors duration-300">
        {description}
      </p>
      <span className={`font-display italic uppercase text-lg mt-auto transition-all duration-300 ${
        primary
          ? "text-white/70 group-hover:text-accent group-hover:translate-x-1"
          : "text-white/70 group-hover:text-white group-hover:translate-x-1"
      }`}>
        {cta} &rarr;
      </span>
    </Link>
  );
}
