import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { activeStreams } from "./active-streams";

const convex = new ConvexHttpClient(
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL!,
);

export const dynamic = "force-dynamic";

/**
 * Extract text content from an SDKAssistantMessage's BetaMessage content blocks.
 */
function extractText(message: SDKMessage): string | null {
  if (message.type !== "assistant") return null;
  const blocks = message.message.content;
  return blocks
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
      const path = (tb.input.file_path || tb.input.path || tb.input.command || "") as string;
      const label = path ? `${tb.name}: ${path}` : tb.name;
      steps.push(`tool:${label}`);
    }
  }
  return steps;
}

export async function POST(req: Request) {
  const { sessionId } = (await req.json()) as {
    sessionId: Id<"sessions">;
  };

  const session = await convex.query(api.sessions.get, { id: sessionId });
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const messages = await convex.query(api.messages.list, { sessionId });
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");
  if (!lastUserMessage) {
    return Response.json({ error: "No user message" }, { status: 400 });
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

  try {
    const queryInstance = query({
      prompt: lastUserMessage.content,
      options: sdkOptions,
    });

    // Register so the cancel endpoint can abort this stream
    activeStreams.set(sessionId, {
      controller,
      generator: queryInstance,
      messageId,
    });

    let fullContent = "";
    let lastFlushTime = 0;
    let sdkSessionId: string | undefined;
    const steps: string[] = [];
    // Track the latest pending flush so we can await it before the final write
    let pendingFlush: Promise<void> = Promise.resolve();

    /**
     * Fire-and-forget flush to Convex. Does NOT block the SDK generator.
     * We track the latest promise so the final update can wait for it.
     */
    function flushStreaming(content: string) {
      if (controller.signal.aborted) return;
      lastFlushTime = Date.now();
      pendingFlush = convex
        .mutation(api.messages.updateContent, {
          messageId,
          content,
          streaming: true,
        })
        .then(() => {})
        .catch((err) => console.error("[stream flush error]", err));
    }

    for await (const message of queryInstance) {
      // Check if cancelled
      if (controller.signal.aborted) break;

      // Capture session ID from the first message that has one
      if ("session_id" in message && message.session_id && !sdkSessionId) {
        sdkSessionId = message.session_id;
        if (!session.claudeSessionId) {
          // This one we await — it's a one-time write
          await convex.mutation(api.sessions.setClaudeSessionId, {
            id: sessionId,
            claudeSessionId: sdkSessionId,
          });
        }
      }

      // Handle streaming deltas — fire-and-forget, throttled
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

      // Handle complete assistant messages — authoritative text for this turn
      if (message.type === "assistant") {
        const text = extractText(message);
        if (text) {
          fullContent = text;
          flushStreaming(fullContent);
        }
        steps.push(...extractSteps(message));
      }

      // Handle result — use result text as fallback
      if (message.type === "result") {
        if (message.subtype === "success" && message.result && !fullContent) {
          fullContent = message.result;
        }
      }
    }

    // If cancelled, the cancel endpoint already finalized the message
    if (controller.signal.aborted) {
      activeStreams.delete(sessionId);
      return Response.json({ ok: true, cancelled: true });
    }

    // Wait for the last streaming flush to land before writing the final state
    await pendingFlush;

    // Final update — mark streaming complete, include steps
    await convex.mutation(api.messages.updateContent, {
      messageId,
      content: fullContent || "(no response)",
      streaming: false,
      steps: steps.length > 0 ? steps : undefined,
    });

    // Auto-title from first user message
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 1) {
      const text = userMessages[0].content;
      const title = text.length > 60 ? text.slice(0, 57) + "..." : text;
      await convex.mutation(api.sessions.updateTitle, {
        id: sessionId,
        title,
      });
    }

    return Response.json({ ok: true });
  } catch (err) {
    // Abort errors from cancellation are expected, not failures
    if (controller.signal.aborted) {
      activeStreams.delete(sessionId);
      return Response.json({ ok: true, cancelled: true });
    }
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[claude sdk error]", errorMessage);
    await convex.mutation(api.messages.updateContent, {
      messageId,
      content: `Error: ${errorMessage}`,
      streaming: false,
    });
    return Response.json({ error: errorMessage }, { status: 500 });
  } finally {
    activeStreams.delete(sessionId);
  }
}
