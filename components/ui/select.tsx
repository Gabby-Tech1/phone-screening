"use client";

import { cn } from "@/lib/utils";
import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { Icon } from "./icon";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/** Native <select> styled to match the Stitch field aesthetic. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, className, id: idProp, children, ...rest },
  ref
) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <div className="space-y-sm">
      {label && (
        <label
          htmlFor={id}
          className="flex items-center gap-xs text-label-md text-on-surface"
        >
          {label}
          {required && <span className="text-error">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn(
            "h-12 w-full appearance-none rounded-lg border border-outline-variant",
            "bg-surface-container-lowest text-on-surface text-body-md",
            "pl-md pr-xl py-sm outline-none transition-all duration-150",
            "focus:border-secondary focus:ring-2 focus:ring-secondary/30",
            "disabled:opacity-50",
            error && "border-error focus:border-error focus:ring-error/30",
            className
          )}
          {...rest}
        >
          {children}
        </select>
        <Icon
          name="keyboard_arrow_down"
          size={20}
          className="pointer-events-none absolute right-md top-1/2 -translate-y-1/2 text-outline"
        />
      </div>
      {error ? (
        <p className="text-label-sm text-error">{error}</p>
      ) : hint ? (
        <p className="text-label-sm text-on-surface-variant">{hint}</p>
      ) : null}
    </div>
  );
});
