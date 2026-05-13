import { cn } from "@/lib/utils";
import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  id?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/**
 * FieldShell renders the label + hint + error chrome, then lets the caller
 * inject its own input/textarea. Keeps Input/Textarea bodies focused on
 * styling rather than accessibility plumbing.
 */
function FieldShell({
  label,
  hint,
  error,
  required,
  id: idProp,
  children,
}: FieldShellProps) {
  const generated = useId();
  const id = idProp ?? generated;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = errorId ?? hintId;

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
      {children(id, describedBy)}
      {error ? (
        <p
          id={errorId}
          className="flex items-center gap-xs text-label-sm text-error"
        >
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-label-sm text-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full bg-surface-container-lowest text-on-surface border border-outline-variant " +
  "rounded-lg px-md py-sm text-body-md outline-none transition-all duration-150 " +
  "placeholder:text-outline " +
  "focus:border-secondary focus:ring-2 focus:ring-secondary/30 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const inputError = "border-error focus:border-error focus:ring-error/30";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, className, id: idProp, ...rest },
  ref
) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      id={idProp}
    >
      {(id, describedBy) => (
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(inputBase, error && inputError, "h-11", className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, hint, error, required, className, id: idProp, rows = 6, ...rest },
    ref
  ) {
    return (
      <FieldShell
        label={label}
        hint={hint}
        error={error}
        required={required}
        id={idProp}
      >
        {(id, describedBy) => (
          <textarea
            ref={ref}
            id={id}
            rows={rows}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            required={required}
            className={cn(
              inputBase,
              "min-h-[120px] resize-y leading-relaxed",
              error && inputError,
              className
            )}
            {...rest}
          />
        )}
      </FieldShell>
    );
  }
);
