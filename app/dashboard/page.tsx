"use client";

import packageJson from "@/package.json";

export default function AboutPage() {
  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      {/* App Info */}
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <div className="flex justify-between items-center">
            <span className="text-base-content/70 text-sm">Version</span>
            <span className="badge badge-ghost badge-sm">
              {packageJson.version}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
