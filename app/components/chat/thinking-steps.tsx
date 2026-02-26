"use client";

import { useState } from "react";
import { Brain, Terminal, CaretDown, CaretUp } from "@phosphor-icons/react";

/**
 * Renders a subtle, collapsible list of intermediate thinking/tool steps.
 * Collapsed by default — shows a small summary line. Expands to reveal details.
 */
export function ThinkingSteps({ steps }: { steps: string[] }) {
  const [open, setOpen] = useState(false);

  const thinkingCount = steps.filter((s) => s.startsWith("thinking:")).length;
  const toolCount = steps.filter((s) => s.startsWith("tool:")).length;

  const parts: string[] = [];
  if (thinkingCount > 0) parts.push(`${thinkingCount} thinking`);
  if (toolCount > 0) parts.push(`${toolCount} tool use`);
  const summary = parts.join(", ");

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] opacity-40 active:opacity-60 transition-opacity"
      >
        <Brain size={12} weight="duotone" />
        <span>{summary}</span>
        {open ? (
          <CaretUp size={10} weight="bold" />
        ) : (
          <CaretDown size={10} weight="bold" />
        )}
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col gap-1 text-[11px] opacity-50">
          {steps.map((step, i) => {
            const isThinking = step.startsWith("thinking:");
            const content = step.replace(/^(thinking|tool):/, "");
            return (
              <div key={i} className="flex items-start gap-1.5">
                {isThinking ? (
                  <Brain
                    size={11}
                    weight="duotone"
                    className="shrink-0 mt-0.5"
                  />
                ) : (
                  <Terminal
                    size={11}
                    weight="duotone"
                    className="shrink-0 mt-0.5"
                  />
                )}
                <span
                  className={`${isThinking ? "line-clamp-3" : ""} break-all`}
                >
                  {content}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
