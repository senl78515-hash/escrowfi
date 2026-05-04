"use client";

import { useI18n } from "@/i18n/context";
import clsx from "clsx";

type Status = "active" | "delivered" | "completed" | "disputed" | "cancelled";

const config: Record<
  Status,
  { bg: string; text: string; border: string; dot: string }
> = {
  active: {
    bg: "bg-accent-dim",
    text: "text-accent",
    border: "border-accent/30",
    dot: "bg-accent",
  },
  delivered: {
    bg: "bg-warning-dim",
    text: "text-warning",
    border: "border-warning/30",
    dot: "bg-warning",
  },
  completed: {
    bg: "bg-success-dim",
    text: "text-success",
    border: "border-success/30",
    dot: "bg-success",
  },
  disputed: {
    bg: "bg-danger-dim",
    text: "text-danger",
    border: "border-danger/30",
    dot: "bg-danger animate-pulse",
  },
  cancelled: {
    bg: "bg-text-faint/10",
    text: "text-text-faint",
    border: "border-text-faint/20",
    dot: "bg-text-faint",
  },
};

interface Props {
  status: Status;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: Props) {
  const { t } = useI18n();
  const c = config[status];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        c.bg, c.text, c.border,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs"
      )}
    >
      <span className={clsx("w-1.5 h-1.5 rounded-full", c.dot)} />
      {t.status[status]}
    </span>
  );
}
