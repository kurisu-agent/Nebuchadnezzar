import {
  query,
  type SDKMessage,
  type SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";

type ImageContentBlock = {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    data: string;
  };
};
type TextContentBlock = { type: "text"; text: string };
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { activeStreams, cancelledSessions } from "./active-streams";
import { generateTitle } from "./generate-title";
import { consumeScreenshots } from "@/app/api/screenshot-uploads";
import { after } from "next/server";

const convex = new ConvexHttpClient(
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL!,
);

export const dynamic = "force-dynamic";

/**
 * Extract as much detail as possible from an error for display.
 * Returns a JSON string with message, code, stderr, cause, stack, etc.
 */
function serializeError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);

  const info: Record<string, unknown> = { message: err.message };

  // Capture any extra properties the SDK sets (code, status, stderr, etc.)
  for (const key of Object.getOwnPropertyNames(err)) {
    if (key === "message" || key === "stack") continue;
    info[key] = (err as unknown as Record<string, unknown>)[key];
  }

  // Capture cause chain
  if (err.cause) {
    info.cause =
      err.cause instanceof Error
        ? {
            message: err.cause.message,
            ...Object.fromEntries(
              Object.getOwnPropertyNames(err.cause)
                .filter((k) => k !== "stack")
                .map((k) => [
                  k,
                  (err.cause as unknown as Record<string, unknown>)[k],
                ]),
            ),
          }
        : String(err.cause);
  }

  // Include stack for debugging
  if (err.stack) {
    info.stack = err.stack;
  }

  return JSON.stringify(info, null, 2);
}

/**
 * Extract text content from an SDKAssistantMessage's BetaMessage content blocks.
 */
