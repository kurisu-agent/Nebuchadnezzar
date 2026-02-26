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
import { useParams, useRouter } from "next/navigation";
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
  ImageSquare,
} from "@phosphor-icons/react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  ArrowCounterClockwise,
  DownloadSimple,
  Paperclip,
} from "@phosphor-icons/react";
import { EditTitleModal } from "./edit-title-modal";
import { SessionDrawer } from "@/app/components/session-drawer";
import { useUpload, proxyStorageUrl } from "@/app/hooks/use-upload";

/** Format bytes into a human-readable string. */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Full-screen image viewer modal with pinch-to-zoom (contained to image),
 * metadata bar (filename link, size, type, date), and zoom controls.
 */
function ImageViewer({
  src,
  alt,
  uploadId,
  meta,
  onClose,
}: {
  src: string;
  alt: string;
  uploadId: string;
  meta?: {
    filename: string;
    size: number;
    mimeType: string;
    createdAt: number;
  };
  onClose: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const serveUrl = `/api/uploads/serve?id=${uploadId}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Top bar: close + metadata + actions */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-black/60">
        <button
          onClick={onClose}
          className="btn btn-circle btn-sm btn-ghost text-white opacity-70 active:opacity-100"
          aria-label="Close"
        >
          <X size={20} weight="bold" />
        </button>
        {meta && (
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <a
              href={serveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/90 font-medium truncate link link-hover"
            >
              {meta.filename}
            </a>
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <span>{formatFileSize(meta.size)}</span>
              <span>·</span>
              <span>{meta.mimeType.split("/")[1]?.toUpperCase()}</span>
              <span>·</span>
              <span>
                {new Date(meta.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setRotation((r) => r - 90)}
          className="btn btn-circle btn-sm btn-ghost text-white opacity-50 active:opacity-100"
          aria-label="Rotate"
        >
          <ArrowCounterClockwise size={18} weight="bold" />
        </button>
        <a
          href={serveUrl}
          download={meta?.filename}
          className="btn btn-circle btn-sm btn-ghost text-white opacity-50 active:opacity-100"
          aria-label="Download"
        >
          <DownloadSimple size={18} weight="bold" />
        </a>
      </div>

      {/* Zoomable image area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TransformWrapper
          key={rotation}
          initialScale={1}
          minScale={0.5}
          maxScale={8}
          centerOnInit
          doubleClick={{ mode: "toggle", step: 2 }}
          wheel={{ step: 0.1 }}
          pinch={{ step: 5 }}
        >
          <TransformComponent
            wrapperStyle={{
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <img
              src={src}
              alt={alt}
              style={{ transform: `rotate(${rotation}deg)` }}
              className="select-none transition-transform duration-200"
              draggable={false}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
}

/**
 * Renders inline thumbnail images for a message with attachments.
 * Tapping a thumbnail opens a full-size viewer with zoom + metadata.
 */
function MessageImages({ attachmentIds }: { attachmentIds: Id<"uploads">[] }) {
  const uploads = useQuery(api.uploads.getMany, { uploadIds: attachmentIds });
  const [viewingId, setViewingId] = useState<string | null>(null);

  if (!uploads) return null;

  const viewingUpload = viewingId
    ? uploads.find((u) => u?._id === viewingId)
    : null;

  return (
    <>
      <div className="flex gap-1.5 flex-wrap mb-2">
        {uploads
          .filter(Boolean)
          .map(
            (upload) =>
              upload && (
                <img
                  key={upload._id}
                  src={proxyStorageUrl(upload.thumbnailUrl ?? upload.url)}
                  alt={upload.filename}
                  className="rounded-lg max-w-[200px] max-h-[150px] object-cover cursor-pointer active:opacity-80 transition-opacity"
                  onClick={() => setViewingId(upload._id)}
                />
              ),
          )}
      </div>
      {viewingUpload && (
        <ImageViewer
          src={proxyStorageUrl(viewingUpload.url) ?? ""}
          alt={viewingUpload.filename}
          uploadId={viewingUpload._id}
          meta={{
            filename: viewingUpload.filename,
            size: viewingUpload.size,
            mimeType: viewingUpload.mimeType,
            createdAt: viewingUpload.createdAt,
          }}
          onClose={() => setViewingId(null)}
        />
      )}
    </>
  );
}

/**
 * Navbar dropdown showing all image attachments in the session.
 * Tapping a thumbnail scrolls to the message that contains it.
 */
function AttachmentsPopover({
  messages,
  scrollContainer,
}: {
  messages: { _id: string; attachments?: string[] }[];
  scrollContainer: React.RefObject<HTMLDivElement | null>;
}) {
  // Collect all attachment IDs mapped to their parent message ID
  const attachmentMap = useMemo(() => {
    const map: { uploadId: string; messageId: string }[] = [];
    for (const m of messages) {
      if (m.attachments && m.attachments.length > 0) {
        for (const a of m.attachments) {
          map.push({ uploadId: a, messageId: m._id });
        }
      }
    }
    return map;
  }, [messages]);

  const allUploadIds = useMemo(
    () => attachmentMap.map((a) => a.uploadId) as Id<"uploads">[],
    [attachmentMap],
  );

  const uploads = useQuery(
    api.uploads.getMany,
    allUploadIds.length > 0 ? { uploadIds: allUploadIds } : "skip",
  );

  if (attachmentMap.length === 0) return null;

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el && scrollContainer.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-flash");
      setTimeout(() => el.classList.remove("highlight-flash"), 1000);
    }
    // Close the dropdown by blurring
    (document.activeElement as HTMLElement)?.blur();
  };

  return (
    <div className="dropdown dropdown-end">
      <button
        tabIndex={0}
        className="btn btn-ghost btn-sm btn-square"
        aria-label="Attachments"
      >
        <Paperclip size={18} weight="bold" />
      </button>
      <div
        tabIndex={0}
        className="dropdown-content z-10 bg-base-200 rounded-box shadow-lg p-2 mt-1 w-56 max-h-64 overflow-y-auto"
      >
        <span className="text-[10px] opacity-40 uppercase tracking-wide px-1">
          Attachments
        </span>
        <div className="flex flex-col gap-1 mt-1">
          {attachmentMap.map((a, i) => {
            const upload = uploads?.[i];
            return (
              <button
                key={`${a.uploadId}-${i}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 active:bg-base-300 transition-colors text-left w-full"
                onClick={() => scrollToMessage(a.messageId)}
              >
                {upload ? (
                  <img
                    src={proxyStorageUrl(upload.thumbnailUrl ?? upload.url)}
                    alt={upload.filename}
                    className="w-8 h-8 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded skeleton shrink-0" />
                )}
                <span className="text-xs truncate opacity-70">
                  {upload?.filename ?? "Loading..."}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const diffDays = Math.floor((startOfToday - startOfDate) / 86400000);

  if (diffDays === 0) return "";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
    <div className="flex flex-col gap-1 w-full">
      <div className="alert alert-error gap-2 text-sm py-2 px-3">
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
        className="flex items-center gap-1 text-[10px] opacity-50 active:opacity-80 transition-opacity pl-1"
      >
        {detailsOpen ? (
          <CaretUp size={10} weight="bold" />
        ) : (
          <CaretDown size={10} weight="bold" />
        )}
        Details
      </button>
      {detailsOpen && (
        <pre className="text-[11px] opacity-60 bg-black/20 rounded p-2 w-full whitespace-pre-wrap break-all select-text max-h-48 overflow-y-auto">
          {rawJson}
        </pre>
      )}
    </div>
  );
}

