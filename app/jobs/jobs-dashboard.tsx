"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { jobs } from "@/data/jobs";
import { useScreenings, useSubmissions, useMounted } from "@/lib/hooks";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { JobCard } from "@/components/recruiter/job-card";
import { CreateScreeningDrawer } from "@/components/recruiter/create-screening-drawer";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";

/**
 * The Jobs dashboard. Renders the Stitch-designed layout with:
 *   - Heading + "Create Phone Screening" CTA + view toggle
 *   - Filter bar (department, employment type, sort)
 *   - Grid or list of jobs + "Post a New Job" placeholder card
 *
 * The Create button opens an in-page drawer that handles the full
 * create-screening flow. We use a drawer (vs. a route) so recruiters keep their
 * dashboard context.
 */
export function JobsDashboard() {
  const router = useRouter();
  const search = useSearchParams();
  const screenings = useScreenings();
  const submissions = useSubmissions();
  const mounted = useMounted();

  const [view, setView] = useState<ViewMode>("grid");
  const [department, setDepartment] = useState<string>("All");
  const [empType, setEmpType] = useState<string>("All");
  const [sort, setSort] = useState<"recent" | "title" | "applicants">(
    "recent"
  );
  const [query, setQuery] = useState("");
  // Open the drawer when navigated here with `?create=1`. We derive the
  // initial value from the URL during the first render rather than setting
  // it inside `useEffect` — this satisfies React 19's set-state-in-effect
  // rule and means no flicker between "closed" and "opened".
  const wantsCreate = search.get("create") === "1";
  const [drawerOpen, setDrawerOpen] = useState(wantsCreate);
  const [drawerJobId, setDrawerJobId] = useState<string | undefined>();

  // Side effect: clean up the URL once we've consumed the intent.
  if (wantsCreate && typeof window !== "undefined") {
    // Schedule outside the render phase.
    queueMicrotask(() => router.replace("/jobs", { scroll: false }));
  }

  const departments = useMemo(() => {
    const ds = new Set(jobs.map((j) => j.department));
    return ["All", ...Array.from(ds)];
  }, []);

  const empTypes = useMemo(() => {
    const ts = new Set(jobs.map((j) => j.employmentType));
    return ["All", ...Array.from(ts)];
  }, []);

  // Screening counts per job, derived from localStorage submissions.
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of submissions) map[s.jobId] = (map[s.jobId] ?? 0) + 1;
    return map;
  }, [submissions]);

  const visible = useMemo(() => {
    let list = jobs.slice();
    if (department !== "All") list = list.filter((j) => j.department === department);
    if (empType !== "All") list = list.filter((j) => j.employmentType === empType);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          j.department.toLowerCase().includes(q)
      );
    }
    if (sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "applicants") {
      list.sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
    } else {
      // "recent" — postedDaysAgo ascending (smallest = newest)
      list.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
    }
    return list;
  }, [department, empType, query, sort, counts]);

  const totalScreenings = mounted ? screenings.length : 0;

  return (
    <>
      {/* Page heading */}
      <header className="mb-xl flex flex-col gap-md md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-headline-lg tracking-tight text-on-surface">
            Active Job Openings
          </h2>
          <p className="mt-xs text-body-md text-on-surface-variant">
            Managing{" "}
            <span className="font-semibold text-on-surface">{jobs.length}</span>{" "}
            open positions across{" "}
            <span className="font-semibold text-on-surface">
              {new Set(jobs.map((j) => j.department)).size}
            </span>{" "}
            departments
            {mounted && totalScreenings > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-on-surface">
                  {totalScreenings}
                </span>{" "}
                screening template{totalScreenings === 1 ? "" : "s"} active
              </>
            )}
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: "grid", label: "Grid View" },
              { value: "list", label: "List View" },
            ]}
            ariaLabel="Job layout"
          />
          <Button
            leadingIcon={<Icon name="add_circle" fill={1} />}
            className="text-white"
            onClick={() => {
              setDrawerJobId(undefined);
              setDrawerOpen(true);
            }}
          >
            Create Phone Screening
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="mb-lg flex flex-wrap items-center gap-md">
        <FilterMenu
          icon="filter_list"
          label="Department"
          value={department}
          options={departments}
          onChange={setDepartment}
        />
        <FilterMenu
          icon="badge"
          label="Employment type"
          value={empType}
          options={empTypes}
          onChange={setEmpType}
        />
        <FilterMenu
          icon="sort"
          label="Sort by"
          value={
            sort === "recent"
              ? "Recently Created"
              : sort === "title"
                ? "Title (A → Z)"
                : "Most Applicants"
          }
          options={["Recently Created", "Title (A → Z)", "Most Applicants"]}
          onChange={(v) =>
            setSort(
              v === "Title (A → Z)"
                ? "title"
                : v === "Most Applicants"
                  ? "applicants"
                  : "recent"
            )
          }
        />
        <SearchPill value={query} onChange={setQuery} />
        <p className="ml-auto text-body-sm text-on-surface-variant">
          Showing <span className="font-semibold text-on-surface">{visible.length}</span>{" "}
          of {jobs.length} jobs
        </p>
      </div>

      {/* Grid / list */}
      {visible.length === 0 ? (
        <EmptyState
          icon="work_off"
          title="No jobs match your filters"
          description="Try clearing a filter or adjusting your search."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setDepartment("All");
                setEmpType("All");
                setQuery("");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              screeningCount={counts[job.id] ?? 0}
            />
          ))}
          <PostNewJobCard />
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
          {visible.map((job) => (
            <li
              key={job.id}
              className="flex items-center justify-between gap-md px-lg py-md transition-colors hover:bg-surface-container-low"
            >
              <a
                href={`/jobs/${job.id}`}
                className="flex flex-1 items-center gap-md"
              >
                <span className="rounded-lg bg-secondary/10 p-sm text-secondary">
                  <Icon name={job.icon} size={20} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-on-surface">
                    {job.title}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">
                    {job.department} · {job.location} · {job.employmentType}
                  </span>
                </span>
                <Chip tone={job.status === "Active" ? "success" : "warning"}>
                  {job.status}
                </Chip>
                <span className="hidden w-20 text-right text-label-md text-on-surface-variant sm:block">
                  {counts[job.id] ?? 0} applicant
                  {(counts[job.id] ?? 0) === 1 ? "" : "s"}
                </span>
                <Icon
                  name="arrow_forward"
                  className="text-on-surface-variant"
                />
              </a>
            </li>
          ))}
        </ul>
      )}

      <CreateScreeningDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        defaultJobId={drawerJobId}
      />
    </>
  );
}

