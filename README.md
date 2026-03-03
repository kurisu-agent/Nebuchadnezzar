<div align="center">

# Nebuchadnezzar

*A mobile-first AI development environment — dogfooded into existence from a phone without touching a laptop.*

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Convex](https://img.shields.io/badge/Convex-realtime-orange)](https://www.convex.dev/)
[![Claude Agent SDK](https://img.shields.io/badge/Claude-Agent%20SDK-blueviolet)](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk)

</div>

---

> **Warning:** This project does not include authentication. If you expose it beyond localhost, you must provide your own auth layer — for example via [Coder](https://coder.com/), [Authentik](https://goauthentik.io/), [Authelia](https://www.authelia.com/), or a reverse proxy with basic auth.

A web UI for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) built with Next.js 15, Convex, and the Claude Agent SDK. No cloud services — everything runs locally.

## Features

- **Real-time streaming chat** — Word-level fade-in animation, thinking/tool-use indicators, collapsible long messages
- **Session management** — Create, rename, soft-delete, restore, and permanently delete sessions
- **Message queue** — Send follow-up messages while Claude is still responding
- **Image uploads** — Attach images to messages with automatic thumbnail generation
- **Config file editor** — Browse and edit `~/.claude` files with CodeMirror (syntax highlighting for JS, JSON, CSS, Markdown)
- **Session drawer** — Slide-out navigation between sessions, grouped by recency
- **Error handling** — Collapsible error details with retry button
- **Cancel support** — Stop active responses mid-stream
- **Draft persistence** — Input drafts saved per session across page navigations
- **YOLO mode** — Bypasses all Claude Code permission prompts for uninterrupted flow

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router, Turbopack) |
| UI | [React 19](https://react.dev/) + [Tailwind CSS v4](https://tailwindcss.com/) + [daisyUI v5](https://daisyui.com/) |
| Database | [Convex](https://www.convex.dev/) (local anonymous backend, real-time subscriptions) |
| AI | [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) |
| Icons | [Phosphor Icons](https://phosphoricons.com/) |
| Editor | [CodeMirror](https://codemirror.net/) via `@uiw/react-codemirror` |
| Language | TypeScript (strict, no JS files) |

## Architecture

```
Browser (React 19 + Tailwind v4 + daisyUI v5)
  ├── useQuery(api.messages.list)       ← real-time subscription
  ├── useMutation(api.messages.send)    → stores user message
  └── fetch("/api/chat")               → triggers Agent SDK

Next.js API Route (/api/chat)
  ├── ConvexHttpClient                  → reads/writes messages
  └── query(prompt, { permissionMode: 'bypassPermissions' })
       └── for await (message of queryInstance)
            ├── stream_event → throttled flush to Convex (150ms)
            ├── assistant    → full text + thinking/tool steps
            └── result       → session ID, usage stats

Convex (local backend on :3210)
  ├── Sessions (soft-delete, auto-generated titles)
  ├── Messages (streaming flag, error/cancelled states)
  └── Queued messages (send-while-streaming)

Claude Agent SDK
  ├── OAuth via ~/.claude/.credentials.json
  └── YOLO mode (bypassPermissions)
```

## Prerequisites

- **Node.js** 18+
- **Claude Code CLI** installed and authenticated (OAuth credentials at `~/.claude/.credentials.json`)
- **Convex CLI** (`npm install -g convex` or it ships with the project)

## Setup

```bash
# Clone the repo
git clone https://github.com/kurisu-agent/Nebuchadnezzar.git
cd Nebuchadnezzar

# Install dependencies
npm install

# Create .env.local (adjust URLs for your environment)
cat <<'EOF' > .env.local
CONVEX_URL=http://localhost:3210
NEXT_PUBLIC_CONVEX_URL=http://localhost:3210
EOF
```

## Running

Start both servers in separate terminals:

```bash
# Terminal 1 — Convex local backend
npm run dev:convex

# Terminal 2 — Next.js dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Production Build

You can build and run an optimized production version on port 30003. This is useful as a stable backup — if the dev server hits a frontend error, the production build stays available with the same sessions and data.

```bash
# Build and start in one command (port 30003)
npm run deploy
```

Or separately:

```bash
npm run build        # Build the production bundle
npm run start:prod   # Start the production server (port 30003)
```

The production server requires the Convex backend to be running (`npm run dev:convex`). Both the dev server (port 3000) and production server (port 30003) connect to the same Convex backend — they share the same database and sessions.

> **Note:** After Convex schema changes, rebuild the production server (`npm run deploy`) to pick up the new schema. The dev server hot-reloads automatically, but the production bundle is static.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (Turbopack, port 3000) |
| `npm run dev:convex` | Start Convex local backend (anonymous mode, port 3210) |
| `npm run build` | Build optimized production bundle |
| `npm run start:prod` | Start production server (port 30003) |
| `npm run deploy` | Build + start production server (port 30003) |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without changes |
| `npm run typecheck` | TypeScript type checking |
| `npm run test:e2e` | Run Playwright end-to-end tests |

## Status

**Functional MVP.** Core chat, streaming, session management, and file editing all work.

### Roadmap

See [TODO.md](TODO.md) for the full list.

## Authentication and Claude Code Credentials

The Agent SDK officially recommends API key authentication via `ANTHROPIC_API_KEY` (see the [Agent SDK docs](https://platform.claude.com/docs/en/agent-sdk/overview)). However, the SDK wraps the Claude Code CLI under the hood, and using your own OAuth credentials from `~/.claude/.credentials.json` for personal, single-user use is functionally equivalent to running `claude` directly.

Anthropic's [February 2026 policy clarification](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/) targeted third-party tools that extract OAuth tokens to serve multiple users — not individuals running Claude Code on their own machines. The [legal docs](https://code.claude.com/docs/en/legal-and-compliance) frame subscription limits around "ordinary, individual usage," which is exactly how Nebuchadnezzar is designed to be used: a personal interface to your own Claude Code installation.

**This project is intended for personal use only.** If you plan to host it for others, use API key authentication instead.

## Acknowledgements

Inspired by [Claude Code UI](https://github.com/siteboon/claudecodeui) by siteboon — the original open-source web UI for Claude Code. Nebuchadnezzar is a ground-up rewrite with a different stack and a mobile-first focus, but that project lit the spark.

## License

[AGPL-3.0](LICENSE)
