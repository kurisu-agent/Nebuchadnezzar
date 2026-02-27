import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import type { Id } from "../convex/_generated/dataModel.js";

// --- Convex client ---

const convexUrl = process.env.CONVEX_URL ?? "http://127.0.0.1:3210";
const convex = new ConvexHttpClient(convexUrl);

// --- Session context from env ---

const sessionId = process.env.NEBUCHADNEZZAR_SESSION_ID as
  | Id<"sessions">
  | undefined;

// --- Layout serialization (inlined — the format is stable and simple) ---

function toBase64Url(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildIframeLayout(iframeUrl: string, sid: string, ratio = 35): string {
  // Format: v{ratio}(@{base64url_encoded_url},{sessionId})
  return `v${ratio}(@${toBase64Url(iframeUrl)},${sid})`;
}

// --- Navigation helper ---

async function triggerNavigation(targetUrl: string): Promise<void> {
  await convex.mutation(api.pendingNavigations.create, { targetUrl });
}

// --- MCP Server ---

const server = new McpServer({
  name: "nebuchadnezzar",
  version: "1.0.0",
});

// Tool: open_iframe
server.tool(
  "open_iframe",
  "Open a URL in an iframe pane alongside the current chat session. " +
    "Creates a workspace with the iframe on top and the chat below, " +
    "then automatically navigates the browser to it.",
  {
    url: z.string().describe("The full URL to open (e.g. https://example.com)"),
  },
  async ({ url }) => {
    if (!sessionId) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: No session context available (NEBUCHADNEZZAR_SESSION_ID not set)",
          },
        ],
        isError: true,
      };
    }

    // Normalize URL
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    // Validate
    let hostname: string;
    try {
      const parsed = new URL(normalizedUrl);
      hostname = parsed.hostname.replace(/^www\./, "");
    } catch {
      return {
        content: [
          { type: "text" as const, text: `Error: Invalid URL "${url}"` },
        ],
        isError: true,
      };
    }

    // Build layout and create workspace
    const layout = buildIframeLayout(normalizedUrl, sessionId);
    const workspaceId = await convex.mutation(api.workspaces.create, {
      name: hostname,
      layout,
    });

    // Trigger frontend navigation
    await triggerNavigation(`/workspace/${workspaceId}`);

    return {
      content: [
        {
          type: "text" as const,
          text: `Opened ${normalizedUrl} in an iframe workspace "${hostname}"`,
        },
      ],
    };
  },
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
