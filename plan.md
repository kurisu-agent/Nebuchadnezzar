# Nebuchadnezzar: Next-Generation Claude Code UI

## Executive Summary

Nebuchadnezzar is a ground-up reimplementation of claudecodeui focused exclusively on Claude Code integration, built with Next.js 15 App Router, unified backend/frontend architecture, and real-time state synchronization via Convex. This project addresses the fundamental state management issues in claudecodeui while embracing modern development practices with first-class devcontainer support.

## Core Problems Being Solved

### Current claudecodeui Issues
1. **State Synchronization Chaos**: Multiple WebSocket connections, manual state tracking, race conditions between UI updates and Claude responses
2. **Architecture Complexity**: Separate Express backend + React frontend requiring complex proxy setups
3. **Session Management**: In-memory session tracking lost on server restart
4. **Stdout/Stderr Piping**: Fragile subprocess management with buffering issues
5. **Multi-Agent Coordination**: No proper orchestration for parallel agent execution
6. **Development Experience**: Complex local setup, no standardized dev environment

### Our Solutions
1. **Convex for Everything**: Single source of truth, automatic real-time sync, no manual WebSocket management
2. **Next.js Unified Stack**: API routes + UI in single deployment, simplified DevOps
3. **Persistent Sessions**: All state in Convex, survives restarts, queryable history
4. **Direct SDK Integration**: No subprocess overhead, native streaming support
5. **Agent Orchestration Layer**: Purpose-built parallel execution framework
6. **Devcontainer-First**: Reproducible development environment from day one

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 15 App Router                     │
├────────────────────┬────────────────────┬──────────────────┤
│   Server Components │   Client Components│   API Routes     │
│   (Initial Render)  │   (Interactive UI)  │  (Agent Bridge)  │
└────────────────────┴────────────────────┴──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Convex                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Sessions │ │ Messages │ │  Agents  │ │ Workflows│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  Real-time Sync • Reactive Queries • Streaming Updates     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Host CLI Orchestrator (on host)               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Claude SDK   │ │Container Mgmt│ │ File Watcher │       │
│  │ (with creds) │ │ & Worktrees  │ │ (JSONL sync) │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ Host Execution   │  │ Container Agents │
        │ (Direct SDK)     │  │ (via proxy.sh)   │
        └──────────────────┘  └──────────────────┘
```

## Technology Stack

### Core Framework
- **Next.js 15**: App Router with React 19 Server Components
- **TypeScript 5.6+**: Full type safety across stack
- **Convex**: Real-time database and sync platform (local deployment)
- **Tailwind CSS v4**: Modern utility-first styling with shadcn/ui v2 components

### Claude Integration
- **@anthropic-ai/claude-agent-sdk**: Direct SDK integration
- **Convex Actions**: For streaming from Claude to frontend
- **YOLO Mode Only**: --dangerously-skip-permissions is the only supported option (no approval flows)

### Authentication & Security
- **BetterAuth**: Modern, type-safe authentication for Next.js (replaces NextAuth)
- **zod**: Runtime validation and type inference
- **argon2**: Password hashing (if needed for local auth)

### Development Environment
- **Devcontainer**: Node.js 22 Alpine-based container
- **Docker Compose**: Multi-service orchestration (Next.js + Convex local)
- **Biome**: Fast, modern alternative to ESLint + Prettier (single tool, Rust-based)
- **VS Code Extensions**: Convex, Tailwind IntelliSense, TypeScript, Biome

### Testing & Quality
- **Vitest**: Unit and integration testing (still the best choice)
- **Playwright**: E2E testing with devcontainer support
- **Biome**: Linting, formatting, and import sorting in one tool
- **lefthook**: Modern, fast Git hooks (better than Husky, parallel execution)

### Container & Orchestration
- **Dockerode**: Docker API for Node.js (container management)
- **Devcontainer CLI**: Official Microsoft tool for devcontainer operations
- **chokidar**: File watching (mature and reliable)
- **bullmq**: Job queue for background tasks (if needed)

## Detailed Component Architecture

### 1. Next.js Application Structure

```
/app
├── (auth)
│   ├── login/
│   └── setup/
├── (main)
│   ├── layout.tsx          # Main app shell with sidebar
│   ├── page.tsx            # Dashboard/project list
│   ├── session/[id]/       # Individual session view
│   └── settings/           # User preferences
├── api/
│   ├── claude/
│   │   ├── query/          # Start Claude query
│   │   └── abort/          # Abort active session
│   └── orchestrator/       # Host CLI communication
└── _components/
    ├── chat/               # Chat interface components
    ├── editor/             # Code editor components
    └── shared/             # Reusable UI components
