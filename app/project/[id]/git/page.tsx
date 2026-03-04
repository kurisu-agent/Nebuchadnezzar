"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  GitCommit,
  ArrowsClockwise,
  WarningCircle,
  CheckCircle,
  FileDashed,
} from "@phosphor-icons/react";

type StatusEntry = { status: string; file: string };
type LogEntry = { hash: string; message: string };

type GitData = {
  isGitRepo: boolean;
  branch?: string;
  isDirty?: boolean;
  status?: StatusEntry[];
  log?: LogEntry[];
  branches?: string[];
  error?: string;
};

export default function ProjectGitPage() {
  const { id } = useParams<{ id: string }>();
  const project = useQuery(api.projects.get, {
    id: id as Id<"projects">,
  });

  const [data, setData] = useState<GitData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGit = useCallback(async (projectPath: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/git?path=${encodeURIComponent(projectPath)}`,
      );
      setData(await res.json());
    } catch {
      setData({ isGitRepo: false, error: "Failed to fetch git info" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (project?.path) fetchGit(project.path);
  }, [project?.path, fetchGit]);

  if (!project) return null;

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      {loading ? (
        <div className="py-8 text-center">
          <span className="loading loading-spinner loading-sm opacity-50" />
        </div>
      ) : !data?.isGitRepo ? (
        <div className="card bg-base-200 card-sm">
          <div className="card-body py-3">
            <p className="text-sm text-base-content/40 flex items-center gap-2">
              <WarningCircle size={16} weight="duotone" />
              Not a git repository.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Branch & Status */}
          <div className="card bg-base-200 card-sm">
            <div className="card-body py-3 gap-2">
              <div className="flex items-center justify-between">
                <h2 className="card-title text-sm opacity-60 gap-2">
                  <GitBranch size={16} weight="duotone" />
                  {data.branch}
                </h2>
                <div className="flex items-center gap-2">
                  {data.isDirty ? (
                    <span className="badge badge-warning badge-xs gap-1">
                      <FileDashed size={10} weight="bold" />
                      dirty
                    </span>
                  ) : (
                    <span className="badge badge-success badge-xs gap-1">
                      <CheckCircle size={10} weight="bold" />
                      clean
                    </span>
                  )}
                  <button
                    onClick={() => fetchGit(project.path)}
                    className="btn btn-ghost btn-xs btn-square active:bg-base-300"
                    aria-label="Refresh"
                  >
                    <ArrowsClockwise size={14} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Changed files */}
              {data.status && data.status.length > 0 && (
                <ul className="list">
                  {data.status.map((s, i) => (
                    <li key={i} className="list-row py-1">
                      <div className="flex items-center gap-2 list-col-grow min-w-0">
                        <span className="badge badge-ghost badge-xs font-mono shrink-0">
                          {s.status}
                        </span>
                        <span className="text-xs font-mono truncate">
                          {s.file}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Branches */}
          {data.branches && data.branches.length > 1 && (
            <div className="card bg-base-200 card-sm">
              <div className="card-body py-3 gap-2">
                <h2 className="card-title text-sm opacity-60 gap-2">
                  <GitBranch size={16} weight="duotone" />
                  Branches
                </h2>
                <div className="flex flex-wrap gap-1">
                  {data.branches.map((b) => (
                    <span
                      key={b}
                      className={`badge badge-sm ${
                        b === data.branch ? "badge-primary" : "badge-ghost"
                      }`}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent commits */}
          {data.log && data.log.length > 0 && (
            <div className="card bg-base-200 card-sm">
              <div className="card-body py-3 gap-2">
                <h2 className="card-title text-sm opacity-60 gap-2">
                  <GitCommit size={16} weight="duotone" />
                  Recent Commits
                </h2>
                <ul className="list">
                  {data.log.map((entry) => (
                    <li key={entry.hash} className="list-row py-1">
                      <div className="flex items-center gap-2 list-col-grow min-w-0">
                        <span className="badge badge-ghost badge-xs font-mono shrink-0">
                          {entry.hash}
                        </span>
                        <span className="text-sm truncate">
                          {entry.message}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
