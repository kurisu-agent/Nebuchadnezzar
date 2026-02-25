"use client";

import { useCallback, useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { css } from "@codemirror/lang-css";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

function getLang(filePath: string): Extension[] {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return [javascript({ typescript: true, jsx: ext === "tsx" })];
    case "js":
    case "jsx":
    case "mjs":
      return [javascript({ jsx: ext === "jsx" })];
    case "json":
    case "jsonl":
      return [json()];
    case "md":
      return [markdown()];
    case "css":
      return [css()];
    default:
      return [];
  }
}

const mobileExtensions = [
  EditorView.lineWrapping,
  EditorView.theme({
    "&": { fontSize: "14px" },
    ".cm-content": { padding: "8px 0" },
    ".cm-gutters": { minWidth: "32px" },
  }),
];

interface FileEditorProps {
  filePath: string;
  onDirty?: (dirty: boolean) => void;
  onSave?: () => void;
  saveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

export default function FileEditor({
  filePath,
  onDirty,
  saveRef,
}: FileEditorProps) {
  const [content, setContent] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to read file");
        }
        return res.json();
      })
      .then((data) => {
        setContent(data.content);
        setSavedContent(data.content);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filePath]);

  const handleChange = useCallback(
    (value: string) => {
      setContent(value);
      onDirty?.(value !== savedContent);
    },
    [savedContent, onDirty],
  );

  const save = useCallback(async () => {
    if (content === null || content === savedContent) return;
    setSaving(true);
    try {
      const res = await fetch("/api/files/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }
      setSavedContent(content);
      onDirty?.(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [content, savedContent, filePath, onDirty]);

  // Expose save function to parent
  useEffect(() => {
    if (saveRef) saveRef.current = save;
    return () => {
      if (saveRef) saveRef.current = null;
    };
  }, [save, saveRef]);

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <span className="loading loading-dots loading-md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex-1">
        <div className="alert alert-error text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden relative">
      {saving && (
        <div className="absolute top-2 right-2 z-10">
          <span className="loading loading-spinner loading-xs" />
        </div>
      )}
      <CodeMirror
        value={content ?? ""}
        onChange={handleChange}
        theme={oneDark}
        extensions={[...getLang(filePath), ...mobileExtensions]}
        height="100%"
        className="h-full [&_.cm-editor]:!h-full"
      />
    </div>
  );
}