```

### 2. Convex Schema Design

```typescript
// schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    githubUsername: v.optional(v.string()),
    settings: v.object({
      theme: v.union(v.literal("light"), v.literal("dark")),
      claudeModel: v.string(),
      // YOLO mode only - no approval settings needed
    }),
  }).index("by_email", ["email"]),

  projects: defineTable({
    name: v.string(),
    path: v.string(),
    lastAccessed: v.number(),
    isActive: v.boolean(),
    metadata: v.object({
      gitBranch: v.optional(v.string()),
      language: v.optional(v.string()),
      framework: v.optional(v.string()),
    }),
  }).index("by_name", ["name"]),

  sessions: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("aborted"),
      v.literal("error")
    ),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    title: v.optional(v.string()),
    model: v.string(),
    tokenUsage: v.object({
      input: v.number(),
      output: v.number(),
      total: v.number(),
    }),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    timestamp: v.number(),
    // Streaming and sync fields
    streamStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("synced"),
      v.literal("complete")
    )),
    streamedLength: v.optional(v.number()),
    fileLength: v.optional(v.number()),
    lastStreamUpdate: v.optional(v.number()),
    lastFileSync: v.optional(v.number()),
    checksum: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        toolCalls: v.optional(v.array(v.any())),
        toolResults: v.optional(v.array(v.any())),
        thinking: v.optional(v.string()),
        tokenCount: v.optional(v.number()),
      })
    ),
  })
    .index("by_session", ["sessionId"])
    .index("by_timestamp", ["timestamp"]),

  agents: defineTable({
    sessionId: v.id("sessions"),
    parentAgentId: v.optional(v.id("agents")),
    type: v.string(), // "main", "explore", "plan", etc.
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    input: v.string(),
    output: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    // Container execution fields
    executionMode: v.union(v.literal("host"), v.literal("container")),
    containerId: v.optional(v.string()),
    worktreeBranch: v.optional(v.string()),
    portRangeStart: v.optional(v.number()),
    portRangeEnd: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_parent", ["parentAgentId"])
    .index("by_status", ["status"]),

  workflows: defineTable({
    name: v.string(),
    description: v.string(),
    steps: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        config: v.any(),
        dependencies: v.array(v.string()),
      })
    ),
    isPublic: v.boolean(),
    createdBy: v.id("users"),
  }).index("by_name", ["name"]),

  // No toolApprovals table - YOLO mode only!
});
```

### 3. State Management Flow

```typescript
// Example: Starting a Claude Query

// 1. Client Component initiates query
const startQuery = useMutation(api.claude.startQuery);
await startQuery({
  sessionId,
  prompt,
  options: { model, temperature }
});

// 2. Convex mutation creates records
export const startQuery = mutation({
  handler: async (ctx, args) => {
    // Create message record
    const messageId = await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.prompt,
      timestamp: Date.now(),
    });

    // Create agent record
    const agentId = await ctx.db.insert("agents", {
      sessionId: args.sessionId,
      type: "main",
      status: "queued",
      input: args.prompt,
    });

    // Schedule action to call Claude
    await ctx.scheduler.runAfter(0, api.claude.processQuery, {
      agentId,
      messageId,
      options: args.options,
    });

    return { messageId, agentId };
  },
});

// 3. Action calls Claude SDK via host CLI
export const processQuery = action({
  handler: async (ctx, args) => {
    // Call host CLI orchestrator
    const response = await fetch("http://host.docker.internal:3002/claude/query", {
      method: "POST",
      body: JSON.stringify(args),
    });

    // Stream response back to Convex
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Update message in real-time
      await ctx.runMutation(api.claude.appendToMessage, {
        messageId: args.messageId,
        chunk: new TextDecoder().decode(value),
      });
    }
  },
});

// 4. Client automatically receives updates via useQuery
const messages = useQuery(api.messages.bySession, { sessionId });
// Messages update in real-time as chunks arrive
```

### 4. Container Execution Pattern

The Host CLI Orchestrator manages Claude instances running inside project-specific containers:

```typescript
// Container-first Claude execution
class ContainerClaudeExecutor {
  async executeClaudeQuery(projectPath: string, prompt: string, agentId: string) {
    // Always prefer container execution for isolation
    if (await this.hasDevcontainer(projectPath)) {
      // 1. Ensure container is running with proper mounts
      const containerId = await this.ensureContainer(projectPath, agentId);

      // 2. Pass credentials securely via environment
      const env = {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        CLAUDE_PROJECT_PATH: '/workspace',
        CLAUDE_OUTPUT_PATH: '/tmp/streams',
        AGENT_ID: agentId
      };

      // 3. Execute Claude inside the container
      const claudeCommand = `claude-code ${prompt}`;
      const result = await this.docker.exec(containerId, claudeCommand, {
        env,
        workDir: '/workspace'
      });

      return result;
    } else {
      // Fallback to host execution if no devcontainer
      return await this.executeOnHost(projectPath, prompt);
    }
  }

  async ensureContainer(projectPath: string, agentId: string) {
    const containerName = `neb-${path.basename(projectPath)}-${agentId}`;

    // Check if container exists
    const existing = await this.docker.getContainer(containerName);
    if (existing) return existing.id;

    // Start new container with all necessary mounts
    const mounts = [
      `${projectPath}:/workspace`,                    // Project files
      `~/.claude:/home/node/.claude:ro`,             // Skills (read-only)
      `/tmp/claude-streams/${agentId}:/tmp/streams`  // Output directory
    ];

    return await this.devcontainer.up({
      workspaceFolder: projectPath,
      containerName,
      additionalMounts: mounts,
      updateRemoteUserUID: true
    });
  }
}
```

Key benefits:
- **True Isolation** - Each project gets its own environment with dependencies
- **No Port Conflicts** - Each container has isolated network namespace
- **Native Dev Experience** - Claude sees the same environment as developers
- **Clean Host** - No Node version conflicts or package pollution on host
- **Parallel Execution** - Multiple projects/agents without interference

### 5. Agent SDK Streaming Architecture

Using `@anthropic-ai/claude-agent-sdk` for structured message streaming into Convex:

```typescript
// Reference: claudecodeui feat/devcontainer-integration server/claude-sdk.js
import { query } from "@anthropic-ai/claude-agent-sdk";

