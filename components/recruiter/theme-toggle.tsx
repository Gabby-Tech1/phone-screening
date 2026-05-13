"use client";

import { useTheme } from "@/components/theme-provider";
import { Icon } from "@/components/ui/icon";
import { useMounted } from "@/lib/hooks";

/**
 * Sun/moon icon toggle. We render an empty spacer until mounted to avoid
 * the icon mismatch between SSR ("light") and the post-bootstrap state.
 */
export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const mounted = useMounted();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        mounted ? `Switch to ${resolved === "dark" ? "light" : "dark"} mode` : "Toggle theme"
      }
      className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-2 focus-visible:outline-secondary"
    >
      {mounted ? (
        <Icon name={resolved === "dark" ? "light_mode" : "dark_mode"} />
      ) : (
        <span className="h-6 w-6" aria-hidden />
      )}
    </button>
  );
}
