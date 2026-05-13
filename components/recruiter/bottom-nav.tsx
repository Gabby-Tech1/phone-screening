"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const items = [
  {
    label: "Home",
    icon: "dashboard",
    href: "/dashboard",
    match: (p: string) => p === "/" || p.startsWith("/dashboard"),
  },
  {
    label: "Jobs",
    icon: "work",
    href: "/jobs",
    match: (p: string) => p === "/jobs" || p.startsWith("/jobs/"),
  },
  { label: "Calls", icon: "phone_in_talk", href: "/screenings" },
  { label: "Profile", icon: "person", href: "/settings" },
];

/** Mobile-only bottom nav. Hidden at lg+ where the side rail takes over. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 z-30 flex w-full justify-around border-t border-outline-variant bg-surface-container-lowest/95 px-md py-xs backdrop-blur-md lg:hidden"
    >
      {items.map((it) => {
        const active = it.match
          ? it.match(pathname)
          : pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-14 min-w-[64px] flex-col items-center justify-center rounded-xl px-md text-on-surface-variant transition-colors",
              active && "bg-secondary-container/10 text-secondary"
            )}
          >
            <Icon name={it.icon} fill={active ? 1 : 0} />
            <span className="text-label-sm">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