function extractText(message: SDKMessage): string | null {
  if (message.type !== "assistant") return null;
  const blocks = message.message.content;
  return (blocks as { type: string; text?: string }[])
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * Extract intermediate steps (thinking, tool use) from an assistant message.
 * Each step is prefixed with its type for the UI to parse.
 */
function extractSteps(message: SDKMessage): string[] {
  if (message.type !== "assistant") return [];
  const steps: string[] = [];
  for (const block of message.message.content) {
    if (block.type === "thinking" && "thinking" in block) {
      const tb = block as { type: "thinking"; thinking: string };
      steps.push(`thinking:${tb.thinking}`);
    }
    if (block.type === "tool_use") {
      const tb = block as {
        type: "tool_use";
        name: string;
        input: Record<string, unknown>;
      };
      const path = (tb.input.file_path ||
        tb.input.path ||
        tb.input.command ||
        "") as string;
      const label = path ? `${tb.name}: ${path}` : tb.name;
      steps.push(`tool:${label}`);
    }
  }
  return steps;
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

/** Check if an error is retryable (server errors, overloaded, rate limits). */
function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  const errObj = err as unknown as Record<string, unknown>;
  const status = typeof errObj.status === "number" ? errObj.status : 0;
  return (
    status >= 500 ||
    status === 429 ||
    msg.includes("overloaded") ||
    msg.includes("rate limit") ||
    msg.includes("server error") ||
    msg.includes("internal error") ||
    msg.includes("service unavailable") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up")
  );
}

interface ProcessResult {
  ok: boolean;
  cancelled?: boolean;
  error?: string;
}

/**
 * Core SDK processing: fetches session/messages, creates an assistant message,
 * runs the Agent SDK query with retries, streams content to Convex, and
 * generates a title on success.
 */
async function processChatStream(
  sessionId: Id<"sessions">,
): Promise<ProcessResult> {
  // Check if this session was cancelled before we even started
  if (cancelledSessions.has(sessionId)) {
    cancelledSessions.delete(sessionId);
    return { ok: true, cancelled: true };
  }

  const [session, messages] = await Promise.all([
    convex.query(api.sessions.get, { id: sessionId }),
    convex.query(api.messages.list, { sessionId }),
  ]);
  if (!session) return { ok: false, error: "Session not found" };

  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  if (!lastUserMessage) return { ok: false, error: "No user message" };

  // Check again after DB fetches — cancel may have arrived during the gap
  if (cancelledSessions.has(sessionId)) {
    cancelledSessions.delete(sessionId);
    return { ok: true, cancelled: true };
  }

  const messageId = await convex.mutation(api.messages.createAssistant, {
    sessionId,
  });

  // Build SDK options — YOLO mode, uses OAuth creds from ~/.claude
  const sdkOptions: Parameters<typeof query>[0]["options"] = {
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    systemPrompt: { type: "preset", preset: "claude_code" },
    settingSources: ["project", "user", "local"],
    includePartialMessages: true,
  };

  // Resume existing session or start new one
  if (session.claudeSessionId) {
    sdkOptions.resume = session.claudeSessionId;
  }

  // Strip Claude Code env vars to avoid nested session detection
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  sdkOptions.env = env;

  const controller = new AbortController();

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Wait before retrying (exponential backoff with jitter)
    if (attempt > 0) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      const jitter = Math.random() * backoff * 0.3;
      const delay = backoff + jitter;
      await new Promise((r) => setTimeout(r, delay));
      if (controller.signal.aborted) break;
    }

    try {
      // Build prompt — text-only or multimodal with images
      let prompt: string | AsyncIterable<SDKUserMessage> =
        lastUserMessage.content;

      if (
        lastUserMessage.attachments &&
        lastUserMessage.attachments.length > 0
      ) {
        const uploads = await convex.query(api.uploads.getMany, {
          uploadIds: lastUserMessage.attachments as string[] as any,
        });

        const contentBlocks: (ImageContentBlock | TextContentBlock)[] = [];
        for (const upload of uploads) {
          if (!upload?.url) continue;
          const response = await fetch(upload.url);
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          contentBlocks.push({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: upload.mimeType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: base64,
            },
          });
        }

        if (lastUserMessage.content && lastUserMessage.content !== "(image)") {
          contentBlocks.push({
            type: "text" as const,
            text: lastUserMessage.content,
          });
        }

        const userMessage: SDKUserMessage = {
          type: "user",
          message: { role: "user", content: contentBlocks },
          parent_tool_use_id: null,
          session_id: session.claudeSessionId || "",
        };

        prompt = (async function* () {
          yield userMessage;
        })();
      }

      // Final check before starting the SDK — cancel may have arrived during
      // image downloads or session setup.
      if (cancelledSessions.has(sessionId)) {
        cancelledSessions.delete(sessionId);
        await convex.mutation(api.messages.cancelStreaming, { messageId });
        return { ok: true, cancelled: true };
      }

      const queryInstance = query({
        prompt,
        options: { ...sdkOptions, abortController: controller },
      });

      // Register so the cancel endpoint can abort this stream
      activeStreams.set(sessionId, {
        controller,
        query: queryInstance,
        messageId,
      });

      const processingStartTime = Date.now();
      let fullContent = "";
      let lastFlushTime = 0;
      let sdkSessionId: string | undefined;
      const steps: string[] = [];
      let planning = false;
      let pendingFlush: Promise<void> = Promise.resolve();

      function flushStreaming(content: string) {
        if (controller.signal.aborted) return;
        lastFlushTime = Date.now();
        pendingFlush = convex
          .mutation(api.messages.updateContent, {
            messageId,
            content,
            streaming: true,
            planning: planning || undefined,
          })
          .then(() => {})
          .catch((flushErr) => console.error("[stream flush error]", flushErr));
      }

      for await (const message of queryInstance) {
        if (controller.signal.aborted) break;

        if ("session_id" in message && message.session_id && !sdkSessionId) {
          sdkSessionId = message.session_id as string;
          if (!session.claudeSessionId) {
            await convex.mutation(api.sessions.setClaudeSessionId, {
              id: sessionId,
              claudeSessionId: sdkSessionId,
            });
          }
        }

        if (message.type === "stream_event") {
          const event = message.event;
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullContent += event.delta.text;
            if (Date.now() - lastFlushTime > 150) {
              flushStreaming(fullContent);
            }
          }
        }

        if (message.type === "assistant") {
          const text = extractText(message);
          if (text) {
            fullContent = text;
            flushStreaming(fullContent);
          }
          const newSteps = extractSteps(message);
          steps.push(...newSteps);
          // Detect plan mode transitions from tool use
          for (const block of message.message.content) {
            if (block.type === "tool_use") {
              const tb = block as { type: "tool_use"; name: string };
              if (tb.name === "EnterPlanMode") planning = true;
              if (tb.name === "ExitPlanMode") planning = false;
            }
          }
        }

        if (message.type === "result") {
          if (message.subtype === "success" && message.result && !fullContent) {
            fullContent = message.result;
          }
        }

      }

      if (controller.signal.aborted) {
        // Cancel handler already cleaned up activeStreams
        return { ok: true, cancelled: true };
      }

      await pendingFlush;

      // Check for screenshots uploaded during this turn via in-memory tracker.
      // If Claude didn't include [screenshot:ID] markers, inject them so the
      // UI's inline screenshot renderer can display them.
      let finalContent = fullContent || "(no response)";
      const trackedIds = consumeScreenshots(processingStartTime);
      for (const id of trackedIds) {
        if (!finalContent.includes(`[screenshot:${id}]`)) {
          finalContent += `\n\n[screenshot:${id}]`;
        }
      }

      await convex.mutation(api.messages.updateContent, {
        messageId,
        content: finalContent,
        streaming: false,
        steps: steps.length > 0 ? steps : undefined,
      });

      activeStreams.delete(sessionId);

      // Generate a smart title in the background (fire-and-forget)
      generateTitle(sessionId, messages, fullContent).catch((err) =>
        console.error("[title gen error]", err),
      );

      return { ok: true };
    } catch (err) {
      if (controller.signal.aborted) {
        // Cancel handler already cleaned up activeStreams
        return { ok: true, cancelled: true };
      }

      lastError = err;

      // Only retry on transient/server errors
      if (isRetryable(err) && attempt < MAX_RETRIES) {
        console.warn(
          `[claude sdk] retryable error (attempt ${attempt + 1}/${MAX_RETRIES}):`,
          err instanceof Error ? err.message : String(err),
        );
        continue;
      }

      // Non-retryable or exhausted retries — write error to message
      break;
    }
  }

  // All retries exhausted or non-retryable error
  const errorDetail = serializeError(lastError);
  console.error("[claude sdk error]", errorDetail);
  await convex.mutation(api.messages.updateContent, {
    messageId,
    content: errorDetail,
    streaming: false,
    error: true,
  });
  activeStreams.delete(sessionId);
  return { ok: false, error: errorDetail };
}

