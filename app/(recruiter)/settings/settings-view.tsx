"use client";

import { useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/components/ui/toast";
import { useMounted, useScreenings, useSubmissions } from "@/lib/hooks";
import { STORAGE_KEYS } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/lib/types";

/**
 * Settings page. Everything that affects the local environment lives here:
 *   - Profile (UI-only, non-persistent placeholder)
 *   - Appearance (theme toggle: light / dark / system)
 *   - Notification preferences (UI-only)
 *   - Data & Storage — danger zone with a "Clear demo data" button that wipes
 *     localStorage screenings and submissions.
 */
export function SettingsView() {
  const mounted = useMounted();
  const { mode, setMode, resolved } = useTheme();
  const { show } = useToast();
  const screenings = useScreenings();
  const submissions = useSubmissions();

  // Mocked profile fields — kept in local state to make the inputs feel real.
  const [name, setName] = useState("Emma Recruiter");
  const [email, setEmail] = useState("emma@remotown.com");

  function clearDemoData() {
    if (
      !confirm(
        "This permanently deletes every screening template and candidate submission from this browser. Continue?"
      )
    )
      return;
    try {
      window.localStorage.removeItem(STORAGE_KEYS.screenings);
      window.localStorage.removeItem(STORAGE_KEYS.submissions);
      // Tell our hooks to refresh.
      window.dispatchEvent(
        new CustomEvent("remotown:storage-changed", {
          detail: { key: STORAGE_KEYS.screenings },
        })
      );
      window.dispatchEvent(
        new CustomEvent("remotown:storage-changed", {
          detail: { key: STORAGE_KEYS.submissions },
        })
      );
      show("Demo data cleared");
    } catch {
      show("Could not clear data", { tone: "error" });
    }
  }

  return (
    <>
      <header className="mb-xl">
        <h2 className="text-headline-lg tracking-tight text-on-surface">
          Settings
        </h2>
        <p className="mt-xs text-body-md text-on-surface-variant">
          Profile, appearance, and demo data. Nothing here leaves this browser.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        {/* Profile */}
        <SettingsCard
          title="Profile"
          description="How recruiters see you across the workspace."
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <Input
              label="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <Input
              label="Work email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="mt-lg flex justify-end">
            <Button
              variant="outline"
              onClick={() =>
                show("Profile changes are mocked for this assessment.", {
                  tone: "info",
                })
              }
            >
              Save profile
            </Button>
          </div>
        </SettingsCard>

        {/* Appearance */}
        <SettingsCard
          title="Appearance"
          description="Match the editor to how you work best."
        >
          <fieldset className="flex flex-col gap-sm">
            <legend className="sr-only">Theme mode</legend>
            {([
              { id: "light", icon: "light_mode", label: "Light" },
              { id: "dark", icon: "dark_mode", label: "Dark" },
              { id: "system", icon: "devices", label: "Match system" },
            ] as const).map((opt) => {
              const active = mode === opt.id;
              return (
                <label
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-md rounded-lg border bg-surface-container-low p-md transition-colors",
                    active
                      ? "border-secondary bg-secondary/5"
                      : "border-outline-variant hover:bg-surface-container"
                  )}
                >
                  <span className="flex items-center gap-md">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-md",
                        active
                          ? "bg-secondary text-on-secondary"
                          : "bg-surface-container-high text-on-surface-variant"
                      )}
                    >
                      <Icon name={opt.icon} fill={active ? 1 : 0} />
                    </span>
                    <span>
                      <span className="block font-semibold text-on-surface">
                        {opt.label}
                      </span>
                      <span className="text-label-sm text-on-surface-variant">
                        {opt.id === "system"
                          ? "Follows your OS preference"
                          : opt.id === "dark"
                            ? "Low-light, easier on the eyes"
                            : "Bright, high-contrast"}
                      </span>
                    </span>
                  </span>
                  <input
                    type="radio"
                    name="theme"
                    value={opt.id}
                    checked={active}
                    onChange={() => setMode(opt.id as ThemeMode)}
                    className="h-4 w-4 accent-secondary"
                  />
                </label>
              );
            })}
          </fieldset>
          {mounted && (
            <p className="mt-md text-label-sm text-on-surface-variant">
              Currently rendering:{" "}
              <span className="font-semibold text-on-surface">{resolved}</span>{" "}
              mode.
            </p>
          )}
        </SettingsCard>

        {/* Notifications */}
        <SettingsCard
          title="Notifications"
          description="What lands in your inbox when a candidate submits."
          className="lg:col-span-2"
        >
          <ToggleRow
            label="Email me on new submission"
            description="Get notified when a candidate completes a screening for a job you own."
            defaultChecked
          />
          <ToggleRow
            label="Daily digest"
            description="Summary of new submissions, delivered at 8:00 local."
            defaultChecked={false}
          />
          <ToggleRow
            label="Mention me on AI flags"
            description="Notify me when the AI analysis flags a candidate as Strong Hire."
            defaultChecked
          />
        </SettingsCard>

        {/* Data */}
        <SettingsCard
          title="Data & storage"
          description="This demo uses your browser's localStorage."
        >
          <div className="space-y-xs">
            <DataStat label="Screening templates" value={mounted ? `${screenings.length}` : "—"} />
            <DataStat label="Candidate submissions" value={mounted ? `${submissions.length}` : "—"} />
          </div>
          <div className="mt-lg rounded-lg border border-error/20 bg-error/5 p-md">
            <h4 className="text-label-md font-bold text-error">Danger zone</h4>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              Clears every screening template and candidate submission from this
              browser. The seeded jobs stay.
            </p>
            <div className="mt-md flex">
              <Button
                variant="outline"
                size="sm"
                className="!border-error/30 !text-error hover:!bg-error/10"
                leadingIcon={<Icon name="delete_forever" size={18} />}
                onClick={clearDemoData}
              >
                Clear demo data
              </Button>
            </div>
          </div>
        </SettingsCard>

        {/* About */}
        <SettingsCard
          title="About this build"
          description="A bit of context for whoever's reading the code."
          className="lg:col-span-3"
        >
          <ul className="grid grid-cols-1 gap-md md:grid-cols-3 text-body-sm">
            <li className="flex items-start gap-sm">
              <Icon name="build" className="text-secondary" />
              <span>
                <strong className="block text-on-surface">Frontend only</strong>
                Next.js (App Router), TypeScript, Tailwind v4, Framer Motion.
              </span>
            </li>
            <li className="flex items-start gap-sm">
              <Icon name="storage" className="text-secondary" />
              <span>
                <strong className="block text-on-surface">No backend</strong>
                Screenings + submissions persist in <code>localStorage</code> only.
              </span>
            </li>
            <li className="flex items-start gap-sm">
              <Icon name="palette" className="text-secondary" />
              <span>
                <strong className="block text-on-surface">UI design</strong>
                Designs, layout, and components drafted as a wireframe sketch on a paper.
              </span>
            </li>
          </ul>
        </SettingsCard>
      </div>
    </>
  );
}

/* ---------- Private subcomponents ---------- */

function SettingsCard({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-outline-variant bg-surface-container-lowest p-lg",
        className
      )}
    >
      <header className="mb-md">
        <h3 className="text-headline-sm text-on-surface">{title}</h3>
        <p className="mt-xs text-body-sm text-on-surface-variant">{description}</p>
      </header>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <label className="flex cursor-pointer items-start justify-between gap-md border-b border-outline-variant py-md last:border-0">
      <div>
        <p className="font-semibold text-on-surface">{label}</p>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn(!on)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
          on ? "bg-secondary" : "bg-surface-container-highest"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </label>
  );
}

function DataStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-md py-sm">
      <span className="text-label-md text-on-surface-variant">{label}</span>
      <span className="text-label-md font-semibold text-on-surface">
        {value}
      </span>
    </div>
  );
}
