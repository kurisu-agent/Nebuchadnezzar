"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  PaperPlaneTilt,
  Queue,
  X,
  ImageSquare,
  Columns,
  Rows,
  PencilSimple,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
} from "@phosphor-icons/react";
import { useUpload } from "@/app/hooks/use-upload";
import { TopBar } from "@/app/components/top-bar";
import { formatDateLabel, formatTime } from "@/app/components/chat/utils";
import { StreamingMarkdown } from "@/app/components/chat/streaming-markdown";
import { CollapsibleMessage } from "@/app/components/chat/collapsible-message";
import { ErrorMessage } from "@/app/components/chat/error-message";
import { MessageImages } from "@/app/components/chat/message-images";
import { AttachmentsPopover } from "@/app/components/chat/attachments-popover";
import { QueuedMessageRow } from "@/app/components/chat/queued-message-row";
import { EditTitleModal } from "@/app/session/[id]/edit-title-modal";
import { useWorkspace, getMoveDirection } from "./workspace-context";
import { useKeyboardVisible } from "./use-keyboard-visible";
import { SessionPicker } from "./session-picker";

/** Unified pane bar for workspace mode — identical layout in focused/unfocused to prevent reflow */
function WorkspacePaneNavbar({
  sessionId,
  paneId,
}: {
  sessionId: Id<"sessions">;
  paneId: string;
}) {
  const session = useQuery(api.sessions.get, { id: sessionId });
  const messages = useQuery(api.messages.list, { sessionId });
  const isStreaming = messages?.some((m) => m.streaming) ?? false;
  const isPlanning = messages?.some((m) => m.streaming && m.planning) ?? false;
  const { state, actions } = useWorkspace();
  const moveDir = getMoveDirection(state.root, paneId);

  return (
    <div
      className={`shrink-0 flex items-center gap-1.5 px-2 h-8 transition-colors duration-300 ${
        isPlanning
          ? "bg-warning/10"
          : isStreaming
            ? "bg-primary/10"
            : "bg-base-200/60"
      }`}
      onClick={() => actions.focusPane(paneId)}
    >
      {isStreaming && (
        <span
          className={`loading loading-dots loading-xs ${isPlanning ? "text-warning/50" : "opacity-40"}`}
        />
      )}
      {isPlanning && (
        <span className="text-[10px] text-warning/70 uppercase tracking-wider">
          planning
        </span>
      )}
      <span className="text-sm truncate flex-1 opacity-60">
        {session?.title ?? "..."}
      </span>
      <div
        className="dropdown dropdown-end"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          tabIndex={0}
          className="btn btn-ghost btn-xs px-0.5 opacity-30 hover:opacity-70"
          aria-label="Pane menu"
        >
          <Columns size={14} weight="bold" />
        </button>
        <ul
          tabIndex={0}
          className="dropdown-content z-10 menu bg-base-200 rounded-box shadow-lg w-44 p-2 mt-1"
        >
          {moveDir && (
            <li>
              <button
                onClick={() => {
                  (document.activeElement as HTMLElement)?.blur();
                  actions.swapPane(paneId);
                }}
              >
                {moveDir === "left" && <ArrowLeft size={16} weight="bold" />}
                {moveDir === "right" && <ArrowRight size={16} weight="bold" />}
                {moveDir === "up" && <ArrowUp size={16} weight="bold" />}
                {moveDir === "down" && <ArrowDown size={16} weight="bold" />}
                Move {moveDir.charAt(0).toUpperCase() + moveDir.slice(1)}
              </button>
            </li>
          )}
          <li>
            <button onClick={() => actions.splitPane(paneId, "horizontal")}>
              <Columns size={16} weight="duotone" />
              Split Right
            </button>
          </li>
          <li>
            <button onClick={() => actions.splitPane(paneId, "vertical")}>
              <Rows size={16} weight="duotone" />
              Split Down
            </button>
          </li>
          <li>
            <button onClick={() => actions.closePane(paneId)}>
              <X size={16} weight="bold" />
              Close Pane
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

function PaneMenu({
  paneId,
  actions,
  moveDir,
}: {
  paneId: string;
  actions: ReturnType<typeof useWorkspace>["actions"];
  moveDir: "left" | "right" | "up" | "down" | null;
}) {
  return (
    <div className="dropdown">
      <button
        tabIndex={0}
        className="btn btn-ghost btn-sm btn-square"
        aria-label="Pane menu"
      >
        <Columns size={16} weight="bold" />
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content z-10 menu bg-base-200 rounded-box shadow-lg w-44 p-2 mt-1"
      >
        {moveDir && (
          <li>
            <button
              onClick={() => {
                (document.activeElement as HTMLElement)?.blur();
                actions.swapPane(paneId);
              }}
            >
              {moveDir === "left" && <ArrowLeft size={16} weight="bold" />}
              {moveDir === "right" && <ArrowRight size={16} weight="bold" />}
              {moveDir === "up" && <ArrowUp size={16} weight="bold" />}
              {moveDir === "down" && <ArrowDown size={16} weight="bold" />}
              Move {moveDir.charAt(0).toUpperCase() + moveDir.slice(1)}
            </button>
          </li>
        )}
        <li>
          <button onClick={() => actions.splitPane(paneId, "horizontal")}>
            <Columns size={16} weight="duotone" />
            Split Right
          </button>
        </li>
        <li>
          <button onClick={() => actions.splitPane(paneId, "vertical")}>
            <Rows size={16} weight="duotone" />
            Split Down
          </button>
        </li>
        <li>
          <button onClick={() => actions.closePane(paneId)}>
            <X size={16} weight="bold" />
            Close Pane
          </button>
        </li>
      </ul>
    </div>
  );
}

function FullNavbar({
  sessionId,
  paneId,
}: {
  sessionId: Id<"sessions">;
  paneId: string;
}) {
  const session = useQuery(api.sessions.get, { id: sessionId });
  const messages = useQuery(api.messages.list, { sessionId });
  const isStreaming = messages?.some((m) => m.streaming) ?? false;
  const isPlanning = messages?.some((m) => m.streaming && m.planning) ?? false;
  const { state, actions } = useWorkspace();
  const isWs = state.isWorkspaceView;
  const moveDir = getMoveDirection(state.root, paneId);
  const [showEditTitle, setShowEditTitle] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const dynamicBg = isPlanning
    ? "bg-warning/15"
    : isStreaming
      ? "bg-primary/15"
      : "bg-base-200";

  const titleButton = (
    <button
      onClick={() => session && setShowEditTitle(true)}
      className="text-sm font-medium px-1 text-left btn btn-ghost btn-sm h-auto min-h-0 py-1 max-w-full"
    >
      <span className="truncate">{session?.title ?? "Loading..."}</span>
    </button>
  );

  const attachments = messages ? (
    <AttachmentsPopover
      messages={messages}
      scrollContainer={messagesContainerRef}
    />
  ) : null;

  return (
    <>
      {isWs ? (
        <div
          className={`navbar shrink-0 gap-1 min-h-0 py-0.5 px-2 transition-colors duration-300 ${dynamicBg}`}
        >
          <div className="flex-none">
            <PaneMenu paneId={paneId} actions={actions} moveDir={moveDir} />
          </div>
          <div className="flex-1 min-w-0">{titleButton}</div>
          {attachments && <div className="flex-none">{attachments}</div>}
        </div>
      ) : (
        <TopBar
          bg={dynamicBg}
          className="transition-colors duration-300"
          trailing={attachments}
        >
          {titleButton}
        </TopBar>
      )}
      {showEditTitle && session && (
        <EditTitleModal
          sessionId={sessionId}
          currentTitle={session.title}
          isCustomTitle={!!session.customTitle}
          onClose={() => setShowEditTitle(false)}
        />
      )}
    </>
  );
}

function ChatPaneContent({
  paneId,
  sessionId,
}: {
  paneId: string;
  sessionId: Id<"sessions">;
}) {
  const { state, actions } = useWorkspace();
  const isFocused = state.focusedPaneId === paneId;
  const keyboardVisible = useKeyboardVisible();
  const [textareaFocused, setTextareaFocused] = useState(false);

  // Only expand pane when both the textarea is focused AND the keyboard is actually visible
  useEffect(() => {
    if (!state.isWorkspaceView) return;
    if (textareaFocused && keyboardVisible) {
      actions.setInputFocused(paneId);
    } else if (state.inputFocusedPaneId === paneId) {
      actions.setInputFocused(null);
    }
  }, [
    textareaFocused,
    keyboardVisible,
    paneId,
    state.isWorkspaceView,
    state.inputFocusedPaneId,
    actions,
  ]);

  const messages = useQuery(api.messages.list, { sessionId });
  const queuedMessages = useQuery(api.queuedMessages.list, { sessionId });
  const sendMessage = useMutation(api.messages.send);
  const removeLastExchange = useMutation(api.messages.removeLastExchange);
  const addToQueue = useMutation(api.queuedMessages.add);
  const removeFromQueue = useMutation(api.queuedMessages.remove);
  const updateQueued = useMutation(api.queuedMessages.update);
  const markSeen = useMutation(api.sessions.markSeen);
  const { upload, pendingUploads, isUploading, removePending, clearPending } =
    useUpload(sessionId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const draftKey = `draft:${sessionId}`;
  const [input, setInput] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem(draftKey);
    if (saved) setInput(saved);
  }, [draftKey]);

  useEffect(() => {
    if (input) {
      sessionStorage.setItem(draftKey, input);
    } else {
      sessionStorage.removeItem(draftKey);
    }
  }, [input, draftKey]);

  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const witnessedStreamingRef = useRef<Set<string>>(new Set());
  const initialMessageIdsRef = useRef<Set<string> | null>(null);

  const isStreaming = messages?.some((m) => m.streaming) ?? false;
  const isPlanning = messages?.some((m) => m.streaming && m.planning) ?? false;

  useEffect(() => {
    if (messages && !isStreaming) markSeen({ id: sessionId });
  }, [messages, isStreaming, sessionId, markSeen]);

  useEffect(() => {
    if (messages && initialMessageIdsRef.current === null) {
      initialMessageIdsRef.current = new Set(messages.map((m) => m._id));
    }
  }, [messages]);

  const drainingRef = useRef(false);
  useEffect(() => {
    if (
      queuedMessages &&
      queuedMessages.length > 0 &&
      !isStreaming &&
      !isLoading &&
      !drainingRef.current
    ) {
      drainingRef.current = true;
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .catch((err) => console.error("Failed to drain orphaned queue:", err))
        .finally(() => {
          drainingRef.current = false;
        });
    }
  }, [queuedMessages, isStreaming, isLoading, sessionId]);

  useEffect(() => {
    if (messages) {
      for (const m of messages) {
        if (m.streaming) witnessedStreamingRef.current.add(m._id);
      }
    }
  }, [messages]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, []);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
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
    if (!input.trim() && pendingUploads.length === 0) return;

    const content = input.trim() || "(image)";
    const attachmentIds = pendingUploads.map((u) => u.id);
    setInput("");
    clearPending();

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    if (isStreaming || isLoading) {
      await addToQueue({
        sessionId,
        content,
        attachments: attachmentIds.length > 0 ? attachmentIds : undefined,
      });
      return;
    }

    if (queuedMessages && queuedMessages.length > 0) {
      await addToQueue({
        sessionId,
        content,
        attachments: attachmentIds.length > 0 ? attachmentIds : undefined,
      });
      setIsLoading(true);
      try {
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch (error) {
        console.error("Failed to drain queue:", error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      await sendMessage({
        sessionId,
        content,
        attachments: attachmentIds.length > 0 ? attachmentIds : undefined,
      });
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const [isCancelling, setIsCancelling] = useState(false);
  const handleCancel = async () => {
    if (isCancelling) return;
    setIsCancelling(true);
    try {
      await fetch("/api/chat/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      console.error("Failed to cancel:", error);
    } finally {
      setIsCancelling(false);
      setIsLoading(false);
    }
  };

  const handleEditLastMessage = async () => {
    // Cancel any active stream first
    await fetch("/api/chat/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    setIsLoading(false);

    // Remove the last user message + assistant response, get content back
    const result = await removeLastExchange({ sessionId });
    if (result) {
      setInput(result.content === "(image)" ? "" : result.content);
      textareaRef.current?.focus();
    }
  };

  return (
    <div
      className={`flex flex-col h-full w-full overflow-hidden ${
        isFocused ? "ring-1 ring-primary/30 bg-base-100" : "bg-base-200"
      }`}
      onClick={() => actions.focusPane(paneId)}
    >
      {state.isWorkspaceView ? (
        <WorkspacePaneNavbar sessionId={sessionId} paneId={paneId} />
      ) : (
        <FullNavbar sessionId={sessionId} paneId={paneId} />
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
        {messages?.length === 0 && (
          <p className="text-center text-base-content/30 mt-12 text-sm">
            Send a message to start the conversation.
          </p>
        )}
        {messages?.map((message, idx) => {
          const isLastUserMessage =
            message.role === "user" &&
            !messages.slice(idx + 1).some((m) => m.role === "user");
          const isError =
            message.error ||
            (message.role === "assistant" &&
              !message.streaming &&
              message.content.startsWith("Error: "));
          const isLastError =
            isError &&
            !messages
              .slice(idx + 1)
              .some(
                (m) =>
                  m.error ||
                  (m.role === "assistant" &&
                    !m.streaming &&
                    m.content.startsWith("Error: ")),
              );
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const curDate = new Date(message.createdAt);
          const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;
          const showDateDivider =
            prevDate != null &&
            (curDate.getDate() !== prevDate.getDate() ||
              curDate.getMonth() !== prevDate.getMonth() ||
              curDate.getFullYear() !== prevDate.getFullYear());

          return (
            <React.Fragment key={message._id}>
              {showDateDivider && formatDateLabel(message.createdAt) && (
                <div className="divider text-[10px] opacity-40 my-2">
                  {formatDateLabel(message.createdAt)}
                </div>
              )}
              <div
                id={`msg-${message._id}`}
                className={`chat ${message.role === "user" ? "chat-end" : "chat-start"} ${
                  initialMessageIdsRef.current &&
                  !initialMessageIdsRef.current.has(message._id)
                    ? "chat-animate"
                    : ""
                }`}
              >
                {isError ? (
                  <ErrorMessage
                    content={message.content}
                    showRetry={isLastError}
                    onRetry={() => {
                      const prevUserMsg = [...messages!]
                        .slice(0, idx)
                        .reverse()
                        .find((m) => m.role === "user");
                      if (prevUserMsg) setInput(prevUserMsg.content);
                    }}
                  />
                ) : (
                  <div
                    className={`chat-bubble ${
                      message.role === "user" ? "chat-bubble-primary" : ""
                    } ${message.cancelled && message.content === "(cancelled)" ? "opacity-50" : ""}`}
                  >
                    {message.attachments && message.attachments.length > 0 && (
                      <MessageImages
                        attachmentIds={message.attachments as Id<"uploads">[]}
                      />
                    )}
                    <div className="text-sm leading-relaxed select-text">
                      {message.streaming ? (
                        <StreamingMarkdown content={message.content} />
                      ) : message.role === "assistant" ? (
                        <CollapsibleMessage
                          content={message.content}
                          skipCollapse={witnessedStreamingRef.current.has(
                            message._id,
                          )}
                        />
                      ) : message.content === "(image)" ? null : (
                        <div className="prose prose-sm prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 justify-between">
                      {isLastUserMessage && (isStreaming || isLoading) ? (
                        <button
                          onClick={handleEditLastMessage}
                          className="btn btn-ghost btn-xs btn-circle opacity-40 active:opacity-100 transition-opacity"
                          aria-label="Edit message"
                        >
                          <PencilSimple size={12} weight="bold" />
                        </button>
                      ) : message.role === "assistant" ? null : (
                        <span />
                      )}
                      <span className="text-[10px] opacity-30">
                        {formatTime(message.createdAt)}
                      </span>
                      {message.streaming && (
                        <div className="flex items-center gap-2">
                          {message.planning && (
                            <span className="text-[10px] text-warning/70 uppercase tracking-wider">
                              planning
                            </span>
                          )}
                          <span
                            className={`loading loading-dots loading-xs ${message.planning ? "text-warning/50" : "opacity-50"}`}
                          />
                          <button
                            onClick={handleCancel}
                            disabled={isCancelling}
                            className="btn btn-ghost btn-xs btn-circle opacity-50 active:opacity-100 transition-opacity"
                            aria-label="Stop response"
                          >
                            <X size={14} weight="bold" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
        {isLoading && messages && !messages.some((m) => m.streaming) && (
          <div className="chat chat-start chat-animate">
            <div className="chat-bubble">
              <div className="flex items-center gap-4 justify-between">
                <span className="text-[10px] opacity-30">
                  {formatTime(Date.now())}
                </span>
                <div className="flex items-center gap-2">
                  <span className="loading loading-dots loading-xs opacity-50" />
                  <button
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="btn btn-ghost btn-xs btn-circle opacity-50 active:opacity-100 transition-opacity"
                    aria-label="Stop response"
                  >
                    <X size={14} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input section — only shown when focused */}
      {isFocused && (
        <div className="shrink-0 border-t border-base-300">
          {queuedMessages && queuedMessages.length > 0 && (
            <div className="px-3 pt-2 flex flex-col gap-1">
              <span className="text-xs opacity-40 px-1 uppercase tracking-wide flex items-center gap-1">
                <Queue size={12} weight="duotone" />
                Queued
              </span>
              {queuedMessages.map((qm, i) => (
                <QueuedMessageRow
                  key={qm._id}
                  content={qm.content}
                  index={i}
                  attachments={qm.attachments as Id<"uploads">[] | undefined}
                  onRemove={() => removeFromQueue({ id: qm._id })}
                  onUpdate={(content) => updateQueued({ id: qm._id, content })}
                />
              ))}
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
            <div
              className={`flex items-end gap-1.5 rounded-2xl border px-1.5 py-1.5 transition-colors ${
                isPlanning
                  ? "border-warning/30 bg-warning/5 focus-within:border-warning/40"
                  : "border-base-content/10 bg-base-200/50 focus-within:border-base-content/20 focus-within:bg-base-300/50"
              }`}
            >
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
                onFocus={() => setTextareaFocused(true)}
                onBlur={() => setTextareaFocused(false)}
                placeholder={
                  isStreaming || isLoading
                    ? "Type to queue..."
                    : "Message... (Enter to send)"
                }
                rows={1}
                className="flex-1 text-sm resize-none bg-transparent border-none outline-none py-1.5 min-h-0 leading-snug placeholder:opacity-40"
              />
              <button
                type="submit"
                disabled={!input.trim() && pendingUploads.length === 0}
                className={`btn btn-sm btn-circle shrink-0 ${isStreaming || isLoading ? "btn-secondary" : "btn-primary"}`}
              >
                {isStreaming || isLoading ? (
                  <Queue size={18} weight="bold" />
                ) : (
                  <PaperPlaneTilt size={18} weight="fill" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function ChatPane({
  paneId,
  sessionId,
}: {
  paneId: string;
  sessionId: Id<"sessions"> | null;
}) {
  if (!sessionId) {
    return <SessionPicker paneId={paneId} />;
  }

  return <ChatPaneContent paneId={paneId} sessionId={sessionId} />;
}
