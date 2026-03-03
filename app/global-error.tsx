"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-base-100 text-base-content">
        <div className="flex flex-col items-center justify-center h-[100dvh] gap-4">
          <h1 className="text-4xl font-bold">Something went wrong</h1>
          <button onClick={() => reset()} className="btn btn-primary btn-sm">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
