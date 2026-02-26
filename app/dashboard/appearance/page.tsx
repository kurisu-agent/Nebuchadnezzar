"use client";

import { Palette, TextAa, CircleHalf, Wrench } from "@phosphor-icons/react";

export default function AppearancePage() {
  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <div className="alert alert-info text-xs">
        <Wrench size={16} weight="duotone" />
        <span>
          This page is under construction. Appearance settings are not yet
          functional.
        </span>
      </div>

      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <h2 className="card-title text-sm opacity-60 gap-2">
            <CircleHalf size={16} weight="duotone" />
            Theme
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm">Color theme</span>
            <select className="select select-bordered select-xs" disabled>
              <option>Dark</option>
              <option>Light</option>
              <option>System</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Accent color</span>
            <div className="flex gap-1.5">
              {["bg-primary", "bg-secondary", "bg-accent", "bg-info"].map(
                (c) => (
                  <span
                    key={c}
                    className={`w-5 h-5 rounded-full ${c} opacity-50`}
                  />
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <h2 className="card-title text-sm opacity-60 gap-2">
            <TextAa size={16} weight="duotone" />
            Typography
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm">Font size</span>
            <select className="select select-bordered select-xs" disabled>
              <option>Small</option>
              <option>Medium</option>
              <option>Large</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Code font</span>
            <span className="badge badge-ghost badge-sm font-mono">
              Monospace
            </span>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <h2 className="card-title text-sm opacity-60 gap-2">
            <Palette size={16} weight="duotone" />
            Chat Display
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm">Show avatars</span>
            <input
              type="checkbox"
              className="toggle toggle-sm"
              disabled
              checked
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Compact mode</span>
            <input type="checkbox" className="toggle toggle-sm" disabled />
          </div>
        </div>
      </div>
    </div>
  );
}
