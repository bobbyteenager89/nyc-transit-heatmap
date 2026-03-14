import Link from "next/link";

interface ModeCardProps {
  href: string;
  title: string;
  description: string;
  cta: string;
}

export function ModeCard({ href, title, description, cta }: ModeCardProps) {
  return (
    <Link
      href={href}
      className="border-3 border-red p-8 flex flex-col gap-4 hover:bg-red hover:text-pink transition-colors group"
    >
      <h2 className="text-2xl md:text-3xl leading-tight">{title}</h2>
      <p className="font-body text-sm leading-relaxed group-hover:text-pink/80">
        {description}
      </p>
      <span className="font-display italic uppercase text-lg mt-auto">
        {cta} &rarr;
      </span>
    </Link>
  );
}