// Next.js API route — starts a Claude query via Agent SDK
export async function POST(req: Request) {
  const { sessionId, prompt } = await req.json();

  // Create placeholder assistant message in Convex
  const messageId = await convex.mutation(api.messages.createAssistant, { sessionId });

  // SDK options — YOLO mode, no approval UI
  const sdkOptions = {
    permissionMode: "bypassPermissions" as const,
    systemPrompt: { type: "preset" as const, preset: "claude_code" },
    settingSources: ["project", "user", "local"] as const,
  };

  // Resume existing session or start new one
  const session = await convex.query(api.sessions.get, { id: sessionId });
  if (session.claudeSessionId) {
    sdkOptions.resume = session.claudeSessionId;
  }

  // SDK returns async generator of structured messages
  const queryInstance = query({ prompt, options: sdkOptions });
  let fullContent = "";
  let sdkSessionId: string | undefined;

  for await (const message of queryInstance) {
    // Extract session ID from first message
    if (message.session_id && !sdkSessionId) {
      sdkSessionId = message.session_id;
      await convex.mutation(api.sessions.setClaudeSessionId, {
        id: sessionId,
        claudeSessionId: sdkSessionId,
      });
    }

    // Accumulate assistant text from structured messages
    if (message.type === "assistant" && message.content) {
      fullContent += message.content;
      await convex.mutation(api.messages.updateContent, {
        messageId,
        content: fullContent,
        streaming: true,
      });
    }
  }

  // Final update — mark streaming complete
  await convex.mutation(api.messages.updateContent, {
    messageId,
    content: fullContent,
    streaming: false,
  });
}
```

Key advantages over CLI spawning:
- **Structured messages** — no stdout parsing, each message is a typed object
- **Session management** — `resume` option and `instance.interrupt()` for abort
- **Token tracking** — `result.modelUsage` gives input/output/total tokens
- **Devcontainer support** — `pathToClaudeCodeExecutable` redirects through proxy script
- **Error handling** — JavaScript try/catch with typed errors, not exit codes

### 6. Perfect Isolation: Git Worktrees + Containers

Each agent gets completely isolated environment - not just code, but databases, caches, and test data:

```typescript
// True isolation for parallel agents
class IsolatedAgentOrchestrator {
  async spawnAgentContainer(agentId: string, projectPath: string, task: AgentTask) {
    // 1. Create git worktree - separate file system
    const worktreePath = `/worktrees/${projectPath}-agent-${agentId}`;
    await exec(`git worktree add ${worktreePath} -b agent-${agentId}`);

    // 2. Each agent gets its own data volumes
    const volumes = {
      postgres: `neb-postgres-${agentId}`,     // Isolated Postgres
      redis: `neb-redis-${agentId}`,           // Isolated Redis
      elasticsearch: `neb-elastic-${agentId}`,  // Isolated Elasticsearch
      uploads: `neb-uploads-${agentId}`,        // Isolated file uploads
      node_modules: `neb-node-${agentId}`,      // Isolated dependencies!
    };

    // 3. Spin up agent-specific services
    const composeOverride = {
      version: '3.8',
      services: {
        app: {
          volumes: [
            `${worktreePath}:/workspace`,
            `${volumes.node_modules}:/workspace/node_modules`,
            `${volumes.uploads}:/workspace/uploads`
          ],
          environment: {
            DATABASE_URL: `postgresql://user:pass@postgres-${agentId}/db`,
            REDIS_URL: `redis://redis-${agentId}:6379`,
            TEST_DATABASE: `test_${agentId}`,
            NODE_ENV: 'development',
            AGENT_ID: agentId
          }
        },
        postgres: {
          container_name: `postgres-${agentId}`,
          volumes: [`${volumes.postgres}:/var/lib/postgresql/data`],
        },
        redis: {
          container_name: `redis-${agentId}`,
          volumes: [`${volumes.redis}:/data`],
        }
      }
    };

    // 4. Start isolated environment
    await this.docker.composeUp({
      projectName: `neb-agent-${agentId}`,
      workdir: worktreePath,
      override: composeOverride
    });

    return { agentId, worktreePath, volumes };
  }

  async runParallelTests(agents: Agent[]) {
    // All agents can run simultaneously without conflicts!
    return Promise.all(agents.map(agent =>
      this.runInContainer(agent.id, 'npm test')
    ));
  }
}
```

### Real-World Scenarios This Solves

#### Scenario 1: Database Migrations
```typescript
// Without isolation - DISASTER:
Agent1: "Running migration: add user.email column"
Agent2: "Running tests... FAIL: unexpected column user.email" ❌

// With isolation - PERFECT:
Agent1: "Running migration in postgres-agent1"  ✅
Agent2: "Running tests in postgres-agent2"       ✅
// No conflicts!
```

#### Scenario 2: Parallel Testing
```typescript
// Three agents testing different features simultaneously
Agent1: Testing auth flow → Creates 100 test users in its DB
Agent2: Testing payment → Processes test transactions in its DB
Agent3: Testing search → Rebuilds search index in its Elasticsearch

// All running in parallel without any interference!
```

#### Scenario 3: Dependency Experiments
```typescript
// Agent exploring upgrade paths
Agent1: npm install react@18 → Test suite → ✅
Agent2: npm install react@19-beta → Test suite → ❌
Agent3: Current versions → Performance benchmark

// Main workspace remains untouched
// node_modules isolation means no conflicts
```

#### Scenario 4: Data Generation
```typescript
// Agents generating test data
Agent1: Seeding 10,000 products for load testing
Agent2: Generating API fixtures for documentation
Agent3: Creating edge case data for bug reproduction

// Each has its own database - no data pollution
```

### The Killer Feature Stack

```yaml
Per-Agent Isolation:
  ✅ Git Worktree:      Separate code branches
  ✅ Database:          Separate Postgres/MySQL/Mongo instances
  ✅ Cache:             Separate Redis/Memcached instances
  ✅ Search:            Separate Elasticsearch indices
  ✅ File Storage:      Separate upload directories
  ✅ Dependencies:      Separate node_modules/venv/vendor
  ✅ Ports:             Separate port ranges (3000-3099 per agent)
  ✅ Environment:       Separate env vars and secrets
  ✅ Test Data:         Separate test fixtures and seeds
  ✅ Logs:              Separate log streams
```

Benefits:
- **True Parallel Execution** - 10 agents = 10 completely isolated environments
- **No Test Pollution** - Each agent's tests run in virgin environment
- **Safe Experimentation** - Agents can try risky changes without affecting others
- **Database Freedom** - Migrations, seeds, and destructive tests all safe
- **Performance Testing** - Load test one agent while others work normally

### 7. Host CLI Orchestrator

```typescript
// host-orchestrator/src/index.ts
import { ClaudeAgentSdk } from "@anthropic-ai/claude-agent-sdk";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import chokidar from "chokidar";

