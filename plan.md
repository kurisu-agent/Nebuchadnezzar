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
│  Real-time Sync • Reactive Queries • Optimistic Updates    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Host CLI Orchestrator                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Claude SDK   │ │ File System  │ │Process Manager│       │
│  │ Integration  │ │   Watcher    │ │   (PM2-like)  │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Core Framework
- **Next.js 15**: App Router with React Server Components
- **TypeScript 5.6+**: Full type safety across stack
- **Convex**: Real-time database and sync platform
- **Tailwind CSS**: Utility-first styling with shadcn/ui components

### Claude Integration
- **@anthropic-ai/claude-agent-sdk**: Direct SDK integration
- **Custom WebSocket Bridge**: Convex → Claude streaming adapter
- **Tool Approval System**: UI-driven permission management

### Development Environment
- **Devcontainer**: Node.js 22 Alpine-based container
- **Docker Compose**: Multi-service orchestration (Next.js + Convex local)
- **VS Code Extensions**: Convex, Tailwind IntelliSense, TypeScript
- **Hot Reload**: Webpack HMR with polling for container compatibility

### Testing & Quality
- **Vitest**: Unit and integration testing
- **Playwright**: E2E testing with devcontainer support
- **ESLint + Prettier**: Code quality enforcement
- **Husky**: Pre-commit hooks for quality gates

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
│   │   ├── abort/          # Abort active session
│   │   └── approve/        # Tool approval endpoint
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
      autoApproveTools: v.boolean(),
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

  toolApprovals: defineTable({
    sessionId: v.id("sessions"),
    toolName: v.string(),
    parameters: v.any(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    requestedAt: v.number(),
    respondedAt: v.optional(v.number()),
    autoApproved: v.boolean(),
  }).index("by_session_status", ["sessionId", "status"]),
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

### 4. Host CLI Orchestrator

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
          onToolApprovalRequired: async (tool) => {
            // Request approval from UI via Convex
            const approval = await this.requestToolApproval(agentId, tool);
            return approval;
          },
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

  private async requestToolApproval(agentId: string, tool: any) {
    // Call Convex to create approval request
    const response = await fetch("http://localhost:3000/api/convex/tool-approval", {
      method: "POST",
      body: JSON.stringify({ agentId, tool }),
    });

    // Wait for approval (with timeout)
    const approval = await response.json();
    return approval.approved;
  }

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

## Migration Strategy from claudecodeui

### Phase 1: Core Infrastructure (Week 1-2)
1. **Devcontainer Setup**
   - Create .devcontainer with Node.js 22 Alpine
   - Configure Docker Compose for Next.js + Convex
   - Add VS Code extensions and settings
   - Set up hot reload with polling

2. **Next.js Scaffold**
   - Initialize Next.js 15 with App Router
   - Configure TypeScript with strict mode
   - Set up Tailwind + shadcn/ui
   - Create basic layout structure

3. **Convex Integration**
   - Define initial schema
   - Set up authentication
   - Create basic CRUD operations
   - Test real-time sync

4. **Host Orchestrator**
   - Create separate Node.js service
   - Integrate Claude SDK
   - Set up communication bridge
   - Implement file watching

### Phase 2: Core Features (Week 3-4)
1. **Chat Interface**
   - Port ChatInterface component
   - Adapt to Convex real-time updates
   - Implement markdown rendering
   - Add code highlighting

2. **Session Management**
   - Create session list UI
   - Implement session creation/deletion
   - Add session resume capability
   - Build message history

3. **Tool Approval System**
   - Create approval UI components
   - Implement approval flow via Convex
   - Add auto-approval settings
   - Handle timeout scenarios

4. **File Browser**
   - Port FileTree component
   - Connect to host file system
   - Implement file operations
   - Add file watching integration

### Phase 3: Advanced Features (Week 5-6)
1. **Multi-Agent Support**
   - Design agent execution framework
   - Implement parallel agent spawning
   - Create agent status UI
   - Add sub-agent hierarchies

2. **Workflow System**
   - Create workflow builder UI
   - Implement step orchestration
   - Add dependency management
   - Build workflow templates

3. **Settings & Preferences**
   - Port settings UI
   - Add Convex persistence
   - Implement theme switching
   - Create API key management

4. **Performance Optimization**
   - Implement virtual scrolling for messages
   - Add message pagination
   - Optimize Convex queries
   - Add caching strategies

### Phase 4: Polish & Testing (Week 7-8)
1. **Testing Suite**
   - Unit tests for components
   - Integration tests for Convex
   - E2E tests with Playwright
   - Load testing for real-time sync

2. **Documentation**
   - API documentation
   - User guide
   - Developer setup guide
   - Deployment guide

3. **Error Handling**
   - Add error boundaries
   - Implement retry logic
   - Create error reporting
   - Add user notifications

4. **Production Readiness**
   - Security audit
   - Performance profiling
   - Docker production build
   - CI/CD pipeline setup

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
- **Direct File Access**: Native file system operations
- **Process Management**: Better control over Claude SDK
- **Security Boundary**: Isolate privileged operations
- **Performance**: Avoid Docker networking overhead
- **Flexibility**: Easy to add new integrations

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
- NextAuth.js for authentication
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

## Conclusion

Nebuchadnezzar represents a complete reimagining of the Claude Code UI experience, addressing fundamental architectural issues while embracing modern development practices. By leveraging Convex for state management, Next.js for unified architecture, and devcontainers for development experience, we create a robust, scalable, and maintainable platform for AI-assisted development.

The migration from claudecodeui will be executed incrementally, ensuring feature parity while introducing significant improvements in performance, reliability, and developer experience. The architecture is designed to support future enhancements including multi-agent orchestration, collaborative features, and enterprise requirements.

This plan provides a clear roadmap for building a production-ready Claude Code UI that can scale from individual developers to large teams, while maintaining the simplicity and power that makes Claude Code compelling.