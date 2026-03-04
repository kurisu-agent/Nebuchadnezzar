"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  Terminal,
} from "@phosphor-icons/react";
import { useUpload } from "@/app/hooks/use-upload";
import { TopBar } from "@/app/components/top-bar";
import { formatDateLabel, formatTime } from "@/app/components/chat/utils";
import { StreamingMarkdown } from "@/app/components/chat/streaming-markdown";
import { CollapsibleMessage } from "@/app/components/chat/collapsible-message";
import { ErrorMessage } from "@/app/components/chat/error-message";
import { PlanMessage } from "@/app/components/chat/plan-message";
import { MessageImages } from "@/app/components/chat/message-images";
import { MediaModal } from "@/app/components/chat/media-modal";
import { QueuedMessageRow } from "@/app/components/chat/queued-message-row";
import { EditTitleModal } from "@/app/session/[id]/edit-title-modal";
import {
  SlashCommandPicker,
  type SlashCommandPickerHandle,
} from "@/app/components/chat/slash-command-picker";
import { filterCommands } from "@/lib/slash-commands";
import { useRouter } from "next/navigation";
import { useWorkspace, getMoveDirection } from "./workspace-context";
import { useKeyboardVisible } from "./use-keyboard-visible";
import { SessionPicker } from "./session-picker";

