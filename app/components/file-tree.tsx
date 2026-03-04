"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getIcon } from "material-file-icons";
import {
  FolderSimple,
  FolderOpen,
  CaretRight,
  CaretDown,
} from "@phosphor-icons/react";

// ─── Types ───────────────────────────────────────────────────

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

interface FileTreeProps {
  rootPath: string;
  onSelectFile: (path: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

// ─── FileIcon (material-file-icons) ─────────────────────────

function FileIcon({ filename }: { filename: string }) {
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
      style={{ width: 16, height: 16 }}
      dangerouslySetInnerHTML={{ __html: getIcon(filename).svg }}
    />
  );
}

// ─── Recursive TreeNodeItem ─────────────────────────────────

interface TreeNodeItemProps {
  node: TreeNode;
  selectedPath: string | null;
  openDirs: Set<string>;
  loadingDirs: Set<string>;
  onToggleDir: (path: string) => void;
  onSelectFile: (path: string) => void;
}

function TreeNodeItem({
  node,
  selectedPath,
  openDirs,
  loadingDirs,
  onToggleDir,
  onSelectFile,
}: TreeNodeItemProps) {
  const isDir = node.type === "directory";
  const isOpen = openDirs.has(node.path);
  const isLoading = loadingDirs.has(node.path);
  const isSelected = node.path === selectedPath;

  if (isDir) {
    return (
      <li>
        <span
          className={`menu-dropdown-toggle ${isOpen ? "menu-dropdown-show" : ""} active:bg-base-300 relative pl-6`}
          onClick={() => onToggleDir(node.path)}
        >
          <span className="absolute left-1 top-1/2 -translate-y-1/2">
            {isLoading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : isOpen ? (
              <CaretDown size={12} weight="bold" className="opacity-50" />
            ) : (
              <CaretRight size={12} weight="bold" className="opacity-50" />
            )}
          </span>
          {isOpen ? (
            <FolderOpen
              size={16}
              weight="duotone"
              className="shrink-0 text-warning"
            />
          ) : (
            <FolderSimple
              size={16}
              weight="duotone"
              className="shrink-0 text-warning"
            />
          )}
          <span className="truncate">{node.name}</span>
        </span>
        <ul className={`menu-dropdown ${isOpen ? "menu-dropdown-show" : ""}`}>
          {node.children?.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              selectedPath={selectedPath}
              openDirs={openDirs}
              loadingDirs={loadingDirs}
              onToggleDir={onToggleDir}
              onSelectFile={onSelectFile}
            />
          ))}
        </ul>
      </li>
    );
  }

  return (
    <li>
      <a
        className={`active:bg-base-300 ${isSelected ? "menu-active" : ""}`}
        onClick={() => onSelectFile(node.path)}
      >
        <FileIcon filename={node.name} />
        <span className="truncate">{node.name}</span>
        {node.size > 0 && (
          <span className="ml-auto text-xs opacity-40 shrink-0">
            {formatSize(node.size)}
          </span>
        )}
      </a>
    </li>
  );
}

// ─── Main FileTree Component ────────────────────────────────

export default function FileTree({ rootPath, onSelectFile }: FileTreeProps) {
  const [data, setData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDirs, setOpenDirs] = useState<Set<string>>(new Set());
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const loadedDirs = useRef<Set<string>>(new Set());
  const openDirsRef = useRef(openDirs);

  useEffect(() => {
    openDirsRef.current = openDirs;
  }, [openDirs]);

  useEffect(() => {
    fetchDir(rootPath)
      .then((entries) => {
        setData(entriesToNodes(entries));
        loadedDirs.current.add(rootPath);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [rootPath]);

  const handleToggleDir = useCallback(async (dirPath: string) => {
    if (openDirsRef.current.has(dirPath)) {
      setOpenDirs((prev) => {
        const next = new Set(prev);
        next.delete(dirPath);
        return next;
      });
      return;
    }

    if (!loadedDirs.current.has(dirPath)) {
      setLoadingDirs((prev) => new Set(prev).add(dirPath));
      try {
        const entries = await fetchDir(dirPath);
        loadedDirs.current.add(dirPath);
        setData((prev) => {
          const update = (nodes: TreeNode[]): TreeNode[] =>
            nodes.map((n) => {
              if (n.id === dirPath) {
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
        return;
      } finally {
        setLoadingDirs((prev) => {
          const next = new Set(prev);
          next.delete(dirPath);
          return next;
        });
      }
    }

    setOpenDirs((prev) => new Set(prev).add(dirPath));
  }, []);

  const handleSelectFile = useCallback(
    (path: string) => {
      setSelectedPath(path);
      onSelectFile(path);
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
    <div className="flex-1 overflow-y-auto">
      <ul className="menu menu-sm w-full">
        {data.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            selectedPath={selectedPath}
            openDirs={openDirs}
            loadingDirs={loadingDirs}
            onToggleDir={handleToggleDir}
            onSelectFile={handleSelectFile}
          />
        ))}
      </ul>
    </div>
  );
}
