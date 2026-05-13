"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { STORAGE_KEYS } from "@/lib/storage";
import type { ThemeMode } from "@/lib/types";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = STORAGE_KEYS.theme;

/* ----------------------------------------------------------------
 * Module-level theme store.
 *
 * We back the provider with a cached snapshot so React's
 * useSyncExternalStore can read referentially-stable values. The store
 * recomputes its cached mode/resolved values exactly once per change event
 * (OS preference flip, manual setMode, cross-tab storage event).
 * ---------------------------------------------------------------- */

let modeCache: ThemeMode = "system";
let resolvedCache: "light" | "dark" = "light";
let initialized = false;
const listeners = new Set<() => void>();

function readMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function computeResolved(m: ThemeMode): "light" | "dark" {
  if (m !== "system") return m;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function refresh() {
  const m = readMode();
  const r = computeResolved(m);
  if (m !== modeCache || r !== resolvedCache) {
    modeCache = m;
    resolvedCache = r;
    listeners.forEach((l) => l());
  }
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  modeCache = readMode();
  resolvedCache = computeResolved(modeCache);
  // OS preference can change at any time — keep "system" mode reactive.
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", refresh);
  window.addEventListener("storage", refresh);
}

function subscribe(cb: () => void): () => void {
  ensureInit();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getMode() {
  return modeCache;
}
function getResolved() {
  return resolvedCache;
}
function getServerMode(): ThemeMode {
  return "system";
}
function getServerResolved(): "light" | "dark" {
  return "light";
}

/**
 * Public Provider. Mode is "light" | "dark" | "system" with a system-preference
 * follower. An inline bootstrap script in `app/layout.tsx` applies the right
 * class to <html> before paint to avoid a flash of incorrect theme.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore(subscribe, getMode, getServerMode);
  const resolved = useSyncExternalStore(
    subscribe,
    getResolved,
    getServerResolved
  );

  // Apply class to <html> whenever the resolved theme changes. This is one of
  // the few places `useEffect` is the right tool — we're writing to the DOM.
  const lastApplied = useRef<string | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (lastApplied.current === resolved) return;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    lastApplied.current = resolved;
  }, [resolved]);

  const setMode = useCallback((m: ThemeMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* private mode / quota — fail soft */
    }
    refresh();
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider />");
  }
  return ctx;
}
