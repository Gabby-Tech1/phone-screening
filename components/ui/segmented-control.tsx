"use client";

import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

/**
 * Two-or-three option pill toggle. Used for Text/Audio response type,
 * Grid/List view, etc. Pure controlled component.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-lg bg-surface-container p-1",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            type="button"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md font-medium transition-all duration-150 active:scale-[0.97]",
              size === "sm"
                ? "px-md py-xs text-label-sm"
                : "px-md py-sm text-label-md",
              active
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