/**
 * Inline-editable queued message row.
 */
function QueuedMessageThumbs({
  attachmentIds,
}: {
  attachmentIds: Id<"uploads">[];
}) {
  const uploads = useQuery(api.uploads.getMany, { uploadIds: attachmentIds });
  if (!uploads) return null;
  return (
    <div className="flex gap-1 mt-1">
      {uploads
        .filter(Boolean)
        .map(
          (u) =>
            u && (
              <img
                key={u._id}
                src={proxyStorageUrl(u.thumbnailUrl ?? u.url)}
                alt={u.filename}
                className="w-8 h-8 rounded object-cover opacity-70"
              />
            ),
        )}
    </div>
  );
}

function QueuedMessageRow({
  content,
  index,
  attachments,
  onRemove,
  onUpdate,
}: {
  content: string;
  index: number;
  attachments?: Id<"uploads">[];
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
      <div className="flex-1 min-w-0">
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
            className="textarea textarea-bordered textarea-xs w-full text-xs resize-none"
          />
        ) : (
          <span
            className="text-xs truncate block cursor-pointer opacity-70"
            onClick={() => setEditing(true)}
          >
            {content === "(image)" ? "" : content}
          </span>
        )}
        {attachments && attachments.length > 0 && (
          <QueuedMessageThumbs attachmentIds={attachments} />
        )}
      </div>
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
  const router = useRouter();
  const sessionId = params.id as Id<"sessions">;

  const session = useQuery(api.sessions.get, { id: sessionId });
  const hasUnseen = useQuery(api.sessions.hasUnseen, { exclude: sessionId });

  // Redirect to new session if this one was deleted
  useEffect(() => {
    if (session === null || (session && session.deletedAt)) {
      router.replace("/session/new");
    }
  }, [session, router]);
  const messages = useQuery(api.messages.list, { sessionId });
  const queuedMessages = useQuery(api.queuedMessages.list, { sessionId });
  const sendMessage = useMutation(api.messages.send);
  const addToQueue = useMutation(api.queuedMessages.add);
  const removeFromQueue = useMutation(api.queuedMessages.remove);
  const updateQueued = useMutation(api.queuedMessages.update);
  const markSeen = useMutation(api.sessions.markSeen);
  const { upload, pendingUploads, isUploading, removePending, clearPending } =
    useUpload(sessionId);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const witnessedStreamingRef = useRef<Set<string>>(new Set());
  const initialMessageIdsRef = useRef<Set<string> | null>(null);

  const isStreaming = messages?.some((m) => m.streaming) ?? false;

  // Mark session as seen — but only when not streaming, so that
  // lastSeenAt doesn't leapfrog the assistant message's createdAt
  useEffect(() => {
    if (messages && !isStreaming) markSeen({ id: sessionId });
  }, [messages, isStreaming, sessionId, markSeen]);

  // Capture initial message IDs on first load (no animation for these)
  useEffect(() => {
    if (messages && initialMessageIdsRef.current === null) {
      initialMessageIdsRef.current = new Set(messages.map((m) => m._id));
    }
  }, [messages]);

  // Auto-drain orphaned queue: queued messages exist but nothing is processing
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
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, viewportHeight]);

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

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // If actively streaming or loading, just queue the message
    if (isStreaming || isLoading) {
      await addToQueue({
        sessionId,
        content,
        attachments: attachmentIds.length > 0 ? attachmentIds : undefined,
      });
      return;
    }

    // Orphaned queue: messages queued but nothing processing — add and trigger drain
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
    }
  };

  return (
    <SessionDrawer activeSessionId={sessionId}>
      <div
        className="flex flex-col overflow-hidden"
        style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}
      >
        <div
          className={`navbar shrink-0 gap-1 transition-colors duration-300 ${isStreaming ? "bg-primary/15" : "bg-base-200"}`}
        >
          <div className="flex-none">
            <label
              htmlFor="session-drawer"
              className="btn btn-ghost btn-sm btn-square indicator"
            >
              {hasUnseen && (
                <span className="indicator-item badge badge-primary w-2 h-2 p-0 min-w-0 -translate-x-0.5 translate-y-0.5" />
              )}
              <List size={18} weight="bold" />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => session && setShowEditTitle(true)}
              className="text-sm font-medium px-1 text-left btn btn-ghost btn-sm h-auto min-h-0 py-1 max-w-full"
            >
              <span className="truncate">{session?.title ?? "Loading..."}</span>
            </button>
          </div>
          {messages && (
            <div className="flex-none">
              <AttachmentsPopover
                messages={messages}
                scrollContainer={messagesContainerRef}
              />
            </div>
          )}
        </div>

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
          {messages?.length === 0 && (
            <p className="text-center text-base-content/30 mt-12 text-sm">
              Send a message to start the conversation.
            </p>
          )}
          {messages?.map((message, idx) => {
            const isError =
              message.error ||
              (message.role === "assistant" &&
                !message.streaming &&
                message.content.startsWith("Error: "));
            // Only show retry on the very last error message
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
                      {message.role === "user" &&
                        message.attachments &&
                        message.attachments.length > 0 && (
                          <MessageImages
                            attachmentIds={
                              message.attachments as Id<"uploads">[]
                            }
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
                      {/* TODO: ThinkingSteps hidden for now */}
                      <div
                        className={`flex items-center gap-4 mt-1 ${message.role === "user" ? "justify-end" : "justify-between"}`}
                      >
                        <span className={`text-[10px] opacity-30`}>
                          {formatTime(message.createdAt)}
                        </span>
                        {message.streaming && (
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

        {showEditTitle && session && (
          <EditTitleModal
            sessionId={sessionId}
            currentTitle={session.title}
            isCustomTitle={!!session.customTitle}
            onClose={() => setShowEditTitle(false)}
          />
        )}
      </div>
    </SessionDrawer>
  );
}
