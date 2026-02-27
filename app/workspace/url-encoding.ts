import { Id } from "@/convex/_generated/dataModel";
import { PaneNode, PaneLeaf, PaneSplit } from "./types";

function genId(): string {
  return crypto.randomUUID();
}

/**
 * Serialize a pane tree to a compact URL-safe string.
 *
 * Format:
 *   leaf → sessionId (or "_" for null)
 *   split → {h|v}{ratio*100}({first},{second})
 *
 * Example: v50(abc123,def456) = vertical split at 50%
 * Nested:  v50(h60(abc,def),ghi)
 */
function toBase64Url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string {
  const pad = (4 - (encoded.length % 4)) % 4;
  const padded =
    encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return decodeURIComponent(escape(atob(padded)));
}

export function serializeTree(node: PaneNode): string {
  if (node.type === "leaf") {
    if (node.iframeUrl) return "@" + toBase64Url(node.iframeUrl);
    return node.sessionId ?? "_";
  }
  const d = node.direction === "horizontal" ? "h" : "v";
  const r = Math.round(node.ratio * 100);
  return `${d}${r}(${serializeTree(node.first)},${serializeTree(node.second)})`;
}

/**
 * Deserialize a compact string back to a pane tree.
 */
export function deserializeTree(s: string): PaneNode {
  let pos = 0;

  function parse(): PaneNode {
    // Check for iframe leaf: @<base64url>
    if (s[pos] === "@") {
      pos++; // skip @
      let encoded = "";
      while (pos < s.length && !"(),".includes(s[pos])) {
        encoded += s[pos];
        pos++;
      }
      return {
        type: "leaf",
        id: genId(),
        sessionId: null,
        iframeUrl: fromBase64Url(encoded),
      } as PaneLeaf;
    }

    // Check for split: [hv] followed by digits and then '('
    if (s[pos] === "h" || s[pos] === "v") {
      let lookahead = pos + 1;
      while (lookahead < s.length && /\d/.test(s[lookahead])) {
        lookahead++;
      }
      if (lookahead > pos + 1 && s[lookahead] === "(") {
        // It's a split node
        const direction = s[pos] === "h" ? "horizontal" : ("vertical" as const);
        pos++; // skip h/v

        let ratioStr = "";
        while (pos < s.length && /\d/.test(s[pos])) {
          ratioStr += s[pos];
          pos++;
        }
        const ratio = parseInt(ratioStr) / 100;

        pos++; // skip (
        const first = parse();

        if (s[pos] !== ",") throw new Error("Expected , in layout");
        pos++; // skip ,

        const second = parse();

        if (s[pos] !== ")") throw new Error("Expected ) in layout");
        pos++; // skip )

        return {
          type: "split",
          id: genId(),
          direction,
          first,
          second,
          ratio: Math.max(0.15, Math.min(0.85, ratio)),
        } as PaneSplit;
      }
    }

    // It's a leaf — read until we hit a delimiter or end
    let id = "";
    while (pos < s.length && !"(),".includes(s[pos])) {
      id += s[pos];
      pos++;
    }

    return {
      type: "leaf",
      id: genId(),
      sessionId: id === "_" ? null : (id as Id<"sessions">),
    } as PaneLeaf;
  }

  const result = parse();
  if (pos !== s.length) throw new Error("Unexpected trailing content");
  return result;
}

/**
 * Extract all session IDs from a serialized layout string.
 * Returns empty array on invalid input.
 */
export function extractSessionIds(layout: string): Id<"sessions">[] {
  try {
    const tree = deserializeTree(layout);
    return collectIds(tree);
  } catch {
    return [];
  }
}

function collectIds(node: PaneNode): Id<"sessions">[] {
  if (node.type === "leaf") {
    return node.sessionId ? [node.sessionId] : [];
  }
  return [...collectIds(node.first), ...collectIds(node.second)];
}
