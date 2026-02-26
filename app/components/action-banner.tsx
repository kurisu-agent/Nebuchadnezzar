"use client";

import type { ComponentType, ReactNode } from "react";

type BannerVariant = "info" | "success" | "warning" | "error";

const variantStyles: Record<BannerVariant, { bg: string; btn: string }> = {
  info: { bg: "bg-info/10 border-info/20", btn: "btn-info" },
  success: { bg: "bg-success/10 border-success/20", btn: "btn-success" },
  warning: { bg: "bg-warning/10 border-warning/20", btn: "btn-warning" },
  error: { bg: "bg-error/10 border-error/20", btn: "btn-error" },
};

export function ActionBanner({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  loading,
  variant = "info",
}: {
  icon: ComponentType<{ size?: number; weight?: string; className?: string }>;
  title: string;
  description?: ReactNode;
  actionLabel: string;
  onAction: () => void;
  loading?: boolean;
  variant?: BannerVariant;
}) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`rounded-box border p-3 flex items-center gap-3 ${styles.bg}`}
    >
      <Icon size={20} weight="duotone" className="shrink-0 opacity-70" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {description && (
          <p className="text-xs opacity-60 truncate">{description}</p>
        )}
      </div>
      <button
        onClick={onAction}
        disabled={loading}
        className={`btn btn-sm shrink-0 ${styles.btn}`}
      >
        {loading ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          actionLabel
        )}
      </button>
    </div>
  );
}
