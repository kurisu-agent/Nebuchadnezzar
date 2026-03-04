"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  X,
  FolderSimplePlus,
  GithubLogo,
  FolderOpen,
} from "@phosphor-icons/react";
import { PROJECT_COLORS, randomProjectColor } from "@/lib/project-colors";

type Tab = "blank" | "clone" | "import";

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROJECT_COLORS.map((c) => (
        <button
          key={c.hex}
          type="button"
          onClick={() => onChange(c.hex)}
          className={`w-8 h-8 rounded-full active:scale-95 transition-transform ${
            value === c.hex
              ? "ring-2 ring-offset-2 ring-offset-base-100 ring-white"
              : ""
          }`}
          style={{ backgroundColor: c.hex }}
          aria-label={c.name}
        />
      ))}
    </div>
  );
}

export function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const createProject = useMutation(api.projects.create);
  const [tab, setTab] = useState<Tab>("blank");
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const [color, setColor] = useState(randomProjectColor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importDirs, setImportDirs] = useState<
    { name: string; path: string }[] | null
  >(null);
  const [selectedImport, setSelectedImport] = useState<{
    name: string;
    path: string;
  } | null>(null);

  const loadImportDirs = async () => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-dirs" }),
      });
      const data = await res.json();
      setImportDirs(data.dirs ?? []);
    } catch {
      setError("Failed to list directories");
    }
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setError("");
    if (t === "import" && !importDirs) {
      loadImportDirs();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (tab === "blank") {
        if (!name.trim()) {
          setError("Name is required");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", name: name.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        await createProject({
          name: name.trim(),
          path: data.path,
          color,
        });
      } else if (tab === "clone") {
        if (!repo.trim()) {
          setError("Repository is required");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clone", repo: repo.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        await createProject({
          name: name.trim() || data.name,
          path: data.path,
          color,
        });
      } else if (tab === "import") {
        if (!selectedImport) {
          setError("Select a directory");
          setLoading(false);
          return;
        }
        await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "init-git", path: selectedImport.path }),
        });
        await createProject({
          name: name.trim() || selectedImport.name,
          path: selectedImport.path,
          color,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div className="modal-box max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">New Project</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-bordered mb-4">
          <button
            className={`tab tab-sm gap-1.5 ${tab === "blank" ? "tab-active" : ""}`}
            onClick={() => handleTabChange("blank")}
          >
            <FolderSimplePlus size={14} weight="duotone" />
            Blank
          </button>
          <button
            className={`tab tab-sm gap-1.5 ${tab === "clone" ? "tab-active" : ""}`}
            onClick={() => handleTabChange("clone")}
          >
            <GithubLogo size={14} weight="duotone" />
            Clone
          </button>
          <button
            className={`tab tab-sm gap-1.5 ${tab === "import" ? "tab-active" : ""}`}
            onClick={() => handleTabChange("import")}
          >
            <FolderOpen size={14} weight="duotone" />
            Import
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tab === "clone" && (
            <label className="fieldset">
              <span className="fieldset-legend text-xs">Repository</span>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="owner/repo"
                className="input input-bordered input-sm w-full"
                autoFocus
              />
            </label>
          )}

          {tab === "import" && (
            <div className="max-h-40 overflow-y-auto bg-base-200 rounded-lg">
              {!importDirs ? (
                <div className="p-4 text-center">
                  <span className="loading loading-spinner loading-sm opacity-50" />
                </div>
              ) : importDirs.length === 0 ? (
                <p className="text-xs opacity-40 p-4 text-center">
                  No directories found in ~/Code
                </p>
              ) : (
                <ul className="menu menu-sm p-1">
                  {importDirs.map((d) => (
                    <li key={d.path}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImport(d);
                          if (!name) setName(d.name);
                        }}
                        className={
                          selectedImport?.path === d.path ? "active" : ""
                        }
                      >
                        <span className="font-mono text-xs">{d.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <label className="fieldset">
            <span className="fieldset-legend text-xs">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                tab === "clone"
                  ? "Auto-detected from repo"
                  : tab === "import"
                    ? (selectedImport?.name ?? "Project name")
                    : "my-project"
              }
              className="input input-bordered input-sm w-full"
              autoFocus={tab === "blank"}
            />
          </label>

          <label className="fieldset">
            <span className="fieldset-legend text-xs">Color</span>
            <ColorPicker value={color} onChange={setColor} />
          </label>

          {error && (
            <div className="alert alert-error text-xs py-2">
              <span>{error}</span>
            </div>
          )}

          <div className="modal-action mt-1">
            <button onClick={onClose} type="button" className="btn btn-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-sm"
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : tab === "clone" ? (
                "Clone"
              ) : tab === "import" ? (
                "Import"
              ) : (
                "Create"
              )}
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
