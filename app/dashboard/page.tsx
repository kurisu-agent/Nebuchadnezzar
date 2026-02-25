"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import packageJson from "@/package.json";

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="h-[100dvh] flex flex-col bg-base-100">
      <div className="navbar bg-base-200 shrink-0">
        <div className="navbar-start">
          <button
            onClick={() => router.back()}
            className="btn btn-ghost btn-square btn-sm active:bg-base-300"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
        </div>
        <div className="navbar-center">
          <span className="font-semibold">Dashboard</span>
        </div>
        <div className="navbar-end" />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title text-sm opacity-60">App Info</h2>
            <div className="flex justify-between items-center">
              <span className="text-base-content/70">Version</span>
              <span className="badge badge-ghost">{packageJson.version}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
