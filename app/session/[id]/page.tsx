"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  List,
  PaperPlaneTilt,
  Queue,
  PencilSimple,
  X,
  CaretDown,
  CaretUp,
  Brain,
  Terminal,
  Warning,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { EditTitleModal } from "./edit-title-modal";
import { SessionDrawer } from "@/app/components/session-drawer";

/**
 * Recursively wraps string children in animated spans so new words fade in.
 * Index-based keys mean existing tokens keep their key across re-renders
 * and only newly appended tokens mount with the CSS animation.
 */
function animateText(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      return child.split(/(\s+)/).map((token, i) => (
        <span key={i} className="streaming-token">
          {token}
        </span>
      ));
    }
    if (React.isValidElement(child)) {
      const props = child.props as Record<string, unknown>;
      if (props.children) {
        return React.cloneElement(
          child as React.ReactElement<Record<string, unknown>>,
          {
            children: animateText(props.children as React.ReactNode),
          },
        );
      }
    }
    return child;
  });
}

/**
 * Renders streaming markdown with word-level fade-in animation.
 *
 * Splits content at the last paragraph break (\n\n). Everything before
 * is "settled" — rendered as plain markdown. The tail (current paragraph
 * being written) is rendered through ReactMarkdown with custom components
 * that wrap text tokens in animated <span>s.
 */
function StreamingMarkdown({ content }: { content: string }) {
  const [settledLen, setSettledLen] = useState(0);
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    const id = setInterval(() => {
      setSettledLen(contentRef.current.length);
    }, 400);
    return () => clearInterval(id);
  }, []);

  // Split at last paragraph break before settled position
  const safeLen = Math.min(settledLen, content.length);
  const lastBreak = content.lastIndexOf("\n\n", safeLen);
  const boundary = lastBreak > 0 ? lastBreak + 2 : 0;

  const stablePart = content.slice(0, boundary);
  const tailPart = content.slice(boundary);

  // Memoize so React sees stable component references and can reconcile children
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tailComponents: any = useMemo(
    () => ({
      p: ({ children, node, ...props }: any) => (
        <p {...props}>{animateText(children)}</p>
      ),
      li: ({ children, node, ...props }: any) => (
        <li {...props}>{animateText(children)}</li>
      ),
      h1: ({ children, node, ...props }: any) => (
        <h1 {...props}>{animateText(children)}</h1>
      ),
      h2: ({ children, node, ...props }: any) => (
        <h2 {...props}>{animateText(children)}</h2>
      ),
      h3: ({ children, node, ...props }: any) => (
        <h3 {...props}>{animateText(children)}</h3>
      ),
      td: ({ children, node, ...props }: any) => (
        <td {...props}>{animateText(children)}</td>
      ),
    }),
    [],
  );

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      {stablePart && (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{stablePart}</ReactMarkdown>
      )}
      {tailPart && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={tailComponents}>
          {tailPart}
        </ReactMarkdown>
      )}
    </div>
  );
}

/**
 * Detects long assistant messages and renders them in a collapsible container.
 * Short messages render inline. Long ones get a max-height with a "Show more" toggle.
 */
