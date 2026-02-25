"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash,
  ArrowCounterClockwise,
  TrashSimple,
  FloppyDisk,
  FolderSimpleDashed,
} from "@phosphor-icons/react";
import packageJson from "@/package.json";
import { useRelativeTime } from "@/app/components/session-row";
import FileTree from "@/app/components/file-tree";
import FileEditor from "@/app/components/file-editor";

const CLAUDE_DIR =
  (typeof process !== "undefined" && process.env.HOME
    ? process.env.HOME
    : "/home/coder") + "/.claude";

type View = "browse" | "edit";

function DeletedSessionRow({
  session,
  onRestore,
  onPermanentDelete,
}: {
  session: { _id: Id<"sessions">; title: string; deletedAt?: number };
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const timeAgo = useRelativeTime(session.deletedAt ?? 0);

  return (
    <li className="list-row">
      <div className="list-col-grow">
        <div className="text-sm line-clamp-1">{session.title}</div>
        <div className="text-xs opacity-50">Deleted {timeAgo}</div>
      </div>
      <button
        onClick={onRestore}
        className="btn btn-ghost btn-sm btn-square active:bg-base-300"
        aria-label="Restore session"
      >
        <ArrowCounterClockwise
          size={16}
          weight="duotone"
          className="opacity-60"
        />
      </button>
      <button
        onClick={onPermanentDelete}
        className="btn btn-ghost btn-sm btn-square active:bg-error/20"
        aria-label="Delete permanently"
      >
        <TrashSimple
          size={16}
          weight="duotone"
          className="opacity-60 text-error"
        />
      </button>
    </li>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const deletedSessions = useQuery(api.sessions.listDeleted);
  const restoreSession = useMutation(api.sessions.restore);
  const permanentDeleteSession = useMutation(api.sessions.permanentDelete);

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

  const fileName = editPath.split("/").pop() || "";

  return (
    <div className="h-[100dvh] flex flex-col bg-base-100">
      {/* Navbar */}
      <div className="navbar bg-base-200 shrink-0 min-h-0 px-2">
        <div className="navbar-start">
          <button
            onClick={view === "edit" ? handleBack : () => router.back()}
            className="btn btn-ghost btn-square btn-sm active:bg-base-300"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
        </div>
        <div className="navbar-center">
          {view === "browse" ? (
            <span className="font-semibold">Dashboard</span>
          ) : (
            <span className="text-sm truncate max-w-48 font-mono">
              {fileName}
              {dirty && <span className="text-warning ml-1">*</span>}
            </span>
          )}
        </div>
        <div className="navbar-end">
          {view === "edit" && dirty && (
            <button
              onClick={handleSave}
              className="btn btn-ghost btn-square btn-sm active:bg-base-300"
            >
              <FloppyDisk size={20} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {view === "browse" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Cards section - scrollable */}
          <div className="shrink-0 overflow-y-auto p-3 flex flex-col gap-3">
            {/* App Info */}
            <div className="card bg-base-200 card-sm">
              <div className="card-body py-3">
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70 text-sm">Version</span>
                  <span className="badge badge-ghost badge-sm">
                    {packageJson.version}
                  </span>
                </div>
              </div>
            </div>

            {/* Trash */}
            <div className="card bg-base-200 card-sm">
              <div className="card-body py-3">
                <h2 className="card-title text-sm opacity-60 gap-2">
                  <Trash size={16} weight="duotone" />
                  Trash
                </h2>
                {deletedSessions && deletedSessions.length > 0 ? (
                  <ul className="list">
                    {deletedSessions.map((session) => (
                      <DeletedSessionRow
                        key={session._id}
                        session={session}
                        onRestore={() => restoreSession({ id: session._id })}
                        onPermanentDelete={() =>
                          permanentDeleteSession({ id: session._id })
                        }
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-base-content/30 py-1">
                    Trash is empty.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* File tree section */}
          <div className="divider px-3 my-0" />
          <div className="shrink-0 px-3 pt-2 pb-1 flex items-center gap-2">
            <FolderSimpleDashed
              size={16}
              weight="duotone"
              className="opacity-60"
            />
            <span className="text-xs opacity-50 font-mono">~/.claude</span>
          </div>
          <FileTree rootPath={CLAUDE_DIR} onSelectFile={handleSelectFile} />
        </div>
      ) : (
        <FileEditor filePath={editPath} onDirty={setDirty} saveRef={saveRef} />
      )}
    </div>
  );
}
