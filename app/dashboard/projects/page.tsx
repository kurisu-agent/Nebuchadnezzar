"use client";

import {
  FolderSimple,
  Plus,
  DotsThree,
  ClockCounterClockwise,
  Wrench,
} from "@phosphor-icons/react";

const PLACEHOLDER_PROJECTS = [
  { name: "Nebuchadnezzar", path: "~/Code/Nebuchadnezzar", active: true },
  { name: "claude-code-ui", path: "~/Code/claude-code-ui", active: false },
  { name: "dotfiles", path: "~/dotfiles", active: false },
];

export default function ProjectsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <div className="alert alert-info text-xs">
        <Wrench size={16} weight="duotone" />
        <span>
          This page is under construction. Project management is not yet
          functional.
        </span>
      </div>

      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-sm opacity-60 gap-2">
              <FolderSimple size={16} weight="duotone" />
              Projects
            </h2>
            <button
              className="btn btn-ghost btn-xs btn-square active:bg-base-300"
              disabled
              aria-label="Add project"
            >
              <Plus size={14} weight="bold" />
            </button>
          </div>
          <ul className="list">
            {PLACEHOLDER_PROJECTS.map((project) => (
              <li key={project.path} className="list-row">
                <div className="list-col-grow">
                  <div className="text-sm flex items-center gap-2">
                    {project.name}
                    {project.active && (
                      <span className="badge badge-success badge-xs">
                        active
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-50 font-mono">
                    {project.path}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm btn-square active:bg-base-300"
                  disabled
                  aria-label="Project options"
                >
                  <DotsThree size={16} weight="bold" className="opacity-60" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent */}
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <h2 className="card-title text-sm opacity-60 gap-2">
            <ClockCounterClockwise size={16} weight="duotone" />
            Recent
          </h2>
          <p className="text-sm text-base-content/30 py-1">
            No recent projects.
          </p>
        </div>
      </div>
    </div>
  );
}
