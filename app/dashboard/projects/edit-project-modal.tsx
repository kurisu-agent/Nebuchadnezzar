"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { X } from "@phosphor-icons/react";
import { PROJECT_COLORS } from "@/lib/project-colors";

export function EditProjectModal({
  project,
  onClose,
}: {
  project: Doc<"projects">;
  onClose: () => void;
}) {
  const updateProject = useMutation(api.projects.update);
  const [name, setName] = useState(project.name);
  const [color, setColor] = useState(project.color);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await updateProject({
      id: project._id,
      ...(name.trim() !== project.name ? { name: name.trim() } : {}),
      ...(color !== project.color ? { color } : {}),
    });
    onClose();
  };

  return (
    <div className="modal modal-open" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div className="modal-box max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Edit Project</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
            <X size={16} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="fieldset">
            <span className="fieldset-legend text-xs">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered input-sm w-full"
              autoFocus
            />
          </label>

          <label className="fieldset">
            <span className="fieldset-legend text-xs">Color</span>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-8 h-8 rounded-full active:scale-95 transition-transform ${
                    color === c.hex
                      ? "ring-2 ring-offset-2 ring-offset-base-100 ring-white"
                      : ""
                  }`}
                  style={{ backgroundColor: c.hex }}
                  aria-label={c.name}
                />
              ))}
            </div>
          </label>

          <div className="text-xs opacity-40 font-mono">
            {project.path.replace(/^\/home\/[^/]+/, "~")}
          </div>

          <div className="modal-action mt-1">
            <button onClick={onClose} type="button" className="btn btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </div>
  );
}
