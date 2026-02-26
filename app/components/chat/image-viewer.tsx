"use client";

import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  X,
  ArrowCounterClockwise,
  DownloadSimple,
} from "@phosphor-icons/react";
import { formatFileSize } from "./utils";

/**
 * Full-screen image viewer modal with pinch-to-zoom (contained to image),
 * metadata bar (filename link, size, type, date), and zoom controls.
 */
export function ImageViewer({
  src,
  alt,
  uploadId,
  meta,
  onClose,
}: {
  src: string;
  alt: string;
  uploadId: string;
  meta?: {
    filename: string;
    size: number;
    mimeType: string;
    createdAt: number;
  };
  onClose: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const serveUrl = `/api/uploads/serve?id=${uploadId}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Top bar: close + metadata + actions */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-black/60">
        <button
          onClick={onClose}
          className="btn btn-circle btn-sm btn-ghost text-white opacity-70 active:opacity-100"
          aria-label="Close"
        >
          <X size={20} weight="bold" />
        </button>
        {meta && (
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <a
              href={serveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/90 font-medium truncate link link-hover"
            >
              {meta.filename}
            </a>
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <span>{formatFileSize(meta.size)}</span>
              <span>&middot;</span>
              <span>{meta.mimeType.split("/")[1]?.toUpperCase()}</span>
              <span>&middot;</span>
              <span>
                {new Date(meta.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setRotation((r) => r - 90)}
          className="btn btn-circle btn-sm btn-ghost text-white opacity-50 active:opacity-100"
          aria-label="Rotate"
        >
          <ArrowCounterClockwise size={18} weight="bold" />
        </button>
        <a
          href={serveUrl}
          download={meta?.filename}
          className="btn btn-circle btn-sm btn-ghost text-white opacity-50 active:opacity-100"
          aria-label="Download"
        >
          <DownloadSimple size={18} weight="bold" />
        </a>
      </div>

      {/* Zoomable image area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TransformWrapper
          key={rotation}
          initialScale={1}
          minScale={0.5}
          maxScale={8}
          centerOnInit
          doubleClick={{ mode: "toggle", step: 2 }}
          wheel={{ step: 0.1 }}
          pinch={{ step: 5 }}
        >
          <TransformComponent
            wrapperStyle={{
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <img
              src={src}
              alt={alt}
              style={{ transform: `rotate(${rotation}deg)` }}
              className="select-none transition-transform duration-200"
              draggable={false}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
}
