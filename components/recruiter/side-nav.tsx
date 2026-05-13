"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: string;
  href: string;
  /** Optional matcher; defaults to startsWith(href). */
  match?: (pathname: string) => boolean;
}

const items: NavItem[] = [
  {
    label: "Dashboard",
    icon: "dashboard",
    href: "/dashboard",
    match: (p) => p === "/" || p.startsWith("/dashboard"),
  },
  {
    label: "Jobs",
    icon: "work",
    href: "/jobs",
    match: (p) => p === "/jobs" || p.startsWith("/jobs/"),
  },
  { label: "Screenings", icon: "phone_in_talk", href: "/screenings" },
  { label: "Candidates", icon: "groups", href: "/candidates" },
  { label: "Settings", icon: "settings", href: "/settings" },
];

/**
 * Persistent left rail used on every recruiter page (lg+).
 * Matches the Stitch design: brand mark, primary nav, sticky footer CTA + help/logout.
 */
export function SideNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-outline-variant bg-surface-container-low py-md lg:flex">
      {/* Brand */}
      <div className="px-lg pb-xl">
        <Link href="/jobs" className="block">
          <h1 className="text-headline-sm font-bold tracking-tight text-on-surface">
            Remotown
          </h1>
          <p className="text-label-sm text-on-surface-variant">Recruiter Portal</p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-xs px-sm">
        {items.map((it) => {
          const active = it.match ? it.match(pathname) : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-md rounded-lg px-md py-sm text-body-md transition-colors duration-150",
                active
                  ? "border-r-4 border-secondary bg-surface-container-highest font-semibold text-secondary"
                  : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
              )}
            >
              <Icon name={it.icon} fill={active ? 1 : 0} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto space-y-xs border-t border-outline-variant px-sm pt-md">
        <Button
          variant="secondary"
          fullWidth
          leadingIcon={<Icon name="add" />}
          className="mb-md text-white"
          onClick={() => {
            // Drive recruiter into the create flow from anywhere.
            // We target the most-recently-created job's creation URL fallback
            // to /jobs (which is also where Create Phone Screening lives).
            router.push("/jobs?create=1");
          }}
        >
          Create Screening
        </Button>
        <Link
          href="#"
          className="flex items-center gap-md rounded-lg px-md py-sm text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
        >
          <Icon name="help" />
          <span>Help</span>
        </Link>
        <Link
          href="#"
          className="flex items-center gap-md rounded-lg px-md py-sm text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
        >
          <Icon name="logout" />
          <span>Logout</span>
        </Link>
      </div>
    </aside>
  );
}
