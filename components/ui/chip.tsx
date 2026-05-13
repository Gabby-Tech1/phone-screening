import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Status chip — low-saturation background, high-saturation text per design.md.
 * Used for job status pills, applicant status, response-type tags, etc.
 */
type Tone = "neutral" | "success" | "warning" | "error" | "info" | "secondary";

const toneStyles: Record<Tone, string> = {
  neutral:
    "bg-surface-container-highest text-on-surface-variant border-outline-variant/60",
  success:
    "bg-emerald-100 text-emerald-800 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  warning:
    "bg-amber-100 text-amber-800 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  error:
    "bg-red-100 text-red-800 border-red-200/60 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
  info: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
  secondary:
    "bg-secondary-fixed text-on-secondary-fixed-variant border-secondary-fixed-dim/60",
};

interface ChipProps {
  tone?: Tone;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}

export function Chip({
  tone = "neutral",
  size = "sm",
  className,
  children,
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-xs rounded-md border font-semibold uppercase tracking-wider",
        size === "sm"
          ? "px-sm py-[2px] text-label-sm"
          : "px-md py-xs text-label-md",
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
