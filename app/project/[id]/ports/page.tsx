"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Globe, ArrowsClockwise, Copy, Check } from "@phosphor-icons/react";

type PortInfo = { port: number; process: string };

/** Nebuchadnezzar ports — excluded from display */
const NEB_PORTS = new Set([3000, 3210, 3211, 6790, 6791, 30003]);

export default function ProjectPortsPage() {
  const { id } = useParams<{ id: string }>();
  const project = useQuery(api.projects.get, {
    id: id as Id<"projects">,
  });
  const storedTemplate = useQuery(api.settings.get, {
    key: "portUrlTemplate",
  });

  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [copiedPort, setCopiedPort] = useState<number | null>(null);

  const scanPorts = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/ports");
      const data = await res.json();
      setPorts(data.ports ?? []);
    } catch {
      // ignore
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    scanPorts();
  }, [scanPorts]);

  useEffect(() => {
    const interval = setInterval(scanPorts, 10_000);
    return () => clearInterval(interval);
  }, [scanPorts]);

  const resolveUrl = (port: number) => {
    if (!storedTemplate) return `http://localhost:${port}`;
    return storedTemplate.replace("{port}", String(port));
  };

  const copyUrl = (port: number) => {
    navigator.clipboard.writeText(resolveUrl(port));
    setCopiedPort(port);
    setTimeout(() => setCopiedPort(null), 2000);
  };

  // Active ports that belong to this project
  const projectPorts = useMemo(() => {
    const linked = new Set(project?.ports ?? []);
    return ports.filter((p) => linked.has(p.port) && !NEB_PORTS.has(p.port));
  }, [project?.ports, ports]);

  if (!project) return null;

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3 gap-2">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-sm opacity-60 gap-2">
              <Globe size={16} weight="duotone" />
              Ports
            </h2>
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

          {projectPorts.length === 0 ? (
            <p className="text-sm text-base-content/30 py-1">
              {scanning ? "Scanning..." : "No active ports."}
            </p>
          ) : (
            <ul className="list">
              {projectPorts.map((p) => (
                <li key={p.port} className="list-row items-center">
                  <div className="list-col-grow">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold">
                        :{p.port}
                      </span>
                      {p.process && (
                        <span className="badge badge-ghost badge-xs">
                          {p.process}
                        </span>
                      )}
                    </div>
                    <div className="text-xs opacity-40 font-mono truncate">
                      {resolveUrl(p.port)}
                    </div>
                  </div>
                  <button
                    onClick={() => copyUrl(p.port)}
                    className="btn btn-ghost btn-sm btn-square active:bg-base-300"
                    aria-label="Copy URL"
                  >
                    {copiedPort === p.port ? (
                      <Check size={14} weight="bold" className="text-success" />
                    ) : (
                      <Copy size={14} weight="bold" className="opacity-50" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
