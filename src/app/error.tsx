"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0a0a12] text-white gap-4 p-8">
      <h1 className="text-4xl font-display italic uppercase">
        Something went wrong
      </h1>
      <p className="font-body text-sm text-white/50 max-w-md text-center">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="mt-4 px-6 py-2 border-2 border-white/30 font-display italic uppercase text-sm hover:bg-white/10 transition-colors cursor-pointer"
      >
        Try Again
      </button>
    </div>
  );
}
