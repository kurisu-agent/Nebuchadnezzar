# Plan: Soft Delete, Trash View, and Error Dropdown

## 1. Soft delete sessions

**`convex/schema.ts`** — Add `deletedAt: v.optional(v.number())` to sessions table.

**`convex/sessions.ts`**:
- `remove` mutation → rename to `softDelete`, set `deletedAt: Date.now()` instead of deleting records.
- `list` query → filter out sessions where `deletedAt` is set (only show active sessions).
- Add `listDeleted` query → return only sessions with `deletedAt` set.
- Add `restore` mutation → clear `deletedAt` field.
- Add `permanentDelete` mutation → hard delete session + its messages (move existing `remove` logic here).

## 2. Trash view on dashboard

**`app/dashboard/page.tsx`** — Add a "Trash" card/section below the existing "App Info" card:
- Query `sessions.listDeleted` to show soft-deleted sessions.
- Each row shows the session title, when it was deleted, and two actions: restore and permanent delete.
- Empty state: "Trash is empty."

## 3. Error display as collapsible JSON dropdown

**`app/session/[id]/page.tsx`**:
- Detect assistant messages that start with `Error:` — render them differently.
- Show a short error summary line (e.g. "Error occurred"), then a collapsible section below it (matching the ThinkingSteps pattern) that reveals the full error text/JSON.
- Use the same expand/collapse UI pattern (CaretDown/CaretUp, subtle opacity) as ThinkingSteps.

**`app/api/chat/route.ts`**:
- On error, serialize the full error object as JSON into the message content (instead of just the message string). Format: `Error: <short message>\n\n```json\n<full error details>\n````
- This gives the collapsible something meaningful to show.

## Files changed

1. `convex/schema.ts` — add `deletedAt` field
2. `convex/sessions.ts` — soft delete, restore, permanent delete, listDeleted, filter list
3. `app/components/session-drawer.tsx` — use `softDelete` instead of `remove`
4. `app/page.tsx` — use `softDelete` instead of `remove`
5. `app/dashboard/page.tsx` — add Trash section
6. `app/session/[id]/page.tsx` — add `ErrorMessage` collapsible component
7. `app/api/chat/route.ts` — richer error content in messages
