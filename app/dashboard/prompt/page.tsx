"use client";

import { useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";

const MODELS = [
  { label: "Haiku", value: "haiku" },
  { label: "Sonnet", value: "sonnet" },
  { label: "Opus", value: "opus" },
];

export default function PromptPage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("haiku");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          systemPrompt: systemPrompt.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unknown error");
      } else {
        setResult(data.result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      {/* Prompt input */}
      <div className="card bg-base-200 card-sm">
        <div className="card-body gap-3">
          <textarea
            className="textarea textarea-bordered w-full text-sm"
            rows={4}
            placeholder="Enter your prompt..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handleSubmit();
            }}
          />

          {/* System prompt (collapsible) */}
          <div className="collapse collapse-arrow bg-base-300 rounded-lg">
            <input type="checkbox" />
            <div className="collapse-title text-xs text-base-content/60 py-2 min-h-0">
              System prompt (optional)
            </div>
            <div className="collapse-content px-3 pb-3">
              <textarea
                className="textarea textarea-bordered w-full text-xs"
                rows={2}
                placeholder="Custom system prompt..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2">
            <select
              className="select select-bordered select-sm flex-none"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <div className="flex-1" />

            <button
              className="btn btn-primary btn-sm gap-1"
              onClick={handleSubmit}
              disabled={!prompt.trim() || loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <PaperPlaneTilt size={16} weight="fill" />
              )}
              {loading ? "Running..." : "Send"}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card bg-base-200 card-sm">
          <div className="card-body">
            <p className="text-sm whitespace-pre-wrap">{result}</p>
          </div>
        </div>
      )}
    </div>
  );
}
