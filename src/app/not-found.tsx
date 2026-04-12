import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0a0a12] text-white gap-4 p-8">
      <h1 className="text-5xl font-display italic uppercase">404</h1>
      <p className="font-body text-sm text-white/50">
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-4 px-6 py-2 border-2 border-accent/40 text-accent font-display italic uppercase text-sm hover:bg-accent/10 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
