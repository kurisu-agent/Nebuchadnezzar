"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  FolderSimple,
  Plus,
  DotsThree,
  TrashSimple,
  PencilSimple,
} from "@phosphor-icons/react";
import { CreateProjectModal } from "./create-project-modal";
import { EditProjectModal } from "./edit-project-modal";

export default function ProjectsPage() {
  const projects = useQuery(api.projects.list);
  const removeProject = useMutation(api.projects.remove);
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<Id<"projects"> | null>(null);
  const editingProject = projects?.find((p) => p._id === editingId);

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-sm opacity-60 gap-2">
              <FolderSimple size={16} weight="duotone" />
              Projects
            </h2>
            <button
              onClick={() => setShowCreate(true)}
              className="btn btn-ghost btn-xs btn-square active:bg-base-300"
              aria-label="Add project"
            >
              <Plus size={14} weight="bold" />
            </button>
          </div>

          {!projects ? (
            <div className="py-4 text-center">
              <span className="loading loading-spinner loading-sm opacity-50" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-base-content/30 py-1">
              No projects yet. Tap + to create one.
            </p>
          ) : (
            <ul className="list">
              {projects.map((project) => (
                <li key={project._id} className="list-row">
                  <a
                    onClick={() => router.push(`/project/${project._id}`)}
                    className="flex items-center gap-3 list-col-grow cursor-pointer active:bg-base-300 -mx-4 px-4 -my-2 py-2 rounded-lg"
                  >
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <div>
                      <div className="text-sm">{project.name}</div>
                      <div className="text-xs opacity-50 font-mono">
                        {project.path.replace(/^\/home\/[^/]+/, "~")}
                      </div>
                    </div>
                  </a>
                  <div className="dropdown dropdown-end">
                    <button
                      tabIndex={0}
                      className="btn btn-ghost btn-sm btn-square active:bg-base-300"
                      aria-label="Project options"
                    >
                      <DotsThree
                        size={16}
                        weight="bold"
                        className="opacity-60"
                      />
                    </button>
                    <ul
                      tabIndex={0}
                      className="dropdown-content z-10 menu bg-base-300 rounded-box shadow-lg w-40 p-2"
                    >
                      <li>
                        <button
                          onClick={() => {
                            setEditingId(project._id);
                            (document.activeElement as HTMLElement)?.blur();
                          }}
                        >
                          <PencilSimple size={14} weight="bold" />
                          Edit
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => {
                            removeProject({ id: project._id });
                            (document.activeElement as HTMLElement)?.blur();
                          }}
                          className="text-error"
                        >
                          <TrashSimple size={14} weight="bold" />
                          Delete
                        </button>
                      </li>
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateProjectModal onClose={() => setShowCreate(false)} />
      )}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