/** Unified pane bar for workspace mode — identical layout in focused/unfocused to prevent reflow */
function WorkspacePaneNavbar({
  sessionId,
  paneId,
  projectColor,
  projectName,
}: {
  sessionId: Id<"sessions">;
  paneId: string;
  projectColor?: string;
  projectName?: string;
}) {
  const session = useQuery(api.sessions.get, { id: sessionId });
  const messages = useQuery(api.messages.list, { sessionId });
  const isStreaming = messages?.some((m) => m.streaming) ?? false;
  const isPlanning = messages?.some((m) => m.streaming && m.planning) ?? false;
  const { state, actions } = useWorkspace();
  const moveDir = getMoveDirection(state.root, paneId);

  const bgClass = isPlanning
    ? "bg-warning/10"
    : isStreaming
      ? "bg-primary/10"
      : "bg-base-200/60";

  return (
    <div
      className={`shrink-0 flex items-center gap-1.5 px-2 h-8 transition-colors duration-300 ${bgClass}`}
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
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        {projectName && (
          <span
            className="text-[10px] shrink-0"
            style={{ color: projectColor }}
          >
            {projectName}
          </span>
        )}
        <span className="text-sm truncate opacity-60">
          {session?.title ?? "..."}
        </span>
      </div>
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
  projectColor,
  projectName,
  projectId,
}: {
  sessionId: Id<"sessions">;
  paneId: string;
  projectColor?: string;
  projectName?: string;
  projectId?: Id<"projects">;
}) {
  const session = useQuery(api.sessions.get, { id: sessionId });
  const messages = useQuery(api.messages.list, { sessionId });
  const isStreaming = messages?.some((m) => m.streaming) ?? false;
  const isPlanning = messages?.some((m) => m.streaming && m.planning) ?? false;
  const router = useRouter();
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

  const titleContent = (
    <div className="flex items-center justify-between gap-2 w-full min-w-0">
      <button
        onClick={() => session && setShowEditTitle(true)}
        className="text-sm font-medium px-1 py-0.5 text-left rounded min-w-0 truncate active:bg-base-300"
      >
        {session?.title ?? "Loading..."}
      </button>
      {projectName && (
        <button
          onClick={() => projectId && router.push(`/project/${projectId}/sessions`)}
          className="btn btn-ghost btn-xs h-auto min-h-0 py-0.5 px-1.5 shrink-0 max-w-[40%] overflow-hidden active:bg-base-300"
        >
          <span
            className="text-[10px] truncate"
            style={{ color: projectColor }}
          >
            {projectName}
          </span>
        </button>
      )}
    </div>
  );

  return (
    <>
      {isWs ? (
        <div
          className={`navbar shrink-0 gap-1 min-h-0 py-0.5 px-2 transition-colors duration-300 ${dynamicBg}`}
        >
          <div className="flex-none">
            <PaneMenu paneId={paneId} actions={actions} moveDir={moveDir} />
          </div>
          <div className="flex-1 min-w-0">{titleContent}</div>
        </div>
      ) : (
        <TopBar
          bg={dynamicBg}
          className="transition-colors duration-300"
        >
          {titleContent}
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

  const sessionDoc = useQuery(api.sessions.get, { id: sessionId });
  const project = useQuery(
    api.projects.get,
    sessionDoc?.projectId ? { id: sessionDoc.projectId } : "skip",
  );
  const projectColor =
    project && !project.deletedAt ? project.color : undefined;
  const projectName = project && !project.deletedAt ? project.name : undefined;

  const messages = useQuery(api.messages.list, { sessionId });
  const queuedMessages = useQuery(api.queuedMessages.list, { sessionId });
  const sendMessage = useMutation(api.messages.send);
  const removeLastExchange = useMutation(api.messages.removeLastExchange);
  const addToQueue = useMutation(api.queuedMessages.add);
  const removeFromQueue = useMutation(api.queuedMessages.remove);
  const updateQueued = useMutation(api.queuedMessages.update);
  const markSeen = useMutation(api.sessions.markSeen);
  const forkSession = useMutation(api.sessions.fork);
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
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showCommandPicker, setShowCommandPicker] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [highlightedCommandIndex, setHighlightedCommandIndex] = useState(0);
  const commandPickerRef = useRef<SlashCommandPickerHandle>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const witnessedStreamingRef = useRef<Set<string>>(new Set());
  const initialMessageIdsRef = useRef<Set<string> | null>(null);

  const isStreaming = messages?.some((m) => m.streaming) ?? false;
  const isPlanning = messages?.some((m) => m.streaming && m.planning) ?? false;
  const lastMessage = messages?.[messages.length - 1];
  const hasPendingResponse =
    !!lastMessage &&
    lastMessage.role === "user" &&
    !isStreaming &&
    !isLoading &&
    Date.now() - lastMessage.createdAt < 30_000;

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

  // Sync showCommandPicker state with native popover toggle events
  useEffect(() => {
    const el = document.getElementById(`cmd-picker-${sessionId}`);
    if (!el) return;
    const onToggle = (e: Event) => {
      const { newState } = e as ToggleEvent;
      setShowCommandPicker(newState === "open");
    };
    el.addEventListener("toggle", onToggle);
    return () => el.removeEventListener("toggle", onToggle);
  }, [sessionId]);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 200;
      const scrollH = textarea.scrollHeight;
      textarea.style.height = Math.min(scrollH, maxHeight) + "px";
      // Show scrollbar only when content exceeds max height
      textarea.style.overflowY = scrollH > maxHeight ? "auto" : "hidden";
    }
  }, []);

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

  const prepareInput = (): {
    content: string;
    attachmentIds: Id<"uploads">[];
  } | null => {
    if (!input.trim() && pendingUploads.length === 0) return null;
    const content = input.trim() || "(image)";
    const attachmentIds = pendingUploads.map((u) => u.id);
    setInput("");
    clearPending();
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    return { content, attachmentIds };
  };

  const handleSendDirect = async () => {
    const prepared = prepareInput();
    if (!prepared) return;

    // If streaming, cancel the current response first
    if (isStreaming) {
      try {
        await fetch("/api/chat/interrupt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch (err) {
        console.error("Failed to interrupt:", err);
      }
    }

    setIsLoading(true);
    try {
      await sendMessage({
        sessionId,
        content: prepared.content,
        attachments:
          prepared.attachmentIds.length > 0
            ? prepared.attachmentIds
            : undefined,
      });
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueue = async () => {
    const prepared = prepareInput();
    if (!prepared) return;
    await addToQueue({
      sessionId,
      content: prepared.content,
      attachments:
        prepared.attachmentIds.length > 0 ? prepared.attachmentIds : undefined,
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    // During streaming: send directly (default behavior)
    if (isStreaming || isLoading) {
      await handleSendDirect();
      return;
    }

    // Idle with queued messages: add to queue + drain
    if (queuedMessages && queuedMessages.length > 0) {
      const prepared = prepareInput();
      if (!prepared) return;
      await addToQueue({
        sessionId,
        content: prepared.content,
        attachments:
          prepared.attachmentIds.length > 0
            ? prepared.attachmentIds
            : undefined,
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

    // Idle, no queue: send directly
    setIsLoading(true);
    try {
      await handleSendDirect();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommandSelect = async (command: string) => {
    setShowCommandPicker(false);
    commandPickerRef.current?.hide();

    // Handle Nebuchadnezzar actions
    if (command === "fork") {
      const newId = await forkSession({ id: sessionId });
      window.location.href = `/session/${newId}`;
      return;
    }
    if (command === "media") {
      setShowMediaModal(true);
      return;
    }

    // Slash commands — insert into textarea
    setInput(command + " ");
    textareaRef.current?.focus();
    requestAnimationFrame(resizeTextarea);
  };

  const isPasteRef = useRef(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showCommandPicker) {
      const filtered = filterCommands(commandQuery);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedCommandIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedCommandIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        if (filtered[highlightedCommandIndex]) {
          handleCommandSelect(filtered[highlightedCommandIndex].command);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowCommandPicker(false);
        commandPickerRef.current?.hide();
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey && !isPasteRef.current) {
      e.preventDefault();
      setShowCommandPicker(false);
      commandPickerRef.current?.hide();
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
      style={
        projectColor ? { backgroundColor: `${projectColor}20` } : undefined
      }
      onClick={() => actions.focusPane(paneId)}
    >
      {state.isWorkspaceView ? (
        <WorkspacePaneNavbar
          sessionId={sessionId}
          paneId={paneId}
          projectColor={projectColor}
          projectName={projectName}
        />
      ) : (
        <FullNavbar
          sessionId={sessionId}
          paneId={paneId}
          projectColor={projectColor}
          projectName={projectName}
          projectId={sessionDoc?.projectId}
        />
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
          // Hide cancelled assistant bubbles that were interrupted by a direct send
          const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
          const isInterrupted =
            message.cancelled &&
            message.role === "assistant" &&
            nextMsg?.role === "user";
          if (isInterrupted) return null;

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
                      {message.wasPlan && !message.streaming ? (
                        <PlanMessage
                          content={message.content}
                          planContent={message.planContent}
                        />
                      ) : message.streaming ? (
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
        {(isLoading || hasPendingResponse) &&
          messages &&
          !messages.some((m) => m.streaming) && (
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
        <div className="shrink-0">
          {/* Context usage bar */}
          <div className="h-[2px] w-full bg-base-300">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                sessionDoc?.contextUsed && sessionDoc?.contextWindow && sessionDoc.contextUsed / sessionDoc.contextWindow > 0.85
                  ? "bg-error"
                  : sessionDoc?.contextUsed && sessionDoc?.contextWindow && sessionDoc.contextUsed / sessionDoc.contextWindow > 0.65
                    ? "bg-warning"
                    : "bg-primary"
              }`}
              style={{
                width: `${Math.max(2, sessionDoc?.contextUsed && sessionDoc?.contextWindow && sessionDoc.contextWindow > 0 ? Math.min(100, (sessionDoc.contextUsed / sessionDoc.contextWindow) * 100) : 0)}%`,
              }}
            />
          </div>
          <SlashCommandPicker
            ref={commandPickerRef}
            query={commandQuery}
            onSelect={handleCommandSelect}
            highlightedIndex={highlightedCommandIndex}
            popoverId={`cmd-picker-${sessionId}`}
            anchorName={`--cmd-btn-${sessionId}`}
          />
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
              <button
                type="button"
                popoverTarget={`cmd-picker-${sessionId}`}
                onClick={() => {
                  setCommandQuery("");
                  setHighlightedCommandIndex(0);
                  textareaRef.current?.focus();
                }}
                className={`btn btn-sm btn-circle btn-ghost shrink-0 ${
                  showCommandPicker
                    ? "opacity-100 text-primary"
                    : "opacity-50 active:opacity-100"
                }`}
                style={
                  {
                    anchorName: `--cmd-btn-${sessionId}`,
                  } as React.CSSProperties
                }
                aria-label="Commands"
              >
                <Terminal size={18} weight="bold" />
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
                  const val = e.target.value;
                  setInput(val);
                  resizeTextarea();
                  if (val.startsWith("/") && !val.includes(" ")) {
                    setCommandQuery(val);
                    setHighlightedCommandIndex(0);
                    if (!showCommandPicker) {
                      setShowCommandPicker(true);
                      commandPickerRef.current?.show();
                    }
                  } else if (showCommandPicker) {
                    setShowCommandPicker(false);
                    commandPickerRef.current?.hide();
                  }
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={() => setTextareaFocused(true)}
                onBlur={() => setTextareaFocused(false)}
                placeholder={
                  isStreaming || isLoading
                    ? "Type to send or queue..."
                    : "Message... (⏎ send, ⇧⏎ newline)"
                }
                rows={1}
                className="flex-1 text-sm resize-none bg-transparent border-none outline-none py-1.5 min-h-0 leading-snug overflow-hidden placeholder:opacity-40"
              />
              <button
                type="submit"
                disabled={!input.trim() && pendingUploads.length === 0}
                className="btn btn-sm btn-circle shrink-0 btn-primary"
              >
                <PaperPlaneTilt size={18} weight="fill" />
              </button>
              {(isStreaming || isLoading) && (
                <button
                  type="button"
                  onClick={handleQueue}
                  disabled={!input.trim() && pendingUploads.length === 0}
                  className="btn btn-sm btn-circle shrink-0 btn-ghost opacity-50 active:opacity-100"
                >
                  <Queue size={18} weight="bold" />
                </button>
              )}
            </div>
          </form>
        </div>
      )}
      {/* Command picker backdrop removed — popover uses drop shadow instead */}
      {messages && (
        <MediaModal
          open={showMediaModal}
          onClose={() => setShowMediaModal(false)}
          messages={messages}
          scrollContainer={messagesContainerRef}
        />
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
