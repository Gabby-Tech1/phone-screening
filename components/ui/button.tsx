import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Buttons follow Stitch's Material-3-inspired hierarchy:
 *   primary   → solid black (used for destructive/secondary intent in flow)
 *   secondary → vibrant blue (used for the centerpiece CTA per design.md)
 *   ghost     → tertiary, sits in toolbars and table rows
 *   outline   → bordered, used as a "Cancel" partner to a primary CTA
 *
 * Sizes default to "md" (48px tall pill) which matches the Stitch screenshots.
 */
type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Render a centered spinner and disable interaction. */
  loading?: boolean;
  /** Force full width regardless of size. */
  fullWidth?: boolean;
}

const base =
  "relative inline-flex items-center justify-center gap-sm font-medium select-none " +
  "transition-all duration-150 ease-out active:scale-[0.98] " +
  "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 " +
  "focus-visible:outline-secondary focus-visible:outline-offset-2";

const variants: Record<Variant, string> = {
  secondary:
    "bg-secondary text-white hover:brightness-110 shadow-sm shadow-secondary/20 dark:text-on-secondary",
  primary:
    "bg-primary text-white hover:opacity-90 shadow-sm dark:text-on-primary",
  ghost:
    "bg-transparent text-on-surface hover:bg-surface-container-high",
  outline:
    "bg-surface-container-lowest text-on-surface border border-outline-variant " +
    "hover:bg-surface-container-low",
  danger: "bg-error text-white hover:brightness-110 dark:text-on-error",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-md text-label-md rounded-lg",
  md: "h-11 px-lg text-label-md rounded-lg",
  lg: "h-12 px-xl text-label-md rounded-lg",
  icon: "h-10 w-10 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    leadingIcon,
    trailingIcon,
    loading,
    fullWidth,
    className,
    children,
    disabled,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        loading && "cursor-progress",
        className
      )}
      {...rest}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
      <span
        className={cn(
          "inline-flex items-center gap-sm",
          loading && "invisible"
        )}
      >
        {leadingIcon}
        {children}
        {trailingIcon}
      </span>
    </button>
  );
});

function Spinner() {
  return (
    <span className="flex gap-1.5" aria-hidden>
      <span
        className="loader-dot inline-block h-1.5 w-1.5 rounded-full bg-current"
        style={{ animationDelay: "0s" }}
      />
      <span
        className="loader-dot inline-block h-1.5 w-1.5 rounded-full bg-current"
        style={{ animationDelay: "0.15s" }}
      />
      <span
        className="loader-dot inline-block h-1.5 w-1.5 rounded-full bg-current"
        style={{ animationDelay: "0.3s" }}
      />
    </span>
  );
}
