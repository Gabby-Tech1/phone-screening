import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0..1 */
  value: number;
  className?: string;
  /** When true, renders the candidate-flow style: segments + completed/active/upcoming colors. */
  segmented?: { total: number; current: number };
}

/** Linear progress indicator. Two flavors: smooth bar and segmented step bar. */
export function ProgressBar({ value, className, segmented }: ProgressBarProps) {
  if (segmented) {
    const { total, current } = segmented;
    return (
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        className={cn("flex w-full items-center gap-xs", className)}
      >
        {Array.from({ length: total }).map((_, i) => {
          const state =
            i < current ? "completed" : i === current ? "active" : "upcoming";
          return (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                state === "completed" && "bg-secondary",
                state === "active" && "bg-secondary-container",
                state === "upcoming" && "bg-surface-container-highest"
              )}
            />
          );
        })}
      </div>
    );
  }
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-secondary transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