class Orchestrator {
  private sdk: ClaudeAgentSdk;
  private app: express.Application;
  private wss: WebSocketServer;
  private activeSessions: Map<string, AbortController>;
  private fileWatcher: chokidar.FSWatcher;

  constructor() {
    this.sdk = new ClaudeAgentSdk();
    this.app = express();
    this.activeSessions = new Map();
    this.setupRoutes();
    this.setupFileWatcher();
  }

  private setupRoutes() {
    // Claude query endpoint
    this.app.post("/claude/query", async (req, res) => {
      const { agentId, prompt, options } = req.body;
      const abortController = new AbortController();
      this.activeSessions.set(agentId, abortController);

      try {
        const stream = await this.sdk.query(prompt, {
          ...options,
          signal: abortController.signal,
          // YOLO mode - always skip permissions
          dangerouslySkipPermissions: true,
        });

        // Stream response back
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        for await (const chunk of stream) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.end();
      } finally {
        this.activeSessions.delete(agentId);
      }
    });

    // Abort endpoint
    this.app.post("/claude/abort", (req, res) => {
      const { agentId } = req.body;
      const controller = this.activeSessions.get(agentId);
      if (controller) {
        controller.abort();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Session not found" });
      }
    });

    // File system events
    this.app.get("/fs/watch", (req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });

      const listener = (event: string, path: string) => {
        res.write(`data: ${JSON.stringify({ event, path })}\n\n`);
      };

      this.fileWatcher.on("all", listener);
      req.on("close", () => {
        this.fileWatcher.off("all", listener);
      });
    });
  }

  private setupFileWatcher() {
    this.fileWatcher = chokidar.watch(process.cwd(), {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
    });
  }

  // No tool approval needed in YOLO mode!

  start(port: number = 3002) {
    const server = createServer(this.app);
    this.wss = new WebSocketServer({ server, path: "/ws" });

    server.listen(port, () => {
      console.log(`Orchestrator running on port ${port}`);
    });
  }
}

// Start orchestrator
new Orchestrator().start();
```

## Implementation Strategy

*We're cooking with agents here - no artificial timelines, just progressive enhancement and rapid iteration.*

### Orchestration Philosophy
Start simple, layer complexity as needed. Each phase builds on proven foundations from the previous one.

### Infrastructure Approach
- **Single machine optimization first** - Get a beefy server and push it to its limits
- **Shared mounts for containers** - All containers access the same project filesystem
- **Local Convex** - Designed for thousands of users, will handle single-user loads easily
- **Future-ready architecture** - Remote execution can be added later without major rewrites

### Phase 1: Foundation
**Goal: Prove the core architecture works**

1. **Minimal Viable Stack**
   - Next.js 15 with basic UI shell
   - Convex for state (local deployment)
   - Host CLI with simple Claude SDK integration
   - Single container execution (no worktrees yet)

2. **Core Communication Loop**
   - User input → Convex → Host CLI → Claude SDK → Convex → UI
   - Validate streaming works end-to-end
   - Test file operations through shared mounts

3. **Basic Session Management**
   - Create/resume sessions
   - Message persistence in Convex
   - Simple chat interface

### Phase 2: Intelligence Layer
**Goal: Make it actually useful**

1. **Full Claude Integration**
   - All Claude tools working
   - Tool approval flow
   - Proper error handling
   - Session abort capability

2. **Container Execution**
   - Devcontainer support for projects
   - Proxy script routing
   - Shared mount configuration
   - Port forwarding for web servers

3. **File System Intelligence**
   - File watcher integration
   - Real-time sync to Convex
   - Project structure awareness

### Phase 3: Multi-Agent Orchestration
**Goal: Parallel execution and isolation**

1. **Git Worktree Isolation**
   - Dynamic worktree creation
   - Branch management per agent
   - Automatic merging strategies

2. **Container Orchestration**
   - Parallel container spawning
   - Dynamic port allocation
   - Resource pooling

3. **Agent Coordination**
   - Parent-child relationships
   - Status tracking in Convex
   - Result aggregation

### Phase 4: Production Hardening
**Goal: Make it bulletproof**

1. **Resource Management**
   - Container lifecycle automation
   - Worktree cleanup
   - Port allocation recycling
   - Memory/CPU limits

2. **Reliability Features**
   - Health checks
   - Automatic recovery
   - State reconciliation
   - Graceful degradation

3. **Performance Optimization**
   - Message batching
   - Virtual scrolling
   - Lazy loading
   - Query optimization

### Phase 5: Enhanced Intelligence
**Goal: Advanced workflows and automation**

1. **Mermaid-Based Orchestration**
   - Define workflows as diagrams
   - Visual execution flow
   - Auto-parallelization
   - Live progress tracking

2. **Collaboration Features**
   - Multi-session support
   - Workspace sharing
   - Real-time presence

3. **Analytics & Insights**
   - Token usage tracking
   - Performance metrics
   - Cost optimization
   - Pattern detection

## Key Architectural Decisions

### 1. Why Convex Over Custom WebSocket?
- **Automatic Sync**: No manual subscription management
- **Consistency**: ACID transactions with serializable isolation
- **Scalability**: Built-in horizontal scaling
- **Developer Experience**: React hooks for real-time data
- **Reliability**: Automatic reconnection and state reconciliation

### 2. Why Next.js App Router?
- **Unified Stack**: Backend and frontend in single codebase
- **Server Components**: Reduced client bundle size
- **Modern Patterns**: Built for streaming and suspense
- **Type Safety**: Full-stack TypeScript with inference
- **Deployment**: Simplified deployment to Vercel/self-host

### 3. Why Host CLI Orchestrator?
- **Credential Management**: Securely passes credentials to container Claude instances
- **Skill Integration**: Mounts host `~/.claude/` directory read-only into containers
- **Container Orchestration**: Manages devcontainers and git worktrees for agents
- **Dependency Isolation**: Each project's Claude runs in its devcontainer environment
- **Port Management**: No host port conflicts - each container gets isolated port ranges
- **Streaming Bridge**: Handles real-time streaming from containerized Claude to Convex
- **File Watcher**: Syncs JSONL files to Convex for reliability

### 4. Why Run Claude in Containers?
- **Dependency Isolation**: Each project can have different Node versions, tools, etc.
- **Port Conflict Prevention**: Dev servers (Vite, Next.js, etc.) run in isolated namespaces
- **Clean Environment**: No pollution of host system with project dependencies
- **Reproducibility**: Same environment for Claude as developers use
- **Security Boundary**: Project code can't affect host system
- **First-Class Devcontainer Support**: Claude sees the exact same environment as VS Code
- **Parallel Execution**: Multiple Claudes can run without conflicts

### 4. Why Devcontainer-First?
- **Reproducibility**: Identical environment for all developers
- **Onboarding**: Zero-setup development experience
- **Dependencies**: All tools pre-installed and configured
- **Consistency**: Same environment as CI/CD
- **Portability**: Works on any OS with Docker

## State Management Deep Dive

### Current claudecodeui Problems
1. **Race Conditions**: UI updates competing with WebSocket messages
2. **State Fragmentation**: State split across contexts, localStorage, and server
3. **Session Loss**: In-memory sessions lost on server restart
4. **Manual Sync**: Complex logic to keep UI and server synchronized
5. **Subscription Management**: Manual WebSocket subscription handling

### Convex Solution
1. **Single Source of Truth**: All state lives in Convex database
2. **Automatic Subscriptions**: useQuery hooks auto-subscribe to changes
3. **Optimistic Updates**: UI updates immediately, reconciles with server
4. **Transactional Consistency**: All related updates happen atomically
5. **Built-in Persistence**: Everything survives restarts automatically

### Example: Message Streaming with Convex

```typescript
// Traditional WebSocket approach (claudecodeui)
useEffect(() => {
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'claude-delta') {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        lastMessage.content += data.content;
        return newMessages;
      });
    }
  };
  return () => ws.close();
}, [sessionId]);

