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

// Tool: list_projects
server.tool(
  "list_projects",
  "List all projects registered in Nebuchadnezzar. Returns name, path, and color for each.",
  {},
  async () => {
    const projects = await convex.query(api.projects.list);
    if (projects.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No projects found." }],
      };
    }
    const lines = projects.map(
      (p: { name: string; path: string; color: string }) =>
        `- ${p.name} (${p.path}) [${p.color}]`,
    );
    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
    };
  },
);

// Tool: get_current_project
server.tool(
  "get_current_project",
  "Get the project associated with the current chat session, if any.",
  {},
  async () => {
    if (!sessionId) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No session context available.",
          },
        ],
        isError: true,
      };
    }
    const session = await convex.query(api.sessions.get, {
      id: sessionId,
    });
    if (!session?.projectId) {
      return {
        content: [
          {
            type: "text" as const,
            text: "This session is not associated with any project.",
          },
        ],
      };
    }
    const project = await convex.query(api.projects.get, {
      id: session.projectId,
    });
    if (!project || project.deletedAt) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Project not found or has been deleted.",
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: `Project: ${project.name}\nPath: ${project.path}\nColor: ${project.color}`,
        },
      ],
    };
  },
);

// Tool: get_port_url
server.tool(
  "get_port_url",
  "Convert a localhost port number to the external URL that the user can access. " +
    "Use this whenever you need to share a URL with the user for a locally running service " +
    "(e.g. dev servers, databases, preview servers). The URL template is configured in " +
    "Nebuchadnezzar settings. IMPORTANT: Always use this tool instead of giving the user " +
    "a localhost URL — localhost is not directly accessible in this environment.",
  {
    port: z
      .number()
      .describe("The port number to convert (e.g. 3001, 5173, 8080)"),
  },
  async ({ port }) => {
    const template = await convex.query(api.settings.get, {
      key: "portUrlTemplate",
    });
    if (!template) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              `No port URL template configured. The service is running on localhost:${port}. ` +
              `Ask the user to configure the port URL template in Dashboard > Ports.`,
          },
        ],
      };
    }
    const url = template.replace("{port}", String(port));
    return {
      content: [
        {
          type: "text" as const,
          text: url,
        },
      ],
    };
  },
);

// Tool: register_port
server.tool(
  "register_port",
  "Register a port with the current session's project. Use this after starting a dev server " +
    "or any service so the port appears linked to the project in the Nebuchadnezzar Ports dashboard.",
  {
    port: z
      .number()
      .describe("The port number to register (e.g. 3001, 5173, 8080)"),
  },
  async ({ port }) => {
    if (!sessionId) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No session context available (NEBUCHADNEZZAR_SESSION_ID not set).",
          },
        ],
        isError: true,
      };
    }
    const session = await convex.query(api.sessions.get, { id: sessionId });
    if (!session?.projectId) {
      return {
        content: [
          {
            type: "text" as const,
            text: "This session is not associated with any project. Cannot register port.",
          },
        ],
        isError: true,
      };
    }
    await convex.mutation(api.projects.addPort, {
      id: session.projectId,
      port,
    });
    const project = await convex.query(api.projects.get, {
      id: session.projectId,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: `Registered port ${port} with project "${project?.name ?? "unknown"}".`,
        },
      ],
    };
  },
);

// Tool: unregister_port
server.tool(
  "unregister_port",
  "Unregister a port from the current session's project. Use this when stopping a dev server " +
    "or service so the port is no longer linked to the project.",
  {
    port: z
      .number()
      .describe("The port number to unregister (e.g. 3001, 5173, 8080)"),
  },
  async ({ port }) => {
    if (!sessionId) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No session context available (NEBUCHADNEZZAR_SESSION_ID not set).",
          },
        ],
        isError: true,
      };
    }
    const session = await convex.query(api.sessions.get, { id: sessionId });
    if (!session?.projectId) {
      return {
        content: [
          {
            type: "text" as const,
            text: "This session is not associated with any project. Cannot unregister port.",
          },
        ],
        isError: true,
      };
    }
    await convex.mutation(api.projects.removePort, {
      id: session.projectId,
      port,
    });
    const project = await convex.query(api.projects.get, {
      id: session.projectId,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: `Unregistered port ${port} from project "${project?.name ?? "unknown"}".`,
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
