import { SideNav } from "./side-nav";
import { TopBar } from "./top-bar";
import { BottomNav } from "./bottom-nav";
import type { ReactNode } from "react";

/**
 * Layout shell for every authenticated recruiter route.
 *
 * Composition contract:
 *   <RecruiterShell>
 *     <SomeRecruiterPage />
 *   </RecruiterShell>
 *
 * The page itself just renders its content — the shell handles
 * navigation chrome, max-width container, mobile bottom nav, and bottom
 * padding so the floating nav never covers content.
 */
export function RecruiterShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <SideNav />
      <div className="flex w-full flex-1 flex-col lg:ml-64">
        <TopBar />
        <main className="flex-1 pb-24 lg:pb-0">
          <div className="mx-auto w-full max-w-container-max p-gutter">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