// Convex approach (Nebuchadnezzar)
const messages = useQuery(api.messages.bySession, { sessionId });
// That's it! Messages automatically update when backend writes to Convex
```

## Performance Considerations

### Client Bundle Size
- Server Components for static UI (sidebar, headers)
- Dynamic imports for heavy components (editor, terminal)
- Code splitting by route
- Tree shaking with ES modules

### Real-time Performance
- Convex delta sync (only changed data)
- Virtual scrolling for long message lists
- Debounced file watcher events
- Request batching for tool approvals

### Database Performance
- Indexed queries for common access patterns
- Pagination for message history
- Archival strategy for old sessions
- Query result caching in Convex

## Security Architecture

### Authentication
- BetterAuth for authentication (modern, type-safe, Next.js optimized)
- JWT tokens for API access
- Session encryption
- CSRF protection

### Authorization
- Row-level security in Convex
- API key scoping
- Tool approval requirements
- File system access controls

### Data Protection
- TLS for all communications
- Encrypted storage at rest
- Sensitive data redaction in logs
- Regular security updates

## Deployment Options

### 1. Local Development (Devcontainer)
```yaml
# docker-compose.yml
services:
  app:
    build: .devcontainer
    ports:
      - "3000:3000"
    volumes:
      - .:/workspace
      - /var/run/docker.sock:/var/run/docker.sock

  convex:
    image: convex/local-backend
    ports:
      - "3210:3210"

  orchestrator:
    build: ./host-orchestrator
    ports:
      - "3002:3002"
    volumes:
      - ~/.claude:/root/.claude
      - ~/Code:/workspace
```

### 2. Production (Docker Swarm/K8s)
- Next.js container with multi-stage build
- Convex cloud or self-hosted
- Orchestrator as sidecar container
- Persistent volume for sessions
- Load balancer with WebSocket support

### 3. Managed Platform (Vercel + Convex Cloud)
- Next.js on Vercel
- Convex cloud for database
- Orchestrator on Fly.io/Railway
- GitHub Actions for CI/CD

## Success Metrics

### Performance Targets
- Initial page load: <2s
- Message latency: <100ms
- Tool approval response: <1s
- Session restore: <500ms
- Parallel agent spawn: <200ms

### Reliability Targets
- 99.9% uptime for core features
- Zero data loss for sessions
- Automatic recovery from disconnections
- Graceful degradation for network issues

### User Experience Targets
- Zero-config setup with devcontainer
- One-click session resume
- Real-time collaboration support
- Responsive design for all devices

## Risk Mitigation

### Technical Risks
1. **Convex Scalability**: Monitor usage, implement caching if needed
2. **Next.js WebSocket**: Use orchestrator pattern to bypass limitations
3. **Claude SDK Changes**: Abstract SDK interface for flexibility
4. **Docker Overhead**: Optimize base images, use BuildKit cache

### Operational Risks
1. **Data Migration**: Build migration tools from claudecodeui
2. **User Adoption**: Maintain feature parity initially
3. **Development Velocity**: Use incremental migration approach
4. **Testing Coverage**: Automated testing from day one

## Future Enhancements

### Phase 5+ Roadmap
1. **Collaborative Features**
   - Multi-user sessions
   - Real-time cursor tracking
   - Shared workspaces
   - Comments and annotations

2. **Advanced Workflows**
   - Visual workflow builder
   - Custom tool development
   - Workflow marketplace
   - GitOps integration

3. **Intelligence Layer**
   - Agent performance analytics
   - Cost optimization recommendations
   - Automatic workflow generation
   - Pattern recognition

4. **Enterprise Features**
   - SAML/OIDC authentication
   - Audit logging
   - Role-based access control
   - Private model deployment

## Mermaid-Driven Orchestration: Future Vision

*Note: This is a future feature to explore after core functionality is solid. Focus on Phase 1-4 first.*

### Visual Workflows as Code

Users will be able to define complex multi-agent workflows using Mermaid diagrams that become executable orchestration:

```typescript
// User writes this Mermaid diagram
const workflowMermaid = `
graph TD
    Start([Upgrade React to v19])

    Start --> Agent1[Agent 1: Update package.json]
    Start --> Agent2[Agent 2: Research breaking changes]

    Agent1 --> Agent3[Agent 3: Fix TypeScript errors]
    Agent2 --> Agent3

    Agent3 --> Parallel{Run in parallel}

    Parallel --> Agent4[Agent 4: Run unit tests]
    Parallel --> Agent5[Agent 5: Run integration tests]
    Parallel --> Agent6[Agent 6: Test performance]

    Agent4 --> Converge{All tests pass?}
    Agent5 --> Converge
    Agent6 --> Converge

    Converge -->|Yes| Agent7[Agent 7: Update documentation]
    Converge -->|No| Agent8[Agent 8: Analyze failures]

    Agent7 --> Success([✅ Upgrade Complete])
    Agent8 --> Agent9[Agent 9: Attempt fixes]
    Agent9 --> Parallel
`;

