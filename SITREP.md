# Nebuchadnezzar — SITREP

## What Is This

Ground-up Claude Code UI. Next.js 15 + Convex (real-time DB) + Claude Agent SDK. No auth (Coder environment), YOLO mode only.

## Current State: Functional MVP

### Working

- **Chat sessions**: Create, list, soft-delete, restore sessions
- **Agent SDK integration**: `query()` async generator streams structured messages to Convex in real-time
- **Streaming UI**: Word-level fade-in animation, collapsible long messages, thinking/tool step indicators
- **Message queue**: Queue messages while streaming, auto-send when response completes
- **Error handling**: Errors stored with `error: true` flag, rendered as alert-error with collapsible JSON details and retry button
- **Session drawer**: Slide-out navigation between sessions
- **Dashboard**: Session management (soft delete/restore/permanent delete), file explorer for `~/.claude` config files
- **File explorer**: Browse and edit files in `~/.claude` directory with CodeMirror editor
- **Cancel support**: Cancel active streams, clean up orphaned streaming messages
- **Draft persistence**: Input drafts saved to sessionStorage per session
- **Date dividers**: WhatsApp-style date labels between messages
- **Mobile-first**: `dvh` units, visual viewport tracking for keyboard, touch feedback on all tappable elements

### Known Issues

- Agent SDK sometimes exits with code 1 — error is now captured with full JSON detail for debugging
- Dev server occasionally returns 500 Internal Server Error — restart Next.js when this happens
- No ESLint config (eslint.config.js missing for ESLint v9)

### Not Done — Future

- Model selection
- Token/cost tracking display
- Multi-agent orchestration
- Devcontainer support (SDK's `pathToClaudeCodeExecutable` + proxy script)
- Markdown syntax highlighting in code blocks

## File Structure

```
CLAUDE.md                 — project conventions and instructions
SITREP.md                 — this file

convex/
  schema.ts               — sessions (soft-delete) + messages (error, cancelled) + queuedMessages
  sessions.ts             — list, get, create, updateTitle, remove (soft), restore, permanentDelete
  messages.ts             — list, send, createAssistant, updateContent, cancelStreaming, cancelStreamingBySession
  queuedMessages.ts       — list, add, remove, update, shift

app/
  layout.tsx              — root layout + ConvexClientProvider
  providers.tsx           — ConvexReactClient with auto URL detection (localhost vs proxy)
  page.tsx                — home: new session button + session list
  session/[id]/page.tsx   — chat UI: streaming markdown, error alerts, message queue, collapsible messages
  session/[id]/edit-title-modal.tsx — inline title editing
  components/
    session-drawer.tsx    — slide-out session navigation
    session-row.tsx       — session list item with relative time
    file-tree.tsx         — directory browser component
    file-editor.tsx       — CodeMirror file editor
  dashboard/page.tsx      — session management + ~/.claude file explorer
  api/
    chat/route.ts         — POST: Agent SDK query(), streams to Convex, serializeError for failures
    chat/cancel/route.ts  — POST: cancel active stream + clean orphaned streaming messages
    chat/active-streams.ts — in-memory registry of active SDK streams
    files/route.ts        — GET: list directory contents
    files/read/route.ts   — GET: read file contents
    files/write/route.ts  — POST: write file contents
```

## Architecture

```
Browser
  └─ Next.js frontend (React 19, Tailwind v4, daisyUI v5)
       └─ useQuery(api.messages.list) ← real-time subscription
       └─ useMutation(api.messages.send) → stores user message
       └─ fetch("/api/chat") → triggers Claude Agent SDK

Next.js API Route (/api/chat)
  └─ ConvexHttpClient → reads messages, writes assistant response
  └─ query(prompt, { permissionMode: 'bypassPermissions', resume, ... })
       └─ for await (const message of queryInstance)
       └─   stream_event → throttled flush to Convex (150ms)
       └─   assistant → authoritative text + extract thinking/tool steps
       └─   result → session ID capture, final content
       └─ on complete → final Convex mutation (streaming: false)
       └─ on error → serializeError() → store with error: true

Convex (local anonymous backend on :3210)
  └─ Real-time subscriptions power the UI
  └─ Sessions with soft-delete (deletedAt field)
  └─ Messages with error/cancelled flags
  └─ Queued messages for send-while-streaming

Claude Agent SDK
  └─ reads ~/.claude/.credentials.json (OAuth) — no API key needed
  └─ permissionMode: 'bypassPermissions' (YOLO)
  └─ resume: claudeSessionId for conversation continuity
```

## To Resume

```bash
npm run dev:convex   # Convex local backend on :3210 (anonymous mode)
npm run dev          # Next.js on :3000 (Turbopack)

# Access via Coder proxy:
# https://3000--<workspace>.<coder-host>/
```