/**
 * Drain the queued messages for a session. Shifts messages one at a time,
 * sends each as a user message, and processes through the SDK.
 * Stops on cancel, error, or empty queue.
 */
async function drainQueue(sessionId: Id<"sessions">) {
  while (true) {
    try {
      // Bail if cancelled or another stream started
      if (cancelledSessions.has(sessionId)) {
        cancelledSessions.delete(sessionId);
        return;
      }
      if (activeStreams.has(sessionId)) return;

      const next = await convex.mutation(api.queuedMessages.shift, {
        sessionId,
      });
      if (!next) return;

      await convex.mutation(api.messages.send, {
        sessionId,
        content: next.content,
        attachments:
          next.attachments && next.attachments.length > 0
            ? (next.attachments as Id<"uploads">[])
            : undefined,
      });

      const result = await processChatStream(sessionId);
      if (result.cancelled || !result.ok) return;
    } catch (err) {
      console.error("[drainQueue] unexpected error:", err);
      return;
    }
  }
}

export async function POST(req: Request) {
  const { sessionId } = (await req.json()) as {
    sessionId: Id<"sessions">;
  };

  // Clear any previous cancel signal — user is explicitly sending a new message.
  cancelledSessions.delete(sessionId);

  // Reject if already processing this session
  if (activeStreams.has(sessionId)) {
    return Response.json({ ok: true, alreadyProcessing: true });
  }

  // Fire early title generation concurrently — don't wait for SDK setup
  after(async () => {
    try {
      const [session, messages] = await Promise.all([
        convex.query(api.sessions.get, { id: sessionId }),
        convex.query(api.messages.list, { sessionId }),
      ]);
      const userMessages = messages.filter((m) => m.role === "user");
      if (session && userMessages.length === 1 && !session.customTitle) {
        await generateTitle(sessionId, messages, "");
      }
    } catch (err) {
      console.error("[early title gen error]", err);
    }
  });

  // Process in the background — the client gets real-time updates via Convex
  after(async () => {
    try {
      await processChatStream(sessionId);
    } catch (err) {
      console.error("[chat background error]", err);
    }
    // Always drain queued messages, even if the stream errored
    try {
      await drainQueue(sessionId);
    } catch (err) {
      console.error("[drainQueue error]", err);
    }
  });

  return Response.json({ ok: true });
}