// Nebuchadnezzar automatically executes this!
```

### The Magic: Mermaid Parser to Execution Engine

```typescript
class MermaidOrchestrator {
  async executeWorkflow(mermaid: string, context: WorkflowContext) {
    // 1. Parse Mermaid to execution graph
    const graph = this.parseMermaid(mermaid);

    // 2. Identify parallelizable paths
    const executionPlan = this.analyzeParallelism(graph);

    // 3. Spawn containers for each agent
    const agents = await this.spawnAgents(executionPlan);

    // 4. Execute with live updates to Convex
    return this.executeWithTracking(agents, executionPlan);
  }

  private analyzeParallelism(graph: WorkflowGraph) {
    // Topological sort to find dependencies
    const stages = this.topologicalSort(graph);

    return stages.map(stage => ({
      parallel: stage.nodes.filter(n => !n.dependsOn.length),
      sequential: stage.nodes.filter(n => n.dependsOn.length > 0)
    }));
  }

  async executeWithTracking(agents: Agent[], plan: ExecutionPlan) {
    for (const stage of plan) {
      // Execute parallel agents simultaneously
      const parallelResults = await Promise.all(
        stage.parallel.map(node =>
          this.executeAgent(agents[node.id], node.task)
        )
      );

      // Update live Mermaid diagram in UI
      await this.updateDiagramState(node.id, 'completed');

      // Execute sequential based on results
      for (const node of stage.sequential) {
        if (this.shouldExecute(node, parallelResults)) {
          await this.executeAgent(agents[node.id], node.task);
        }
      }
    }
  }
}
```

### Live Visualization in the UI

```tsx
// React component showing live execution
function WorkflowVisualization({ sessionId }) {
  const workflow = useQuery(api.workflows.getBySession, { sessionId });
  const agentStates = useQuery(api.agents.bySession, { sessionId });

  // Mermaid diagram updates in real-time!
  const mermaidWithState = useMemo(() => {
    return updateMermaidWithStates(workflow.mermaid, agentStates);
  }, [workflow, agentStates]);

  return (
    <MermaidRenderer
      chart={mermaidWithState}
      onNodeClick={(nodeId) => showAgentDetails(nodeId)}
    />
  );
}

// Real-time coloring based on state
function updateMermaidWithStates(mermaid: string, agents: Agent[]) {
  let updated = mermaid;

  agents.forEach(agent => {
    const color = getColorForState(agent.status);
    // Update node styling
    updated = updated.replace(
      `Agent${agent.id}[`,
      `Agent${agent.id}:::${agent.status}[`
    );
  });

  return updated + `
    classDef completed fill:#10b981,color:#fff
    classDef running fill:#3b82f6,color:#fff,stroke-width:4px
    classDef failed fill:#ef4444,color:#fff
    classDef pending fill:#6b7280,color:#fff
  `;
}
```

### Example Workflows Users Can Draw

#### Testing Strategy
```mermaid
graph LR
    Start([Test New Feature])
    Start --> Unit[Unit Tests]
    Start --> Security[Security Scan]
    Start --> Perf[Performance Test]

    Unit --> Integration[Integration Tests]
    Security --> Integration
    Perf --> LoadTest[Load Test]

    Integration --> E2E[E2E Tests]
    LoadTest --> E2E

    E2E --> Deploy{All Pass?}
    Deploy -->|Yes| Prod[Deploy to Prod]
    Deploy -->|No| Debug[Debug & Fix]
```

#### Refactoring Flow
```mermaid
graph TD
    Code([Legacy Code])
    Code --> Analyze[Analyze Dependencies]
    Analyze --> Split{Complexity?}

    Split -->|High| Agent1[Extract Service 1]
    Split -->|High| Agent2[Extract Service 2]
    Split -->|Low| Simple[Simple Refactor]

    Agent1 --> Test1[Test Service 1]
    Agent2 --> Test2[Test Service 2]
    Simple --> Test3[Test Refactored Code]

    Test1 --> Integrate
    Test2 --> Integrate
    Test3 --> Integrate

    Integrate[Integration Test]
    Integrate --> Done([✅ Refactored])
