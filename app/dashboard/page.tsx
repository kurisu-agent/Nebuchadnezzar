"use client";

import packageJson from "@/package.json";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowsClockwise,
  DownloadSimple,
  GitCommit,
  Clock,
} from "@phosphor-icons/react";

export default function AboutPage() {
  const updateInfo = useQuery(api.updates.getLatest);
  const createSession = useMutation(api.sessions.create);
  const sendMessage = useMutation(api.messages.send);
  const checkNow = useAction(api.updates.checkNow);
  const router = useRouter();

  const [localVersion, setLocalVersion] = useState<{
    sha: string;
    message: string;
    date: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchLocalVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/version");
      if (res.ok) {
        setLocalVersion(await res.json());
      }
    } catch (err) {
      console.error("[version fetch]", err);
    }
  }, []);

  useEffect(() => {
    fetchLocalVersion();
  }, [fetchLocalVersion]);

  const hasUpdate =
    updateInfo && localVersion && updateInfo.remoteSha !== localVersion.sha;

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await checkNow();
      await fetchLocalVersion();
    } catch (err) {
      console.error("[check now]", err);
    }
    setChecking(false);
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const sessionId = await createSession({
        title: "Update Nebuchadnezzar",
      });
      await sendMessage({
        sessionId,
        content:
          "Pull the latest changes from the remote repository. Run: git pull origin master. After pulling, summarize what changed based on the new commits.",
      });
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      router.push(`/session/${sessionId}`);
    } catch (err) {
      console.error("[update]", err);
      setUpdating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      {/* Update Banner */}
      {hasUpdate && (
        <div className="alert alert-info shadow-sm">
          <DownloadSimple size={20} weight="duotone" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Update Available</p>
            <p className="text-xs opacity-70 truncate">
              {updateInfo.remoteMessage}
            </p>
          </div>
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="btn btn-sm btn-primary"
          >
            {updating ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              "Update"
            )}
          </button>
        </div>
      )}

      {/* App Info Card */}
      <div className="card bg-base-200 card-sm">
        <div className="card-body py-3 gap-2">
          <div className="flex justify-between items-center">
            <span className="text-base-content/70 text-sm">Version</span>
            <span className="badge badge-ghost badge-sm">
              {packageJson.version}
            </span>
          </div>
          {localVersion && (
            <div className="flex justify-between items-center">
              <span className="text-base-content/70 text-sm flex items-center gap-1">
                <GitCommit size={14} weight="duotone" />
                Local
              </span>
              <span className="text-xs font-mono opacity-60">
                {localVersion.sha.slice(0, 7)}
              </span>
            </div>
          )}
          {updateInfo && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-base-content/70 text-sm flex items-center gap-1">
                  <GitCommit size={14} weight="duotone" />
                  Remote
                </span>
                <span className="text-xs font-mono opacity-60">
                  {updateInfo.remoteSha.slice(0, 7)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-base-content/70 text-sm flex items-center gap-1">
                  <Clock size={14} weight="duotone" />
                  Last checked
                </span>
                <span className="text-xs opacity-60">
                  {new Date(updateInfo.checkedAt).toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Check Now Button */}
      <button
        onClick={handleCheckNow}
        disabled={checking}
        className="btn btn-ghost btn-sm gap-1.5 self-center"
      >
        {checking ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <ArrowsClockwise size={16} weight="bold" />
        )}
        Check for updates
      </button>
    </div>
  );
}