function CollapsibleMessage({
  content,
  skipCollapse,
}: {
  content: string;
  skipCollapse?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      // Only collapse if there's enough hidden content to justify it
      // (~10 lines beyond the 300px cutoff at prose-sm line height)
      setIsOverflowing(el.scrollHeight > 500);
    }
  }, [content]);

  const shouldCollapse = isOverflowing && !skipCollapse;

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={`prose prose-sm prose-invert max-w-none overflow-hidden transition-[max-height] duration-300 ${
          !expanded && shouldCollapse ? "max-h-[300px]" : ""
        }`}
        style={
          !expanded && shouldCollapse
            ? {
                maskImage:
                  "linear-gradient(to bottom, black 60%, transparent 100%)",
              }
            : undefined
        }
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
      {shouldCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn btn-xs btn-block rounded-full gap-1 opacity-50 active:opacity-100 transition-opacity mt-1"
          style={{
            backgroundColor: "oklch(from oklch(var(--n)) calc(l - 0.05) c h)",
          }}
        >
          {expanded ? (
            <>
              <CaretUp size={12} weight="bold" />
              Less
            </>
          ) : (
            <>
              <CaretDown size={12} weight="bold" />
              More
            </>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Formats a timestamp into a WhatsApp-style date label.
 * "Today", "Yesterday", day name for this week, or "Mon, Feb 20" for older.
 */
function formatDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - startOfDate) / 86400000);

  if (diffDays === 0) return "";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** Formats a timestamp as a short local time like "2:34 PM". */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Renders a subtle, collapsible list of intermediate thinking/tool steps.
 * Collapsed by default — shows a small summary line. Expands to reveal details.
 */
function ThinkingSteps({ steps }: { steps: string[] }) {
  const [open, setOpen] = useState(false);

  const thinkingCount = steps.filter((s) => s.startsWith("thinking:")).length;
  const toolCount = steps.filter((s) => s.startsWith("tool:")).length;

  const parts: string[] = [];
  if (thinkingCount > 0) parts.push(`${thinkingCount} thinking`);
  if (toolCount > 0) parts.push(`${toolCount} tool use`);
  const summary = parts.join(", ");

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] opacity-40 active:opacity-60 transition-opacity"
      >
        <Brain size={12} weight="duotone" />
        <span>{summary}</span>
        {open ? (
          <CaretUp size={10} weight="bold" />
        ) : (
          <CaretDown size={10} weight="bold" />
        )}
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col gap-1 text-[11px] opacity-50">
          {steps.map((step, i) => {
            const isThinking = step.startsWith("thinking:");
            const content = step.replace(/^(thinking|tool):/, "");
            return (
              <div key={i} className="flex items-start gap-1.5">
                {isThinking ? (
                  <Brain
                    size={11}
                    weight="duotone"
                    className="shrink-0 mt-0.5"
                  />
                ) : (
                  <Terminal
                    size={11}
                    weight="duotone"
                    className="shrink-0 mt-0.5"
                  />
                )}
                <span
                  className={`${isThinking ? "line-clamp-3" : ""} break-all`}
                >
                  {content}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Renders an error message with collapsible raw details and optional retry.
 */
function ErrorMessage({
  content,
  showRetry,
  onRetry,
}: {
  content: string;
  showRetry: boolean;
  onRetry: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const errorText = content.replace(/^Error: /, "");

  // Try to parse as JSON for a nice summary, fall back to raw text
  let summary = errorText;
  let rawJson = errorText;
  try {
    const parsed = JSON.parse(errorText);
    summary = parsed.message || errorText;
    rawJson = JSON.stringify(parsed, null, 2);
  } catch {
    // Not JSON — use first line as summary
    const firstLine = errorText.split("\n")[0];
    summary =
      firstLine.length > 120 ? firstLine.slice(0, 117) + "..." : firstLine;
  }

  return (
    <div className="alert alert-error flex-col items-start gap-1 text-sm py-2 px-3">
      <div className="flex items-center gap-2 w-full">
        <Warning size={18} weight="bold" className="shrink-0" />
        <span className="flex-1 min-w-0 text-sm select-text break-words">
          {summary}
        </span>
        {showRetry && (
          <button
            onClick={onRetry}
            className="btn btn-ghost btn-xs btn-circle shrink-0 active:bg-error/20"
            aria-label="Retry"
          >
            <ArrowClockwise size={14} weight="bold" />
          </button>
        )}
      </div>
      <button
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="flex items-center gap-1 text-[10px] opacity-50 active:opacity-80 transition-opacity"
      >
        {detailsOpen ? (
          <CaretUp size={10} weight="bold" />
        ) : (
          <CaretDown size={10} weight="bold" />
        )}
        Details
      </button>
      {detailsOpen && (
        <pre className="text-[11px] opacity-60 bg-black/20 rounded p-2 w-full overflow-x-auto whitespace-pre-wrap break-all select-text max-h-48 overflow-y-auto">
          {rawJson}
        </pre>
      )}
    </div>
  );
}

/**
 * Inline-editable queued message row.
 */
function QueuedMessageRow({
  content,
  index,
  onRemove,
  onUpdate,
}: {
  content: string;
  index: number;
  onRemove: () => void;
  onUpdate: (newContent: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== content) {
      onUpdate(trimmed);
    } else {
      setDraft(content);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-base-300/50 rounded-lg">
      <span className="badge badge-sm badge-ghost mt-0.5 shrink-0">
        {index + 1}
      </span>
      {editing ? (
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSave();
            }
            if (e.key === "Escape") {
              setDraft(content);
              setEditing(false);
            }
          }}
          rows={1}
          className="textarea textarea-bordered textarea-xs flex-1 text-xs resize-none"
        />
      ) : (
        <span
          className="flex-1 text-xs truncate cursor-pointer opacity-70"
          onClick={() => setEditing(true)}
        >
          {content}
        </span>
      )}
      <button
        onClick={() => setEditing(true)}
        className="btn btn-ghost btn-xs px-1 opacity-40"
        aria-label="Edit"
      >
        <PencilSimple size={12} weight="duotone" />
      </button>
      <button
        onClick={onRemove}
        className="btn btn-ghost btn-xs px-1 opacity-40"
        aria-label="Remove"
      >
        <X size={12} weight="bold" />
      </button>
    </div>
  );
}

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as Id<"sessions">;

  const session = useQuery(api.sessions.get, { id: sessionId });
  const messages = useQuery(api.messages.list, { sessionId });
  const queuedMessages = useQuery(api.queuedMessages.list, { sessionId });
  const sendMessage = useMutation(api.messages.send);
  const addToQueue = useMutation(api.queuedMessages.add);
  const removeFromQueue = useMutation(api.queuedMessages.remove);
  const updateQueued = useMutation(api.queuedMessages.update);
  const shiftQueue = useMutation(api.queuedMessages.shift);

  const draftKey = `draft:${sessionId}`;
  const [input, setInput] = useState("");

  // Restore draft from sessionStorage after hydration
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
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [showEditTitle, setShowEditTitle] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSendingRef = useRef(false);
  const witnessedStreamingRef = useRef<Set<string>>(new Set());
  const initialMessageIdsRef = useRef<Set<string> | null>(null);

  const isStreaming = messages?.some((m) => m.streaming) ?? false;

  // Capture initial message IDs on first load (no animation for these)
  useEffect(() => {
    if (messages && initialMessageIdsRef.current === null) {
      initialMessageIdsRef.current = new Set(messages.map((m) => m._id));
    }
  }, [messages]);

  // Track which messages we've seen streaming live
  useEffect(() => {
    if (messages) {
      for (const m of messages) {
        if (m.streaming) {
          witnessedStreamingRef.current.add(m._id);
        }
      }
    }
  }, [messages]);

  // Track visual viewport height to handle mobile keyboard
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      setViewportHeight(vv.height);
    };

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // Always instant-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, [messages, viewportHeight]);

  // Auto-send queued messages when streaming ends
  useEffect(() => {
    if (isStreaming || isLoading || autoSendingRef.current) return;
    if (!queuedMessages || queuedMessages.length === 0) return;

    const sendNext = async () => {
      autoSendingRef.current = true;
      setIsLoading(true);
      try {
        const content = await shiftQueue({ sessionId });
        if (content) {
          await sendMessage({ sessionId, content });
          await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
        }
      } catch (error) {
        console.error("Failed to auto-send queued message:", error);
      } finally {
        setIsLoading(false);
        autoSendingRef.current = false;
      }
    };

    sendNext();
  }, [
    isStreaming,
    isLoading,
    queuedMessages,
    sessionId,
    shiftQueue,
    sendMessage,
  ]);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const content = input.trim();
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // If streaming or loading, queue instead of sending directly
    if (isStreaming || isLoading) {
      await addToQueue({ sessionId, content });
      return;
    }

    setIsLoading(true);

    try {
      await sendMessage({ sessionId, content });
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
    }
  };

  return (
    <SessionDrawer activeSessionId={sessionId}>
      <div
        className="flex flex-col"
        style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}
      >
        <div
          className={`navbar shrink-0 gap-1 transition-colors duration-300 ${isStreaming ? "bg-primary/15" : "bg-base-200"}`}
        >
          <div className="flex-none">
            <label
              htmlFor="session-drawer"
              className="btn btn-ghost btn-sm btn-square"
            >
              <List size={18} weight="bold" />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => session && setShowEditTitle(true)}
              className="text-sm font-medium truncate px-1 text-left btn btn-ghost btn-sm h-auto min-h-0 py-1"
            >
              {session?.title ?? "Loading..."}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages?.length === 0 && (
            <p className="text-center text-base-content/30 mt-12 text-sm">
              Send a message to start the conversation.
            </p>
          )}
          {messages?.map((message, idx) => {
            const isError = message.error || (message.role === "assistant" && !message.streaming && message.content.startsWith("Error: "));
            // Only show retry on the very last error message
            const isLastError = isError && !messages.slice(idx + 1).some(
              (m) => m.error || (m.role === "assistant" && !m.streaming && m.content.startsWith("Error: ")),
            );
            // Show a date divider when the day changes between messages
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
                    <div className="text-sm leading-relaxed select-text">
                      {message.streaming ? (
                        <>
                          <StreamingMarkdown content={message.content} />
                          <div className="flex items-center justify-end gap-2 mt-1">
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
                        </>
                      ) : message.role === "assistant" ? (
                        <CollapsibleMessage
                          content={message.content}
                          skipCollapse={witnessedStreamingRef.current.has(
                            message._id,
                          )}
                        />
                      ) : (
                        <div className="prose prose-sm prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {/* TODO: ThinkingSteps hidden for now */}
                    <div className={`text-[10px] opacity-30 mt-1 ${message.role === "user" ? "text-right" : "text-left"}`}>
                      {formatTime(message.createdAt)}
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
                <span className="loading loading-dots loading-xs" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

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
                  onRemove={() => removeFromQueue({ id: qm._id })}
                  onUpdate={(content) => updateQueued({ id: qm._id, content })}
                />
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="p-3">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  resizeTextarea();
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isStreaming || isLoading
                    ? "Type to queue..."
                    : "Message... (Enter to send)"
                }
                rows={1}
                className="textarea flex-1 text-sm resize-none py-2 min-h-0 bg-transparent border border-base-content/10 focus:bg-base-300/50 focus:border-base-content/20 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className={`btn btn-sm btn-square ${isStreaming || isLoading ? "btn-secondary" : "btn-primary"}`}
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

        {showEditTitle && session && (
          <EditTitleModal
            sessionId={sessionId}
            currentTitle={session.title}
            onClose={() => setShowEditTitle(false)}
          />
        )}
      </div>
    </SessionDrawer>
  );
}
