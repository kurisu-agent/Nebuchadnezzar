import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";

const MODEL_ALIASES: Record<string, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-6",
};

function resolveModel(input?: string): string {
  if (!input) return MODEL_ALIASES.haiku;
  return MODEL_ALIASES[input.toLowerCase()] ?? input;
}

function extractText(message: SDKMessage): string | null {
  if (message.type !== "assistant") return null;
  const blocks = message.message.content;
  return (blocks as { type: string; text?: string }[])
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function cleanEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return env;
}

export async function oneShot(opts: {
  prompt: string;
  model?: string;
  systemPrompt?: string;
}): Promise<string> {
  const generator = query({
    prompt: opts.prompt,
    options: {
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      model: resolveModel(opts.model),
      maxTurns: 1,
      tools: [],
      systemPrompt:
        opts.systemPrompt ||
        "You are a helpful assistant. Respond concisely and directly.",
      env: cleanEnv(),
    },
  });

  let result = "";

  for await (const message of generator) {
    if (message.type === "assistant") {
      const text = extractText(message);
      if (text) result = text;
    }
    if (message.type === "result") {
      if (message.subtype === "success" && message.result && !result) {
        result = message.result;
      }
    }
  }

  return result || "(no response)";
}
