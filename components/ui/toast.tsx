"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";

/**
 * Minimal toast system. The brief doesn't require a full notification stack —
 * we only need a confirmation for "Link copied" / "Screening saved" moments.
 * Single slot, slides up, auto-dismisses after 2.5s.
 */
type ToastTone = "success" | "info" | "error";
interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, opts?: { tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, opts?: { tone?: ToastTone }) => {
    counter.current += 1;
    const id = counter.current;
    setToast({ id, message, tone: opts?.tone ?? "success" });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 2500);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-xl left-1/2 z-[100] -translate-x-1/2"
      >
        {toast && (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-sm rounded-xl border px-lg py-md shadow-xl",
              "animate-[slideUp_240ms_ease-out]",
              toast.tone === "success" &&
                "border-emerald-200/60 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
              toast.tone === "info" &&
                "border-outline-variant bg-surface-container-lowest text-on-surface",
              toast.tone === "error" &&
                "border-red-200/60 bg-red-50 text-red-900 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
            )}
          >
            <Icon
              name={
                toast.tone === "success"
                  ? "check_circle"
                  : toast.tone === "error"
                    ? "error"
                    : "info"
              }
              fill={1}
            />
            <span className="text-label-md font-medium">{toast.message}</span>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider />");
  return ctx;
}
