"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { animateText } from "./utils";

/**
 * Renders streaming markdown with word-level fade-in animation.
 *
 * Splits content at the last paragraph break (\n\n). Everything before
 * is "settled" — rendered as plain markdown. The tail (current paragraph
 * being written) is rendered through ReactMarkdown with custom components
 * that wrap text tokens in animated <span>s.
 */
export function StreamingMarkdown({ content }: { content: string }) {
  const [settledLen, setSettledLen] = useState(0);
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    const id = setInterval(() => {
      setSettledLen(contentRef.current.length);
    }, 400);
    return () => clearInterval(id);
  }, []);

  // Split at last paragraph break before settled position
  const safeLen = Math.min(settledLen, content.length);
  const lastBreak = content.lastIndexOf("\n\n", safeLen);
  const boundary = lastBreak > 0 ? lastBreak + 2 : 0;

  const stablePart = content.slice(0, boundary);
  const tailPart = content.slice(boundary);

  // Memoize so React sees stable component references and can reconcile children
  const tailComponents: any = useMemo(
    () => ({
      p: ({ children, node, ...props }: any) => (
        <p {...props}>{animateText(children)}</p>
      ),
      li: ({ children, node, ...props }: any) => (
        <li {...props}>{animateText(children)}</li>
      ),
      h1: ({ children, node, ...props }: any) => (
        <h1 {...props}>{animateText(children)}</h1>
      ),
      h2: ({ children, node, ...props }: any) => (
        <h2 {...props}>{animateText(children)}</h2>
      ),
      h3: ({ children, node, ...props }: any) => (
        <h3 {...props}>{animateText(children)}</h3>
      ),
      td: ({ children, node, ...props }: any) => (
        <td {...props}>{animateText(children)}</td>
      ),
    }),
    [],
  );

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      {stablePart && (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{stablePart}</ReactMarkdown>
      )}
      {tailPart && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={tailComponents}>
          {tailPart}
        </ReactMarkdown>
      )}
    </div>
  );
}
