"use client";

import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Sticky top bar for recruiter pages. Search input is a UI affordance only —
 * the brief doesn't require search to work, so we wire it as a non-functional
 * input that still focuses correctly with a label for screen readers.
 */
export function TopBar() {
  const pathname = usePathname();
  const tabs = [
    { label: "Jobs", href: "/jobs" },
    { label: "Screenings", href: "/screenings" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-container-max items-center justify-between gap-md px-gutter">
        {/* Mobile brand (sidebar is hidden < lg) */}
        <Link href="/jobs" className="lg:hidden">
          <span className="text-headline-sm font-bold text-on-surface">Remotown</span>
        </Link>

        {/* Search */}
        <div className="relative hidden max-w-md flex-1 md:block">
          <label htmlFor="recruiter-search" className="sr-only">
            Search active jobs or candidates
          </label>
          <Icon
            name="search"
            size={20}
            className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            id="recruiter-search"
            type="search"
            placeholder="Search active jobs or candidates…"
            className="h-10 w-full rounded-xl border border-transparent bg-surface-container-low pl-xl pr-md text-body-md text-on-surface placeholder:text-outline outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-md">
          <nav className="hidden items-center gap-lg md:flex" aria-label="Sections">
            {tabs.map((t) => {
              const active =
                t.href === "/jobs"
                  ? pathname === "/jobs" || pathname.startsWith("/jobs/")
                  : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "border-b-2 pb-xs text-label-md transition-colors",
                    active
                      ? "border-secondary font-semibold text-secondary"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <div className="h-6 w-px bg-outline-variant" />
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            <Icon name="notifications" />
          </button>
          <Avatar name="Emma Recruiter" />
        </div>
      </div>
    </header>
  );
}
