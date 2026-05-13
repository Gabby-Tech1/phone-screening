import { cn } from "@/lib/utils";

/**
 * Lightweight loading placeholder. Pair with `aria-busy` on the parent for
 * screen readers when you need a real loading semantic.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-surface-container-high/70",
        className
      )}
    />
  );
}