/* ---------- Inline subcomponents (kept private to this page) ---------- */

function FilterMenu({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: string;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2 text-outline">
        <Icon name={icon} size={18} />
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 cursor-pointer appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest pl-xl pr-xl text-label-md text-on-surface",
          "outline-none transition-colors hover:bg-surface-container-low focus:border-secondary focus:ring-2 focus:ring-secondary/30"
        )}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "All" ? `All ${label.toLowerCase()}s` : opt}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-sm top-1/2 -translate-y-1/2 text-outline">
        <Icon name="keyboard_arrow_down" size={18} />
      </span>
    </label>
  );
}

function SearchPill({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">Search jobs</span>
      <span className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2 text-outline">
        <Icon name="search" size={18} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Quick search…"
        className="h-10 w-48 rounded-lg border border-outline-variant bg-surface-container-lowest pl-xl pr-md text-label-md text-on-surface placeholder:text-outline outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
      />
    </label>
  );
}

function PostNewJobCard() {
  return (
    <button
      type="button"
      onClick={() =>
        // Out of scope per the brief, but the affordance is part of the design.
        alert(
          "Posting a new job is out of scope for this assessment — the seeded jobs in /data/jobs.ts represent the active openings."
        )
      }
      className="group flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-transparent p-lg text-center transition-all hover:border-secondary hover:bg-secondary/5"
    >
      <span className="mb-md flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high transition-colors group-hover:bg-secondary/10">
        <Icon
          name="add"
          className="text-outline transition-colors group-hover:text-secondary"
        />
      </span>
      <p className="text-headline-sm text-on-surface-variant transition-colors group-hover:text-secondary">
        Post a New Job
      </p>
      <p className="mt-xs text-body-sm text-outline">
        Expand your recruitment pipeline
      </p>
    </button>
  );
}
