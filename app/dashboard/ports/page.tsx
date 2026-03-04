"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Globe,
  ArrowsClockwise,
  ArrowSquareOut,
  Lightning,
  Eye,
  EyeSlash,
  RocketLaunch,
} from "@phosphor-icons/react";

type PortInfo = { port: number; process: string };

/** Nebuchadnezzar ports we display with labels */
const NEB_PORT_LABELS: Record<number, string> = {
  3000: "Dev Server",
  30003: "Production Build",
  3210: "Convex Backend",
};

/** All Nebuchadnezzar ports (visible + internal) — excluded from project/other groups */
const NEB_PORTS = new Set([3000, 3210, 3211, 6790, 6791, 30003]);

export default function PortsPage() {
  const storedTemplate = useQuery(api.settings.get, {
    key: "portUrlTemplate",
  });
  const projects = useQuery(api.projects.list);
  const setSetting = useMutation(api.settings.set);

  const [template, setTemplate] = useState("");
  const [autoTemplate, setAutoTemplate] = useState<string | null>(null);
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Sync stored value into local state
  useEffect(() => {
    if (storedTemplate !== undefined && storedTemplate !== null) {
      setTemplate(storedTemplate);
    }
  }, [storedTemplate]);

  const scanPorts = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/ports");
      const data = await res.json();
      setPorts(data.ports ?? []);
      if (data.autoTemplate) {
        setAutoTemplate(data.autoTemplate);
        if (!storedTemplate && !template) {
          setTemplate(data.autoTemplate);
        }
      }
    } catch {
      // ignore
    } finally {
      setScanning(false);
    }
  }, [storedTemplate, template]);

  useEffect(() => {
    scanPorts();
  }, [scanPorts]);

  useEffect(() => {
    const interval = setInterval(scanPorts, 10_000);
    return () => clearInterval(interval);
  }, [scanPorts]);

  // Build port→project mapping
  const { projectPorts, unlinkedPorts, nebPorts } = useMemo(() => {
    const map = new Map<
      number,
      { id: Id<"projects">; name: string; color: string }
    >();
    if (projects) {
      for (const p of projects) {
        for (const port of p.ports ?? []) {
          map.set(port, { id: p._id, name: p.name, color: p.color });
        }
      }
    }

    // Group active ports by project
    const grouped = new Map<
      string,
      {
        project: { id: Id<"projects">; name: string; color: string };
        ports: PortInfo[];
      }
    >();
    const unlinked: PortInfo[] = [];
    const neb: PortInfo[] = [];

    for (const p of ports) {
      if (NEB_PORTS.has(p.port)) {
        if (NEB_PORT_LABELS[p.port]) neb.push(p);
        continue;
      }
      const proj = map.get(p.port);
      if (proj) {
        const key = proj.id;
        if (!grouped.has(key)) {
          grouped.set(key, { project: proj, ports: [] });
        }
        grouped.get(key)!.ports.push(p);
      } else {
        unlinked.push(p);
      }
    }

    return {
      projectPorts: Array.from(grouped.values()),
      unlinkedPorts: unlinked,
      nebPorts: neb,
    };
  }, [projects, ports]);

  const handleSave = async () => {
    await setSetting({ key: "portUrlTemplate", value: template });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAutoDetect = () => {
    if (autoTemplate) setTemplate(autoTemplate);
  };

  const resolveUrl = (port: number) => {
    if (!template) return `http://localhost:${port}`;
    return template.replace("{port}", String(port));
  };

  const PortRow = ({ p, label }: { p: PortInfo; label?: string }) => (
    <li className="list-row items-center">
      <div className="list-col-grow min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold">:{p.port}</span>
          {label ? (
            <span className="badge badge-ghost badge-xs">{label}</span>
          ) : (
            p.process && (
              <span className="badge badge-ghost badge-xs">{p.process}</span>
            )
          )}
        </div>
        <div className="text-xs opacity-40 font-mono truncate">
          {resolveUrl(p.port)}
        </div>
      </div>
      <a
        href={resolveUrl(p.port)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost btn-sm btn-square active:bg-base-300"
        aria-label="Open in new tab"
      >
        <ArrowSquareOut size={14} weight="bold" className="opacity-50" />
      </a>
    </li>
  );

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      {/* URL Template */}
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <h2 className="card-title text-sm opacity-60 gap-2">
            <Globe size={16} weight="duotone" />
            Port URL Template
          </h2>
          <p className="text-xs opacity-40">
            Template for converting localhost ports to external URLs. Use{" "}
            <code className="text-primary/80">{"{port}"}</code> as placeholder.
          </p>
          <div className="flex flex-col gap-2 mt-1">
            <input
              type="text"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="https://{port}--my-workspace.example.com"
              className="input input-bordered input-sm w-full font-mono text-xs"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="btn btn-primary btn-sm btn-xs"
              >
                {saved ? "Saved!" : "Save"}
              </button>
              {autoTemplate && (
                <button
                  onClick={handleAutoDetect}
                  className="btn btn-ghost btn-sm btn-xs gap-1 opacity-60"
                >
                  <Lightning size={12} weight="bold" />
                  Auto-detect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nebuchadnezzar */}
      {nebPorts.length > 0 && (
        <div className="card bg-base-200 card-sm">
          <div className="card-body py-3">
            <div className="flex items-center gap-2">
              <RocketLaunch size={16} weight="duotone" className="opacity-60" />
              <h2 className="card-title text-sm opacity-60">Nebuchadnezzar</h2>
            </div>
            <ul className="list">
              {nebPorts.map((p) => (
                <PortRow key={p.port} p={p} label={NEB_PORT_LABELS[p.port]} />
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Active Ports — grouped by project */}
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-sm opacity-60 gap-2">
              <Lightning size={16} weight="duotone" />
              Project Ports
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAll(!showAll)}
                className="btn btn-ghost btn-xs btn-square active:bg-base-300"
                aria-label={
                  showAll ? "Show project ports only" : "Show all ports"
                }
              >
                {showAll ? (
                  <EyeSlash size={14} weight="bold" className="opacity-50" />
                ) : (
                  <Eye size={14} weight="bold" className="opacity-50" />
                )}
              </button>
              <button
                onClick={scanPorts}
                disabled={scanning}
                className="btn btn-ghost btn-xs btn-square active:bg-base-300"
                aria-label="Refresh"
              >
                <ArrowsClockwise
                  size={14}
                  weight="bold"
                  className={scanning ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          {projectPorts.length === 0 &&
          (showAll ? unlinkedPorts.length === 0 : true) ? (
            <p className="text-sm text-base-content/30 py-1">
              {scanning
                ? "Scanning..."
                : unlinkedPorts.length > 0
                  ? `No project ports active. ${unlinkedPorts.length} unlinked port${unlinkedPorts.length !== 1 ? "s" : ""} hidden.`
                  : "No active ports found."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Project-grouped ports */}
              {projectPorts.map((group) => (
                <div key={group.project.id}>
                  <div className="flex items-center gap-2 px-1 py-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: group.project.color }}
                    />
                    <span className="text-xs font-medium">
                      {group.project.name}
                    </span>
                  </div>
                  <ul className="list">
                    {group.ports.map((p) => (
                      <PortRow key={p.port} p={p} />
                    ))}
                  </ul>
                </div>
              ))}

              {/* Unlinked ports — only when showAll */}
              {showAll && unlinkedPorts.length > 0 && (
                <div>
                  <div className="px-1 py-1">
                    <span className="text-xs font-medium opacity-40">
                      Other
                    </span>
                  </div>
                  <ul className="list">
                    {unlinkedPorts.map((p) => (
                      <PortRow key={p.port} p={p} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
