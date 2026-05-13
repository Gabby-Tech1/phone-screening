import type { ReactNode } from "react";
import { RecruiterShell } from "@/components/recruiter/shell";

/**
 * Layout for the recruiter route group. Wraps every recruiter page in the
 * shared `<RecruiterShell>` (side nav + top bar + bottom nav + max-width
 * container) so individual page.tsx files render just their content.
 *
 * Route groups (parenthesized folder names) don't appear in URLs — they only
 * scope layouts and file organization. So `/jobs`, `/screenings`, etc. stay
 * at the same paths they had before this refactor.
 */
export default function RecruiterLayout({ children }: { children: ReactNode }) {
  return <RecruiterShell>{children}</RecruiterShell>;
}
