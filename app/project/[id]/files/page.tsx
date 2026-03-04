"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCallback, useRef, useState } from "react";
import {
  ArrowLeft,
  FloppyDisk,
  FolderSimpleDashed,
} from "@phosphor-icons/react";
import FileTree from "@/app/components/file-tree";
import FileEditor from "@/app/components/file-editor";

type View = "browse" | "edit";

export default function ProjectFilesPage() {
  const { id } = useParams<{ id: string }>();
  const project = useQuery(api.projects.get, {
    id: id as Id<"projects">,
  });

  const [view, setView] = useState<View>("browse");
  const [editPath, setEditPath] = useState("");
  const [dirty, setDirty] = useState(false);
  const saveRef = useRef<(() => Promise<void>) | null>(null);

  const handleSelectFile = useCallback((path: string) => {
    setEditPath(path);
    setDirty(false);
    setView("edit");
  }, []);

  const handleBack = useCallback(() => {
    setView("browse");
    setDirty(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (saveRef.current) await saveRef.current();
  }, []);

  if (!project) return null;

  const fileName = editPath.split("/").pop() || "";

  if (view === "edit") {
    return (
      <>
        <div className="navbar bg-base-200/50 shrink-0 min-h-0 px-2 border-b border-base-300">
          <div className="navbar-start">
            <button
              onClick={handleBack}
              className="btn btn-ghost btn-square btn-sm active:bg-base-300"
            >
              <ArrowLeft size={18} weight="bold" />
            </button>
          </div>
          <div className="navbar-center">
            <span className="text-sm truncate max-w-48 font-mono">
              {fileName}
              {dirty && <span className="text-warning ml-1">*</span>}
            </span>
          </div>
          <div className="navbar-end">
            {dirty && (
              <button
                onClick={handleSave}
                className="btn btn-ghost btn-square btn-sm active:bg-base-300"
              >
                <FloppyDisk size={18} weight="bold" />
              </button>
            )}
          </div>
        </div>
        <FileEditor filePath={editPath} onDirty={setDirty} saveRef={saveRef} />
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 px-3 pt-3 pb-1 flex items-center gap-2">
        <FolderSimpleDashed
          size={16}
          weight="duotone"
          className="opacity-60"
        />
        <span className="text-xs opacity-50 font-mono">
          {project.path.replace(/^\/home\/[^/]+/, "~")}
        </span>
      </div>
      <FileTree rootPath={project.path} onSelectFile={handleSelectFile} />
    </div>
  );
}
