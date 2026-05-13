"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { jobs, jobsById } from "@/data/jobs";
import { useSubmissions, useMounted } from "@/lib/hooks";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Cross-job candidate roster. Most recruiters spend time here when they want
 * to compare candidates across roles, or when they don't yet remember which
 * job a name belongs to.
 *
 * Features:
 *   - Single table view (mobile reflows to cards on narrow viewports)
 *   - Filter by job (dropdown)
 *   - Text search by name or email
 *   - Sort by date / name
 */
export function CandidatesList() {
  const submissions = useSubmissions();
  const mounted = useMounted();

  const [jobFilter, setJobFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = submissions.slice();
    if (jobFilter !== "all") list = list.filter((s) => s.jobId === jobFilter);
    if (q) {
      list = list.filter(
        (s) =>
          s.candidateName.toLowerCase().includes(q) ||
          s.candidateEmail.toLowerCase().includes(q)
      );
    }
    if (sort === "name") {
      list.sort((a, b) => a.candidateName.localeCompare(b.candidateName));
    } else {
      list.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    }
    return list;
  }, [submissions, jobFilter, query, sort]);

  return (
    <>
      <header className="mb-xl flex flex-col gap-md md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-headline-lg tracking-tight text-on-surface">
            Candidates
          </h2>
          <p className="mt-xs text-body-md text-on-surface-variant">
            {mounted ? (
              <>
                <span className="font-semibold text-on-surface">
                  {submissions.length}
                </span>{" "}
                total submissions across {jobs.length} jobs.
              </>
            ) : (
              "Loading candidate roster…"
            )}
          </p>
        </div>
      </header>

      {/* Toolbar */}
      <div className="mb-lg flex flex-wrap items-center gap-md">
        <label className="relative inline-flex">
          <span className="sr-only">Filter by job</span>
          <span className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2 text-outline">
            <Icon name="work" size={18} />
          </span>
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="h-10 cursor-pointer appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest pl-xl pr-xl text-label-md text-on-surface outline-none transition-colors hover:bg-surface-container-low focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          >
            <option value="all">All jobs</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-sm top-1/2 -translate-y-1/2 text-outline">
            <Icon name="keyboard_arrow_down" size={18} />
          </span>
        </label>
        <label className="relative inline-flex">
          <span className="sr-only">Sort</span>
          <span className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2 text-outline">
            <Icon name="sort" size={18} />
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-10 cursor-pointer appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest pl-xl pr-xl text-label-md text-on-surface outline-none transition-colors hover:bg-surface-container-low focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          >
            <option value="recent">Most recent</option>
            <option value="name">Name (A → Z)</option>
          </select>
          <span className="pointer-events-none absolute right-sm top-1/2 -translate-y-1/2 text-outline">
            <Icon name="keyboard_arrow_down" size={18} />
          </span>
        </label>
        <label className="relative inline-flex flex-1">
          <span className="sr-only">Search by name or email</span>
          <span className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2 text-outline">
            <Icon name="search" size={18} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-xl pr-md text-label-md text-on-surface placeholder:text-outline outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30"
          />
        </label>
      </div>

      {!mounted ? (
        <RosterSkeleton />
      ) : visible.length === 0 ? (
        submissions.length === 0 ? (
          <EmptyState
            icon="person_search"
            title="No candidates yet"
            description="Share a screening link to start collecting responses. Candidates will appear here once they submit."
            action={
              <Link href="/jobs">
                <Button variant="outline">Pick a job to share</Button>
              </Link>
            }
            className="py-2xl"
          />
        ) : (
          <EmptyState
            icon="filter_alt_off"
            title="No candidates match your filters"
            description="Try clearing your filters or adjusting the search."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setJobFilter("all");
                  setQuery("");
                }}
              >
                Clear filters
              </Button>
            }
            className="py-2xl"
          />
        )
      ) : (
        <RosterTable list={visible} />
      )}
    </>
  );
}

function RosterTable({
  list,
}: {
  list: ReturnType<typeof useSubmissions>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-container-low">
              <Th>Candidate</Th>
              <Th>Job applied to</Th>
              <Th>Submitted</Th>
              <Th>Responses</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {list.map((s, idx) => {
              const job = jobsById[s.jobId];
              const tone =
                idx % 3 === 0 ? "info" : idx % 3 === 1 ? "warning" : "success";
              const label =
                idx % 3 === 0
                  ? "Reviewing"
                  : idx % 3 === 1
                    ? "In Progress"
                    : "Highly Rated";
              return (
                <tr
                  key={s.id}
                  className="group transition-colors hover:bg-surface-container-low"
                >
                  <Td>
                    <div className="flex items-center gap-md">
                      <Avatar name={s.candidateName} />
                      <div>
                        <p className="font-semibold text-on-surface">
                          {s.candidateName}
                        </p>
                        <p className="text-body-sm text-on-surface-variant">
                          {s.candidateEmail}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {job ? (
                      <Link
                        href={`/jobs/${job.id}`}
                        className="inline-flex items-center gap-xs text-on-surface hover:text-secondary"
                      >
                        <Icon
                          name={job.icon}
                          size={18}
                          className="text-secondary"
                        />
                        {job.title}
                      </Link>
                    ) : (
                      <span className="text-on-surface-variant">Unknown</span>
                    )}
                  </Td>
                  <Td className="text-on-surface-variant">
                    {formatDate(s.submittedAt)}
                  </Td>
                  <Td>
                    <Chip tone={tone}>
                      {label}
                    </Chip>
                    <span className="ml-sm text-label-sm text-on-surface-variant">
                      {s.answers.length}/{s.questionsSnapshot.length}
                    </span>
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/jobs/${s.jobId}/applicants/${s.id}`}
                      className="inline-flex items-center gap-xs rounded-lg bg-secondary px-md py-sm text-label-sm font-semibold text-on-secondary transition-all hover:brightness-110 active:scale-[0.97]"
                    >
                      View Responses
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className="divide-y divide-outline-variant md:hidden">
        {list.map((s, idx) => {
          const job = jobsById[s.jobId];
          const tone =
            idx % 3 === 0 ? "info" : idx % 3 === 1 ? "warning" : "success";
          const label =
            idx % 3 === 0
              ? "Reviewing"
              : idx % 3 === 1
                ? "In Progress"
                : "Highly Rated";
          return (
            <li key={s.id}>
              <Link
                href={`/jobs/${s.jobId}/applicants/${s.id}`}
                className="flex items-start gap-md px-lg py-md transition-colors hover:bg-surface-container-low"
              >
                <Avatar name={s.candidateName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-on-surface">
                    {s.candidateName}
                  </p>
                  <p className="truncate text-body-sm text-on-surface-variant">
                    {s.candidateEmail}
                  </p>
                  <p className="mt-xs text-label-sm text-on-surface-variant">
                    {job?.title ?? "Unknown job"} · {formatDate(s.submittedAt)}
                  </p>
                </div>
                <Chip tone={tone}>{label}</Chip>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className="px-xl py-md text-label-sm font-bold uppercase tracking-wider text-on-surface-variant"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={cn("px-xl py-md text-body-sm", className)}
      style={{ textAlign: align }}
    >
      {children}
    </td>
  );
}

function RosterSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <ul className="divide-y divide-outline-variant">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex items-center gap-md px-lg py-md">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-xs">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-8 w-24" />
          </li>
        ))}
      </ul>
    </div>
  );
}
