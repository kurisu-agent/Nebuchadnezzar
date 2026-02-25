"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Tree, NodeRendererProps } from "react-arborist";
import {
  FolderSimple,
  FolderOpen,
  File,
  FileCode,
  FileTs,
  FileJs,
  FileCss,
  FileMd,
  CaretRight,
  CaretDown,
} from "@phosphor-icons/react";

export interface FileEntry {
  name: string;
  type: "file" | "directory";
  path: string;
  size: number;
  modified: number;
}

interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  children?: TreeNode[];
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  const size = 16;
  const weight = "duotone" as const;
  switch (ext) {
    case "ts":
    case "tsx":
      return <FileTs size={size} weight={weight} className="text-info" />;
    case "js":
    case "jsx":
    case "mjs":
      return <FileJs size={size} weight={weight} className="text-warning" />;
    case "css":
      return <FileCss size={size} weight={weight} className="text-secondary" />;
    case "json":
    case "jsonl":
      return <FileCode size={size} weight={weight} className="text-success" />;
    case "md":
      return <FileMd size={size} weight={weight} className="text-accent" />;
    default:
      return <File size={size} weight={weight} className="opacity-60" />;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Node({ node, style }: NodeRendererProps<TreeNode>) {
  const isDir = node.data.type === "directory";

  return (
    <div
      style={style}
      className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none
        active:bg-base-300 transition-colors rounded-md
        ${node.isSelected ? "bg-base-300" : ""}`}
      onClick={(e) => node.handleClick(e)}
    >
      {isDir ? (
        <>
          {node.isOpen ? (
            <CaretDown size={12} weight="bold" className="shrink-0 opacity-50" />
          ) : (
            <CaretRight size={12} weight="bold" className="shrink-0 opacity-50" />
          )}
          {node.isOpen ? (
            <FolderOpen size={16} weight="duotone" className="shrink-0 text-warning" />
          ) : (
            <FolderSimple size={16} weight="duotone" className="shrink-0 text-warning" />
          )}
        </>
      ) : (
        <>
          <span className="w-3 shrink-0" />
          {fileIcon(node.data.name)}
        </>
      )}
      <span className="truncate text-sm">{node.data.name}</span>
      {!isDir && node.data.size > 0 && (
        <span className="ml-auto text-xs opacity-40 shrink-0">
          {formatSize(node.data.size)}
        </span>
      )}
    </div>
  );
}

async function fetchDir(dirPath: string): Promise<FileEntry[]> {
  const res = await fetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
  if (!res.ok) throw new Error("Failed to load directory");
  const data = await res.json();
  return data.entries;
}

function entriesToNodes(entries: FileEntry[]): TreeNode[] {
  return entries.map((e) => ({
    id: e.path,
    name: e.name,
    path: e.path,
    type: e.type,
    size: e.size,
    children: e.type === "directory" ? [] : undefined,
  }));
}

interface FileTreeProps {
  rootPath: string;
  onSelectFile: (path: string) => void;
}

export default function FileTree({ rootPath, onSelectFile }: FileTreeProps) {
  const [data, setData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(400);

  // Track which directories have been loaded
  const loadedDirs = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchDir(rootPath)
      .then((entries) => {
        setData(entriesToNodes(entries));
        loadedDirs.current.add(rootPath);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [rootPath]);

  // Measure container height for virtualization
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const handleToggle = useCallback(
    async (id: string) => {
      if (loadedDirs.current.has(id)) return;

      try {
        const entries = await fetchDir(id);
        loadedDirs.current.add(id);
        setData((prev) => {
          const update = (nodes: TreeNode[]): TreeNode[] =>
            nodes.map((n) => {
              if (n.id === id) {
                return { ...n, children: entriesToNodes(entries) };
              }
              if (n.children) {
                return { ...n, children: update(n.children) };
              }
              return n;
            });
          return update(prev);
        });
      } catch {
        // ignore load errors on expand
      }
    },
    [],
  );

  const handleActivate = useCallback(
    (node: { data: TreeNode }) => {
      if (node.data.type === "file") {
        onSelectFile(node.data.path);
      }
    },
    [onSelectFile],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="loading loading-dots loading-md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="alert alert-error text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden">
      <Tree<TreeNode>
        data={data}
        width="100%"
        height={height}
        rowHeight={36}
        indent={16}
        openByDefault={false}
        disableDrag={true}
        disableDrop={true}
        disableEdit={true}
        disableMultiSelection={true}
        onToggle={handleToggle}
        onActivate={handleActivate}
      >
        {Node}
      </Tree>
    </div>
  );
}