```

### The Killer Features

1. **Natural Expression**: Developers already think in flowcharts
2. **Automatic Parallelization**: System figures out what can run simultaneously
3. **Visual Progress**: See exactly where the workflow is in real-time
4. **Conditional Logic**: Built-in branching based on results
5. **Failure Handling**: Visual representation of retry/fallback paths
6. **Reusable Templates**: Save and share workflow patterns

### Integration with Claude

```typescript
// Claude can GENERATE these diagrams!
User: "Create a workflow to safely upgrade our authentication system"

Claude: "I'll create a Mermaid workflow for safely upgrading your auth system:"

```mermaid
graph TD
    Start([Auth Upgrade])
    Start --> Backup[Agent 1: Backup current auth]
    Start --> ReadDocs[Agent 2: Read migration guide]

    Backup --> Feature[Agent 3: Create feature flag]
    ReadDocs --> Feature

    Feature --> Parallel{Parallel Testing}
    Parallel --> NewAuth[Agent 4: New auth flow]
    Parallel --> OldAuth[Agent 5: Old auth flow]

    NewAuth --> Compare[Agent 6: Compare results]
    OldAuth --> Compare

    Compare --> Decision{Match?}
    Decision -->|Yes| Rollout[Agent 7: Gradual rollout]
    Decision -->|No| Debug[Agent 8: Debug differences]

    Rollout --> Monitor[Agent 9: Monitor metrics]
    Debug --> NewAuth
```

"Should I execute this workflow?"

User: "Yes!"

*Nebuchadnezzar spawns 9 isolated containers and executes the entire flow*

## Architectural Solutions

### Container-Host Communication

**Solution: Shared Mount Strategy with Clear Boundaries**

```typescript
// Container configuration for shared mounts
class ContainerMountStrategy {
  getMounts(projectPath: string, agentId: string) {
    return {
      // Project files - shared across all containers
      project: {
        source: projectPath,
        target: '/workspace',
        type: 'bind',
        consistency: 'cached' // Better performance for reads
      },

      // Claude home directory - read-only for skills
      claudeHome: {
        source: '~/.claude',
        target: '/home/claude/.claude',
        type: 'bind',
        readonly: true
      },

      // Temp workspace for agent-specific files
      agentWorkspace: {
        source: `/tmp/agents/${agentId}`,
        target: '/tmp/agent',
        type: 'bind'
      },

      // JSONL output directory for streaming
      streamOutput: {
        source: `/tmp/claude-streams/${agentId}`,
        target: '/tmp/streams',
        type: 'bind'
      }
    };
  }
}
```

**Benefits:**
- Claude tools see the same files as host
- No complex file sync needed
- Skills work automatically
- Clear separation of concerns

### Streaming Architecture

**Solution: Agent SDK Async Generator → Convex Mutations**

The Agent SDK's `query()` returns an async generator that yields structured message objects. Each message is pushed to Convex in real-time. No stdout parsing, no JSONL file watching — the SDK handles all of that internally.

```typescript
// Reference: claudecodeui feat/devcontainer-integration server/claude-sdk.js
import { query } from "@anthropic-ai/claude-agent-sdk";

class AgentSDKStreamer {
  // Stream structured messages from SDK directly to Convex
  async streamToConvex(prompt: string, messageId: string, options: SDKOptions) {
    const queryInstance = query({ prompt, options });
    let fullContent = "";

    for await (const message of queryInstance) {
      // Each message is a structured object — not raw text
      switch (message.type) {
        case "assistant":
          fullContent += message.content ?? "";
          await this.convex.mutation(api.messages.updateContent, {
            messageId,
            content: fullContent,
            streaming: true,
          });
          break;

        case "result":
          // Extract token usage from final result
          if (message.modelUsage) {
            await this.convex.mutation(api.sessions.updateTokenUsage, {
              sessionId: options.sessionId,
              input: message.modelUsage.input_tokens,
              output: message.modelUsage.output_tokens,
            });
          }
          break;
      }
    }

    // Mark streaming complete
    await this.convex.mutation(api.messages.updateContent, {
      messageId,
      content: fullContent,
      streaming: false,
    });
  }

  // Abort via SDK instance (not process kill)
  async abort(sessionInstance: QueryInstance) {
    sessionInstance.interrupt();
  }
}
```

**Benefits:**
- Structured messages eliminate stdout/stderr parsing
- Token usage tracking built into SDK result messages
- Abort via `interrupt()` instead of `SIGTERM`
- Session resume via `options.resume` instead of CLI flags
- Devcontainer support via `pathToClaudeCodeExecutable` option

### YOLO Mode Implementation

**No Tool Approvals - Always Run with --dangerously-skip-permissions**

```typescript
// Host CLI side - Simple YOLO mode
class YOLOClaudeExecutor {
  async executeClaude(prompt: string, agentId: string) {
    const stream = await this.sdk.query(prompt, {
      // Always YOLO mode - no approval UI needed
      dangerouslySkipPermissions: true,
      signal: this.abortController.signal
    });

    // Stream directly to Convex, no approval interruptions
    for await (const chunk of stream) {
      await this.streamToConvex(chunk);
    }
  }
}
```

This simplifies the architecture significantly - no approval UI, no waiting for user input, just pure execution speed!

### Resource Lifecycle Management

**Solution: Automatic Cleanup with Grace Periods**

