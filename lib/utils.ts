import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn` — the conventional Tailwind class-merge helper.
 * Lets us conditionally compose classes without worrying about conflicts
 * (later utility wins, the merge dedupes).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Two-character initials for an avatar bubble, e.g. "Jane Doe" → "JD". */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic-ish color seed for avatars so the same name keeps its color. */
export function avatarTone(seed: string): "primary" | "tertiary" | "neutral" {
  const code = seed.charCodeAt(0) || 0;
  const m = code % 3;
  if (m === 0) return "primary";
  if (m === 1) return "tertiary";
  return "neutral";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(s: string) {
  return EMAIL_RE.test(s.trim());
}

/** Format an ISO timestamp into something a recruiter can scan at a glance. */
export function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** "2 minutes ago" / "yesterday" / "Oct 14" — small util for activity rows. */
export function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return "yesterday";
  if (day < 7) return `${day}d ago`;
  return formatDate(iso);
}

/** Generate a sortable, URL-safe id. crypto.randomUUID when available. */
export function uid(prefix = "id") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Resolve to a fully-qualified screening URL the recruiter can copy. */
export function buildShareLink(jobId: string) {
  if (typeof window === "undefined") return `/screening/${jobId}`;
  return `${window.location.origin}/screening/${jobId}`;
}
