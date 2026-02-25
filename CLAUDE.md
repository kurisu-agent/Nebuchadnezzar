# Nebuchadnezzar

Claude Code UI — Next.js 15 + Convex + Claude Agent SDK.

## Stack

- **Next.js 15** with Turbopack, App Router
- **Convex** for real-time DB (local anonymous backend, no cloud login)
- **Tailwind CSS v4** with **daisyUI v5** (dark theme default)
- **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) for AI responses — uses OAuth creds from `~/.claude`

## Dev Environment

Runs on Coder. Ports are proxied as `https://<port>--dev--neb--example.coder.example.com/`.

### Starting dev

```bash
npm run dev          # Next.js on :3000
npm run dev:convex   # Convex local backend on :3210 (anonymous mode)
```

### Env vars (.env.local)

- `CONVEX_URL` — localhost URL for server-side (API routes)
- `NEXT_PUBLIC_CONVEX_URL` — external proxy URL for browser client
- `providers.tsx` auto-detects: uses localhost:3210 when on localhost, external URL otherwise

## Conventions

- **Mobile-first**: This is a mobile-only app. Do not optimize for desktop. Use `dvh` units for viewport height to handle mobile browser chrome appearing/disappearing. All tappable elements must have visible touch feedback (e.g. `active:bg-base-300` or `active:scale-[0.98]`) so users see an immediate response on press.
- **TypeScript only**: All files must be `.ts` or `.tsx`. No `.js`, `.mjs`, `.cjs` files in the repo.
- **UI**: Use daisyUI component classes over raw Tailwind when a daisyUI component exists. Keep Tailwind usage ultra-minimal (layout/spacing only). See **daisyUI Components** section below for the full list.
- **Icons**: Use **Phosphor Icons** (`@phosphor-icons/react`) for all icons. Import named icons with weight prop (`"regular"`, `"bold"`, `"fill"`, `"duotone"`, `"thin"`, `"light"`). Prefer `"duotone"` for decorative icons and `"bold"` for action icons. Example: `<PaperPlaneTilt size={18} weight="fill" />`
- **Theme**: dark theme only via `@plugin "daisyui" { themes: dark --default; }` in globals.css
- **Layout**: Flexbox for page structure. `h-[100dvh]` + `flex flex-col` for full-height layouts. `shrink-0` on header/footer, `flex-1 overflow-y-auto` on scrollable content.
- **No SSR**: Use `"use client"` near the root of the component tree. SSR causes issues with Convex real-time connections.
- **Data via Convex**: All data reads/writes go through Convex queries/mutations/subscriptions. No REST GET requests for data. The only API route is for triggering the Agent SDK.
- **No auth**: Single-user Coder environment, no login needed
- **YOLO mode**: Agent SDK runs with `permissionMode: 'bypassPermissions'`
- **Code quality**: Use `npm run lint` (ESLint) and `npm run format` (Prettier) before committing.

## Key Files

- `app/api/chat/route.ts` — Calls Agent SDK `query()`, streams structured messages to Convex
- `app/providers.tsx` — Convex client with auto URL detection
- `convex/schema.ts` — DB schema (sessions + messages)
- `convex/messages.ts` — Message CRUD + streaming updates
- `convex/sessions.ts` — Session CRUD

## daisyUI v5 Components

Use these class names instead of building from raw Tailwind. Refer to [daisyui.com](https://daisyui.com/components/) for full docs.

### Actions
- `.btn` — Button (variants: `btn-primary`, `btn-secondary`, `btn-accent`, `btn-ghost`, `btn-outline`; sizes: `btn-lg`, `btn-sm`, `btn-xs`; shapes: `btn-square`, `btn-circle`)
- `.dropdown` — Menu shown on click/focus
- `.fab` — Floating action button
- `.modal` — Dialog overlay (`modal-open`, `modal-box`, `modal-action`)
- `.swap` — Toggle between two states (`swap-active`, `swap-rotate`, `swap-flip`)
- `.theme-controller` — Theme toggle/select

### Data Display
- `.collapse` / accordion — Expandable content (`collapse-arrow`, `collapse-plus`, `collapse-open`)
- `.avatar` — Profile image/placeholder (`avatar-group`)
- `.badge` — Small label (`badge-primary`, `badge-secondary`, `badge-ghost`, `badge-outline`; sizes: `badge-lg`, `badge-sm`, `badge-xs`)
- `.card` — Content container (`card-body`, `card-title`, `card-actions`, `card-sm`)
- `.carousel` — Horizontal slider
- `.chat` — Chat bubble (`chat-start`, `chat-end`, `chat-bubble`, `chat-bubble-primary`)
- `.countdown` — Numeric countdown
- `.diff` — Side-by-side comparison
- `.kbd` — Keyboard key
- `.list` — Vertical list rows (`list-row`, `list-col-grow`)
- `.stats` — Statistics display (`stat`, `stat-title`, `stat-value`, `stat-desc`)
- `.status` — Status indicator (`status-primary`, `status-success`, `status-error`)
- `.table` — Styled table (`table-zebra`, `table-sm`)
- `.timeline` — Event timeline

### Navigation
- `.dock` — Bottom navigation bar (`dock-label`)
- `.breadcrumbs` — Path navigation
- `.link` — Styled link (`link-primary`, `link-hover`)
- `.menu` — Menu list (`menu-horizontal`, `menu-sm`)
- `.navbar` — Top bar (`navbar-start`, `navbar-center`, `navbar-end`)
- `.join` — Grouped elements (pagination, button groups)
- `.steps` — Step indicator (`step-primary`)
- `.tabs` — Tab navigation (`tab-active`, `tab-bordered`, `tab-lifted`)

### Feedback
- `.alert` — Message box (`alert-info`, `alert-success`, `alert-warning`, `alert-error`)
- `.loading` — Spinner (`loading-spinner`, `loading-dots`, `loading-ring`, `loading-ball`; sizes: `loading-lg`, `loading-sm`, `loading-xs`)
- `.progress` — Progress bar (`progress-primary`)
- `.radial-progress` — Circular progress
- `.skeleton` — Placeholder animation
- `.toast` — Notification popup (`toast-start`, `toast-center`, `toast-end`)
- `.tooltip` — Hover hint (`tooltip-primary`, `tooltip-top`, `tooltip-bottom`)

### Data Input
- `.checkbox` — Checkbox (`checkbox-primary`, `checkbox-sm`)
- `.fieldset` — Form group (`fieldset-legend`, `fieldset-label`)
- `.file-input` — File upload
- `.filter` — Radio group with filtering
- `.input` — Text input (`input-bordered`, `input-primary`; sizes: `input-lg`, `input-sm`, `input-xs`)
- `.label` — Field label (floating label support)
- `.radio` — Radio button
- `.range` — Slider (`range-primary`)
- `.rating` — Star rating
- `.select` — Dropdown (`select-bordered`, `select-primary`)
- `.textarea` — Multi-line input (`textarea-bordered`; sizes: `textarea-lg`, `textarea-sm`, `textarea-xs`)
- `.toggle` — On/off switch (`toggle-primary`)
- `.validator` — Validation styling

### Layout
- `.divider` — Separator (`divider-horizontal`)
- `.drawer` — Off-canvas sidebar
- `.footer` — Page footer
- `.hero` — Hero/banner section
- `.indicator` — Corner badge/label
- `.join` — Merged element group
- `.mask` — Shape masks (`mask-circle`, `mask-squircle`, `mask-hexagon`)
- `.stack` — Stacked elements

## Remember

When the user says "remember X", add it to this file under the appropriate section (or this section if no other fits).
