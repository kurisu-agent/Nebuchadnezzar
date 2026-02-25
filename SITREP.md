# Nebuchadnezzar — SITREP

## What Is This

Ground-up Claude Code UI. Next.js 15 + Convex (real-time DB) + Claude Agent SDK. No auth (Coder environment), YOLO mode only.

Reference implementation: [claudecodeui feat/devcontainer-integration](https://github.com/kurisu-agent/claudecodeui/tree/feat/devcontainer-integration)

## Current State: MVP Skeleton Built, Needs SDK Migration

### Done

- **Project scaffolded**: Next.js 15, React 19, TypeScript, Tailwind v4, Convex
- **Convex schema**: `sessions` (title, claudeSessionId, createdAt) + `messages` (sessionId, role, content, streaming, createdAt)
- **Convex functions**: CRUD for sessions and messages, streaming update mutations
- **Frontend**: Home page (create/list sessions), chat session page with streaming display, Convex provider

### Needs Migration: CLI → Agent SDK

The current `app/api/chat/route.ts` spawns `claude` as a child process and parses stdout. This was a wrong turn — the plan calls for `@anthropic-ai/claude-agent-sdk` and the reference repo proves the SDK approach works. The SDK gives us:

- **Structured messages** via async generator (no stdout parsing)
- **Session management** via `resume` option and `instance.interrupt()`
- **Devcontainer support** via `pathToClaudeCodeExecutable` + proxy script
- **YOLO mode** via `permissionMode: 'bypassPermissions'`
- **Token tracking** from structured `result.modelUsage` fields

Migration path:
1. `npm install @anthropic-ai/claude-agent-sdk`
2. Rewrite `app/api/chat/route.ts` to use `query()` async generator
3. Each yielded message → Convex mutation (replaces stdout chunk buffering)
4. Store SDK session ID in Convex for `resume` on subsequent messages

### Not Done — Blocking

1. **Convex not initialized**: Need to run `npx convex dev` to:
   - Create a Convex account/project (first time)
   - Generate `convex/_generated/` (TypeScript types for schema + functions)
   - Create `.env.local` with `NEXT_PUBLIC_CONVEX_URL`
   - Without this, nothing compiles

2. **Next.js not started**: `npm run dev` — depends on Convex being initialized first

3. **Agent SDK integration**: Rewrite API route from CLI spawn to SDK `query()` call

### Not Done — Non-Blocking (Future)

- Markdown rendering in chat messages
- Session deletion
- Model selection
- Multi-agent orchestration
- Devcontainer support (SDK's `pathToClaudeCodeExecutable` + proxy script)
- Malleable architecture / self-modification

## File Structure

```
package.json              — deps: next, react, convex, @anthropic-ai/claude-agent-sdk
tsconfig.json             — paths: @/* -> ./*
next.config.ts            — empty (defaults)
postcss.config.mjs        — tailwind v4
.gitignore                — node_modules, .next, .env.local, convex/_generated

convex/
  schema.ts               — sessions + messages tables
  sessions.ts             — list, get, create, updateTitle, setClaudeSessionId
  messages.ts             — list, send, createAssistant, updateContent

app/
  globals.css             — @import "tailwindcss"
  layout.tsx              — root layout + ConvexClientProvider
  providers.tsx           — ConvexReactClient setup
  page.tsx                — home: new session button + session list
  session/[id]/page.tsx   — chat UI: messages + textarea input
  api/chat/route.ts       — POST: calls Agent SDK query(), streams to Convex
```

## Architecture (MVP)

```
Browser
  └─ Next.js frontend (React 19, Tailwind v4)
       └─ useQuery(api.messages.list) ← real-time subscription
       └─ useMutation(api.messages.send) → stores user message
       └─ fetch("/api/chat") → triggers Claude

Next.js API Route (/api/chat)
  └─ ConvexHttpClient → reads messages, writes assistant response
  └─ query(prompt, { permissionMode: 'bypassPermissions', resume, ... })
       └─ for await (const message of queryInstance)
       └─   → Convex mutation per structured message
       └─ on complete → final Convex mutation (streaming: false)

Claude Agent SDK
  └─ reads ~/.claude/.credentials.json (OAuth) — no API key needed
  └─ permissionMode: 'bypassPermissions' (YOLO)
  └─ resume: sessionId for conversation continuity
  └─ pathToClaudeCodeExecutable: proxy script (for devcontainer mode)
```

## To Resume

```bash
# Terminal 1: Convex backend
cd ~/Code/Nebuchadnezzar
npx convex dev

# Terminal 2: Next.js frontend (after Convex generates .env.local)
cd ~/Code/Nebuchadnezzar
npm run dev

# Then open http://localhost:3000
```

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Agent SDK over CLI spawn | Structured messages, no stdout parsing, native session mgmt, devcontainer support via `pathToClaudeCodeExecutable` |
| SDK still uses OAuth creds | `~/.claude/.credentials.json` — no API key needed, same as CLI |
| Convex over raw WebSocket | Real-time subscriptions for free, ACID mutations, reactive queries |
| SDK `resume` option | Maintains full conversation context (tools, files, etc.) across messages |
| No auth | Running in Coder — single user, trusted environment |
| YOLO mode only | `permissionMode: 'bypassPermissions'` — no approval UI needed |
