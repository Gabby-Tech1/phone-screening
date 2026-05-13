"use client";

/**
 * localStorage gateway with safe SSR semantics.
 *
 *   - Reads always survive `window === undefined` (returns the empty default).
 *   - Writes notify a single `storage-changed` event so React hooks can refresh
 *     without round-tripping through the native `storage` event (which only
 *     fires across tabs, not within the same one).
 *
 * Two collections live under stable keys: screenings (recruiter-authored
 * question sets) and submissions (candidate-authored answers). Both are
 * arrays-of-objects, JSON-serialized.
 */

import type { Screening, Submission } from "./types";

export const STORAGE_KEYS = {
  screenings: "aihrly_screenings",
  submissions: "aihrly_submissions",
  theme: "remotown.theme",
} as const;

const CHANGE_EVENT = "remotown:storage-changed";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
  } catch {
    /* quota or private mode — fail soft */
  }
}

/* ---------- Screenings ---------- */

export function loadScreenings(): Screening[] {
  return read<Screening[]>(STORAGE_KEYS.screenings, []);
}

export function saveScreening(screening: Screening) {
  const all = loadScreenings();
  const next = [...all.filter((s) => s.id !== screening.id), screening];
  write(STORAGE_KEYS.screenings, next);
}

export function deleteScreening(id: string) {
  write(
    STORAGE_KEYS.screenings,
    loadScreenings().filter((s) => s.id !== id)
  );
}

export function findScreeningByJob(jobId: string): Screening | undefined {
  // Most-recent wins if a job has multiple drafts.
  return loadScreenings()
    .filter((s) => s.jobId === jobId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/* ---------- Submissions ---------- */

export function loadSubmissions(): Submission[] {
  return read<Submission[]>(STORAGE_KEYS.submissions, []);
}

export function saveSubmission(submission: Submission) {
  const all = loadSubmissions();
  write(STORAGE_KEYS.submissions, [...all, submission]);
}

export function findSubmissionsByJob(jobId: string): Submission[] {
  return loadSubmissions()
    .filter((s) => s.jobId === jobId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function findSubmissionById(id: string): Submission | undefined {
  return loadSubmissions().find((s) => s.id === id);
}

/* ---------- Subscriptions ----------
 *
 * Components can subscribe and get pinged whenever any storage write happens.
 * We also forward the cross-tab `storage` event so multiple tabs stay in sync.
 */
export function subscribeStorage(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
