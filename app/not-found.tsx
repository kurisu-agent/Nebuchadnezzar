"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-base-content/60">Page not found</p>
      <Link href="/" className="btn btn-primary btn-sm">
        Go Home
      </Link>
    </div>
  );
}
