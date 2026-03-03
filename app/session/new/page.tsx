"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import {
  PaperPlaneTilt,
  RocketLaunch,
  ImageSquare,
  X,
  FolderSimple,
} from "@phosphor-icons/react";
import { SessionDrawer } from "@/app/components/session-drawer";
import { TopBar } from "@/app/components/top-bar";
import { useUpload } from "@/app/hooks/use-upload";

export default function NewSessionPage() {
  const createSession = useMutation(api.sessions.create);
  const sendMessage = useMutation(api.messages.send);
  const assignSession = useMutation(api.uploads.assignSession);
  const router = useRouter();

  const projects = useQuery(api.projects.list);
  const [selectedProjectId, setSelectedProjectId] =
    useState<Id<"projects"> | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const selectedProject = projects?.find((p) => p._id === selectedProjectId);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, pendingUploads, isUploading, removePending, clearPending } =
    useUpload();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const isPasteRef = useRef(false);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      // Suppress Enter-to-send during paste so pasted newlines don't submit
      isPasteRef.current = true;
      requestAnimationFrame(() => {
        isPasteRef.current = false;
      });

      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) await upload(file);
        }
      }
    },
    [upload],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          await upload(file);
        }
      }
      e.target.value = "";
    },
    [upload],
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && pendingUploads.length === 0) || isSending) return;

    const content = input.trim() || "(image)";
    const attachmentIds = pendingUploads.map((u) => u.id);
    setIsSending(true);
    clearPending();

    try {
      const sessionId = await createSession({
        ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
      });
      if (attachmentIds.length > 0) {
        await assignSession({ uploadIds: attachmentIds, sessionId });
      }
      await sendMessage({
        sessionId,
        content,
        attachments: attachmentIds.length > 0 ? attachmentIds : undefined,
      });
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      router.replace(`/session/${sessionId}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isPasteRef.current) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <SessionDrawer>
      <div className="flex flex-col h-[100dvh]">
        <TopBar>
          <span className="text-sm font-medium opacity-40 px-1">
            New Session
          </span>
        </TopBar>

        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
          <div className="text-center opacity-30">
            <RocketLaunch size={48} weight="duotone" className="mx-auto mb-3" />
            <p className="text-sm">Start a conversation</p>
          </div>
        </div>

        <div className="shrink-0 border-t border-base-300">
          {/* Project picker */}
          {projects && projects.length > 0 && (
            <div className="px-3 pt-2 relative">
              <button
                type="button"
                onClick={() => setShowProjectPicker(!showProjectPicker)}
                className="btn btn-ghost btn-xs gap-1.5 active:bg-base-300"
              >
                {selectedProject ? (
                  <>
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: selectedProject.color }}
                    />
                    <span className="text-xs opacity-60">
                      {selectedProject.name}
                    </span>
                  </>
                ) : (
                  <>
                    <FolderSimple
                      size={14}
                      weight="duotone"
                      className="opacity-40"
                    />
                    <span className="text-xs opacity-40">No project</span>
                  </>
                )}
              </button>
              {showProjectPicker && (
                <div className="absolute bottom-full left-3 mb-1 bg-base-200 rounded-lg border border-base-300 overflow-hidden shadow-lg z-10 w-56">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(null);
                      setShowProjectPicker(false);
                    }}
                    className="btn btn-ghost btn-sm w-full justify-start text-xs rounded-none"
                  >
                    No project
                  </button>
                  {projects.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(p._id);
                        setShowProjectPicker(false);
                      }}
                      className={`btn btn-ghost btn-sm w-full justify-start gap-2 text-xs rounded-none ${
                        selectedProjectId === p._id ? "bg-base-300" : ""
                      }`}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit} className="p-3">
            {isUploading && (
              <div className="flex items-center gap-2 pb-2 mb-1">
                <span className="loading loading-spinner loading-xs opacity-50" />
                <span className="text-xs opacity-40">Uploading...</span>
              </div>
            )}
            {pendingUploads.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                {pendingUploads.map((u) => (
                  <div key={u.id} className="relative shrink-0 w-16 h-16">
                    <img
                      src={u.previewUrl}
                      alt={u.filename}
                      className="w-full h-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePending(u.id)}
                      className="btn btn-circle btn-xs absolute top-0.5 right-0.5 btn-error min-h-0 h-5 w-5"
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-1.5 rounded-2xl border border-base-content/10 bg-base-200/50 px-1.5 py-1.5 focus-within:border-base-content/20 focus-within:bg-base-300/50 transition-colors">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-sm btn-circle btn-ghost opacity-50 active:opacity-100 shrink-0"
                aria-label="Attach image"
              >
                <ImageSquare size={18} weight="duotone" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  resizeTextarea();
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Message... (Enter to send)"
                rows={1}
                disabled={isSending}
                className="flex-1 text-sm resize-none bg-transparent border-none outline-none py-1.5 min-h-0 leading-snug placeholder:opacity-40"
              />
              <button
                type="submit"
                disabled={
                  (!input.trim() && pendingUploads.length === 0) || isSending
                }
                className="btn btn-sm btn-circle btn-primary shrink-0"
              >
                {isSending ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <PaperPlaneTilt size={18} weight="fill" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SessionDrawer>
  );
}
