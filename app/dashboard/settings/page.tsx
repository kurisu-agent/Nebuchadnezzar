"use client";

import { Bell, Globe, ShieldCheck, Wrench } from "@phosphor-icons/react";

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <div className="alert alert-info text-xs">
        <Wrench size={16} weight="duotone" />
        <span>This page is under construction. Settings are not yet functional.</span>
      </div>

      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <h2 className="card-title text-sm opacity-60 gap-2">
            <Bell size={16} weight="duotone" />
            Notifications
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm">Enable notifications</span>
            <input type="checkbox" className="toggle toggle-sm" disabled />
          </div>
        </div>
      </div>

      {/* Language & Region */}
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <h2 className="card-title text-sm opacity-60 gap-2">
            <Globe size={16} weight="duotone" />
            Language & Region
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm">Language</span>
            <select className="select select-bordered select-xs" disabled>
              <option>English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <h2 className="card-title text-sm opacity-60 gap-2">
            <ShieldCheck size={16} weight="duotone" />
            Permissions
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm">Permission mode</span>
            <span className="badge badge-ghost badge-sm">YOLO</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto-approve tools</span>
            <input type="checkbox" className="toggle toggle-sm" disabled checked />
          </div>
        </div>
      </div>

    </div>
  );
}
