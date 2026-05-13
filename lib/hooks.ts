"use client";

import { useSyncExternalStore } from "react";
import {
  loadScreenings,
  loadSubmissions,
  subscribeStorage,
} from "./storage";
import type { Screening, Submission } from "./types";

/**
 * `useSyncExternalStore` against localStorage.
 *
 * IMPORTANT INVARIANT:
 *   The snapshot function MUST return a referentially-stable value between
 *   calls until the external source actually changes. `JSON.parse` returns a
 *   fresh array every time, so we cache the parsed value at module level and
 *   only refresh it when our storage layer emits a change event.
 *
 *   Without this cache, useSyncExternalStore would see "a new array" on every
 *   render and re-enter render in an infinite loop.
 */

let screeningsCache: Screening[] = [];
let submissionsCache: Submission[] = [];
const storeListeners = new Set<() => void>();
let initialized = false;

function refreshFromStorage() {
  screeningsCache = loadScreenings();
  submissionsCache = loadSubmissions();
  storeListeners.forEach((l) => l());
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  // First read after the page boots — synchronous, fine to do at module
  // evaluation time on the client (Next.js bundles this client-only).
  screeningsCache = loadScreenings();
  submissionsCache = loadSubmissions();
  subscribeStorage(refreshFromStorage);
}

function subscribe(cb: () => void): () => void {
  ensureInitialized();
  storeListeners.add(cb);
  return () => {
    storeListeners.delete(cb);
  };
}

const EMPTY_SCREENINGS: Screening[] = [];
const EMPTY_SUBMISSIONS: Submission[] = [];

function getScreeningsSnapshot(): Screening[] {
  return screeningsCache;
}
function getSubmissionsSnapshot(): Submission[] {
  return submissionsCache;
}
function getServerScreenings(): Screening[] {
  return EMPTY_SCREENINGS;
}
function getServerSubmissions(): Submission[] {
  return EMPTY_SUBMISSIONS;
}

export function useScreenings(): Screening[] {
  return useSyncExternalStore(
    subscribe,
    getScreeningsSnapshot,
    getServerScreenings
  );
}

export function useSubmissions(): Submission[] {
  return useSyncExternalStore(
    subscribe,
    getSubmissionsSnapshot,
    getServerSubmissions
  );
}

/** True after the component has mounted on the client. */
const noopSubscribe = () => () => {};
const trueSnapshot = () => true;
const falseSnapshot = () => false;
export function useMounted() {
  return useSyncExternalStore(noopSubscribe, trueSnapshot, falseSnapshot);
}

/** Subscribe to media-query matches with SSR-safe defaults. */
export function useMediaQuery(query: string, fallback = false) {
  const subscribeMq = (cb: () => void) => {
    if (typeof window === "undefined") return () => {};
    const mq = window.matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
  const getSnapshot = () =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : fallback;
  const getServerSnapshot = () => fallback;
  return useSyncExternalStore(subscribeMq, getSnapshot, getServerSnapshot);
}
