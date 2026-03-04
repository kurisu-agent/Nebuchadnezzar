"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { GearSix, TrashSimple } from "@phosphor-icons/react";
import { PROJECT_COLORS } from "@/lib/project-colors";

/** Inner form component — re-mounts via key when server data changes, resetting local state */
function SettingsForm({
  project,
  onSave,
  onDelete,
}: {
  project: { name: string; path: string; color: string };
  onSave: (name: string, color: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [name, setName] = useState(project.name);
  const [color, setColor] = useState(project.color);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasChanges = name !== project.name || color !== project.color;

  const handleSave = async () => {
    await onSave(name, color);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3 gap-3">
          <h2 className="card-title text-sm opacity-60 gap-2">
            <GearSix size={16} weight="duotone" />
            Project Settings
          </h2>

          <div className="flex flex-col gap-1">
            <label className="text-xs opacity-50">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered input-sm w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs opacity-50">Path</label>
            <div className="text-sm font-mono opacity-40 px-1">
              {project.path.replace(/^\/home\/[^/]+/, "~")}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs opacity-50">Color</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-full active:scale-90 transition-transform ${
                    color === c.hex
                      ? "ring-2 ring-offset-2 ring-offset-base-200 ring-primary"
                      : ""
                  }`}
                  style={{ backgroundColor: c.hex }}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="btn btn-primary btn-sm mt-1"
          >
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3 gap-3">
          <h2 className="card-title text-sm text-error opacity-60 gap-2">
            <TrashSimple size={16} weight="duotone" />
            Danger Zone
          </h2>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">Delete this project?</span>
              <button
                onClick={onDelete}
                className="btn btn-error btn-sm btn-xs"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="btn btn-ghost btn-sm btn-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn btn-error btn-outline btn-sm"
            >
              Delete Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const project = useQuery(api.projects.get, {
    id: id as Id<"projects">,
  });
  const updateProject = useMutation(api.projects.update);
  const removeProject = useMutation(api.projects.remove);

  if (!project) return null;

  // Key on name+color so SettingsForm re-mounts when server data changes
  const formKey = `${project.name}|${project.color}`;

  return (
    <SettingsForm
      key={formKey}
      project={project}
      onSave={async (name, color) => {
        await updateProject({ id: id as Id<"projects">, name, color });
      }}
      onDelete={async () => {
        await removeProject({ id: id as Id<"projects"> });
        router.push("/dashboard/projects");
      }}
    />
  );
}