```typescript
class ResourceLifecycleManager {
  private activeResources = new Map<string, ResourceRecord>();
  private cleanupInterval: NodeJS.Timer;

  constructor() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async allocateResources(agentId: string) {
    const resources = {
      containerId: null,
      worktreePath: null,
      ports: [],
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    // Allocate container
    if (this.needsContainer(agentId)) {
      resources.containerId = await this.spawnContainer(agentId);
    }

    // Allocate worktree
    if (this.needsWorktree(agentId)) {
      resources.worktreePath = await this.createWorktree(agentId);
    }

    // Allocate ports
    resources.ports = await this.allocatePorts(agentId);

    this.activeResources.set(agentId, resources);
    return resources;
  }

  async cleanup() {
    const now = Date.now();
    const GRACE_PERIOD = 30 * 60 * 1000; // 30 minutes

    for (const [agentId, resources] of this.activeResources) {
      // Check if agent is still active in Convex
      const agent = await this.convex.query(api.agents.get, { agentId });

      if (!agent || agent.status === 'completed' || agent.status === 'failed') {
        const inactiveDuration = now - resources.lastActivity;

        if (inactiveDuration > GRACE_PERIOD) {
          await this.releaseResources(agentId);
        }
      }
    }
  }

  async releaseResources(agentId: string) {
    const resources = this.activeResources.get(agentId);
    if (!resources) return;

    // Stop container
    if (resources.containerId) {
      await exec(`docker stop ${resources.containerId}`);
      await exec(`docker rm ${resources.containerId}`);
    }

    // Remove worktree
    if (resources.worktreePath) {
      await exec(`git worktree remove ${resources.worktreePath} --force`);
    }

    // Release ports
    for (const port of resources.ports) {
      this.portAllocator.release(port);
    }

    // Clean up temp files
    await fs.rm(`/tmp/agents/${agentId}`, { recursive: true, force: true });
    await fs.rm(`/tmp/claude-streams/${agentId}`, { recursive: true, force: true });

    this.activeResources.delete(agentId);
  }

  // Graceful shutdown
  async shutdown() {
    clearInterval(this.cleanupInterval);

    // Release all resources
    for (const agentId of this.activeResources.keys()) {
      await this.releaseResources(agentId);
    }
  }
}
```

### Worktree Merge Strategy

**Solution: Automatic Conflict Resolution with User Review**

```typescript
class WorktreeMergeStrategy {
  async mergeAgentWork(agentId: string, strategy: 'auto' | 'manual' = 'auto') {
    const worktreePath = `.worktrees/agent-${agentId}`;

    try {
      // 1. Attempt automatic merge
      await exec(`git checkout main`);
      const mergeResult = await exec(`git merge agent-${agentId} --no-ff`, {
        returnOutput: true,
        allowFailure: true
      });

      if (mergeResult.success) {
        // Clean merge - we're done
        await this.cleanupWorktree(agentId);
        return { success: true, conflicts: [] };
      }

      // 2. Handle merge conflicts
      if (strategy === 'auto') {
        // Try to auto-resolve common patterns
        const conflicts = await this.detectConflicts();
        const resolved = await this.autoResolveConflicts(conflicts);

        if (resolved.allResolved) {
          await exec(`git add .`);
          await exec(`git commit -m "Auto-merged agent-${agentId} work"`);
          await this.cleanupWorktree(agentId);
          return { success: true, conflicts: [], autoResolved: true };
        }
      }

      // 3. Manual resolution required
      await this.createMergeRequest(agentId);
      return {
        success: false,
        conflicts: await this.detectConflicts(),
        mergeRequestId: agentId
      };

    } catch (error) {
      // Abort merge on error
      await exec(`git merge --abort`);
      throw error;
    }
  }

  async autoResolveConflicts(conflicts: ConflictInfo[]) {
    let allResolved = true;

    for (const conflict of conflicts) {
      // Common auto-resolvable patterns
      if (conflict.type === 'import_statements') {
        // Both added imports - keep both
        await this.resolveImports(conflict.file);
      } else if (conflict.type === 'formatting_only') {
        // Take the agent's version (assumed to be formatted)
        await exec(`git checkout --theirs ${conflict.file}`);
      } else {
        // Can't auto-resolve
        allResolved = false;
      }
    }

    return { allResolved };
  }
}
```

### Performance Optimization

**Solution: Smart Batching and Debouncing**

```typescript
class PerformanceOptimizer {
  private messageBuffer = new Map<string, string[]>();
  private flushTimers = new Map<string, NodeJS.Timeout>();

  // Batch message updates to reduce Convex mutations
  async appendToMessage(messageId: string, chunk: string) {
    if (!this.messageBuffer.has(messageId)) {
      this.messageBuffer.set(messageId, []);
    }

    this.messageBuffer.get(messageId).push(chunk);

    // Clear existing timer
    if (this.flushTimers.has(messageId)) {
      clearTimeout(this.flushTimers.get(messageId));
    }

    // Set new timer - flush after 100ms of no new chunks
    this.flushTimers.set(messageId, setTimeout(() => {
      this.flushBuffer(messageId);
    }, 100));

    // Force flush if buffer is large
    if (this.messageBuffer.get(messageId).length > 50) {
      this.flushBuffer(messageId);
    }
  }

  private async flushBuffer(messageId: string) {
    const chunks = this.messageBuffer.get(messageId);
    if (!chunks || chunks.length === 0) return;

    // Single Convex mutation with all chunks
    await this.convex.mutation(api.messages.appendBatch, {
      messageId,
      content: chunks.join(''),
      chunkCount: chunks.length
    });

    // Clear buffer
    this.messageBuffer.set(messageId, []);
    this.flushTimers.delete(messageId);
  }
}
```

## Conclusion

Nebuchadnezzar represents a complete reimagining of the Claude Code UI experience, addressing fundamental architectural issues while embracing modern development practices. By leveraging Convex for state management, Next.js for unified architecture, and devcontainers for development experience, we create a robust, scalable, and maintainable platform for AI-assisted development.

The implementation will be iterative and agent-driven, with no artificial timelines. We'll start simple with proven patterns and layer complexity as needed. The architecture prioritizes:

1. **Simplicity first** - Start with the minimal viable architecture
2. **Progressive enhancement** - Add features as they prove necessary
3. **Single machine optimization** - Push one beefy server to its limits
4. **Future readiness** - Architecture that can scale to distributed execution when needed

With shared mounts, local Convex, and a focus on getting the fundamentals right, Nebuchadnezzar will deliver a superior Claude Code experience while maintaining the flexibility to evolve based on real-world usage.