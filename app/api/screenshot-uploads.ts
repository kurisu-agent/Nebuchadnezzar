/**
 * In-memory registry of screenshot upload IDs.
 * Populated by POST /api/uploads when source="screenshot",
 * consumed by POST /api/chat after SDK processing completes.
 *
 * Each entry stores the upload ID and the timestamp it was registered,
 * so the chat route can filter to only screenshots from the current turn.
 */

interface ScreenshotEntry {
  uploadId: string;
  timestamp: number;
}

const pending: ScreenshotEntry[] = [];

/** Called by the upload route when a screenshot is uploaded. */
export function registerScreenshot(uploadId: string) {
  pending.push({ uploadId, timestamp: Date.now() });
}

/**
 * Called by the chat route after SDK processing completes.
 * Returns and removes all screenshot upload IDs registered after `since`.
 */
export function consumeScreenshots(since: number): string[] {
  const ids: string[] = [];
  // Walk backwards so splicing doesn't shift indices
  for (let i = pending.length - 1; i >= 0; i--) {
    if (pending[i].timestamp >= since) {
      ids.push(pending[i].uploadId);
      pending.splice(i, 1);
    } else if (pending[i].timestamp < since - 60_000) {
      // Clean up stale entries older than 1 minute before processing start
      pending.splice(i, 1);
    }
  }
  return ids;
}
