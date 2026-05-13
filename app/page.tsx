import { redirect } from "next/navigation";

/**
 * Root route → recruiter dashboard.
 *
 * The brief defines two sides of the app. We treat the recruiter portal as
 * "home" because the candidate side is link-driven (per the spec) — candidates
 * arrive at `/screening/[jobId]` from a copied URL.
 */
export default function Home() {
  redirect("/dashboard");
}
