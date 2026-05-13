"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { jobs } from "@/data/jobs";
import { useScreenings, useSubmissions, useMounted } from "@/lib/hooks";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/utils";

/**
 * Recruiter dashboard. Aggregates everything the recruiter cares about on a
 * single screen:
 *
 *   - Top-of-funnel: how many open jobs, screening templates, submissions
 *   - Recent activity: latest submissions (deep-linked into applicant detail)
 *   - Top jobs: jobs ordered by applicants screened
 *   - Quick actions: copy a job's screening link, jump back into create flow
 *
 * Everything below the hero strip is derived from localStorage, so the page
 * stays accurate without an API.
 */
export function DashboardOverview() {
  const screenings = useScreenings();
  const submissions = useSubmissions();
  const mounted = useMounted();

  // `Date.now()` is impure (React 19 forbids calling it during render). We
  // capture a snapshot on first paint via a ref-equivalent useState seed.
  const [renderedAt] = useState<number>(() => Date.now());
  const stats = useMemo(() => {
    return {
      openJobs: jobs.filter((j) => j.status === "Active").length,
      totalJobs: jobs.length,
      screeningCount: screenings.length,
      submissionCount: submissions.length,
      // Submissions in the last 7 days — feels like a real recruiter signal.
      last7Days: submissions.filter((s) => {
        const t = new Date(s.submittedAt).getTime();
        return renderedAt - t < 7 * 24 * 60 * 60 * 1000;
      }).length,
    };
  }, [screenings, submissions, renderedAt]);

  const recent = useMemo(
    () =>
      submissions
        .slice()
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .slice(0, 6),
    [submissions]
  );

  // Jobs sorted by applicant volume — only show ones that have at least one.
  const topJobs = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of submissions) counts[s.jobId] = (counts[s.jobId] ?? 0) + 1;
    return jobs
      .map((j) => ({ job: j, count: counts[j.id] ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [submissions]);

  return (
    <>
      {/* Hero */}
      <header className="mb-xl flex flex-col gap-md md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-headline-lg tracking-tight text-on-surface">
            Welcome back
          </h2>
          <p className="mt-xs text-body-md text-on-surface-variant">
            Here&rsquo;s what&rsquo;s happening across your hiring pipeline today.
          </p>
        </div>
        <div className="flex items-center flex-col md:flex-row gap-sm">
          <Link href="/jobs">
            <Button variant="outline" leadingIcon={<Icon name="work" />}>
              View all jobs
            </Button>
          </Link>
          <Link href="/jobs?create=1">
            <Button
              leadingIcon={<Icon name="add_circle" fill={1} />}
              className="text-white"
            >
              Create Screening
            </Button>
          </Link>
        </div>
      </header>

      {/* Stats strip */}
      <section
        aria-label="Top-of-funnel metrics"
        className="mb-xl grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          icon="work"
          label="Active Jobs"
          value={`${stats.openJobs}`}
          sub={`of ${stats.totalJobs} total`}
          tone="primary"
          mounted
        />
        <StatCard
          icon="auto_awesome"
          label="Screening Templates"
          value={mounted ? `${stats.screeningCount}` : undefined}
          sub="Saved across all jobs"
          tone="secondary"
          mounted={mounted}
        />
        <StatCard
          icon="groups"
          label="Total Applicants"
          value={mounted ? `${stats.submissionCount}` : undefined}
          sub="All-time submissions"
          tone="info"
          mounted={mounted}
        />
        <StatCard
          icon="trending_up"
          label="Last 7 Days"
          value={mounted ? `${stats.last7Days}` : undefined}
          sub="New responses"
          tone="success"
          mounted={mounted}
        />
      </section>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        {/* Recent activity */}
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest lg:col-span-7">
          <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
            <h3 className="text-headline-sm text-on-surface">Recent activity</h3>
            <Link
              href="/candidates"
              className="inline-flex items-center gap-xs text-label-md text-secondary hover:opacity-80"
            >
              View all
              <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
          {!mounted ? (
            <ActivitySkeleton />
          ) : recent.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="No submissions yet"
              description="Once a candidate completes a screening, their response will surface here."
              className="py-xl"
            />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {recent.map((s) => {
                const job = jobs.find((j) => j.id === s.jobId);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/jobs/${s.jobId}/applicants/${s.id}`}
                      className="flex items-center gap-md px-lg py-md transition-colors hover:bg-surface-container-low"
                    >
                      <Avatar name={s.candidateName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-on-surface">
                          {s.candidateName}
                        </p>
                        <p className="truncate text-body-sm text-on-surface-variant">
                          {job?.title ?? "Unknown job"} ·{" "}
                          {s.answers.length} of{" "}
                          {s.questionsSnapshot.length} answered
                        </p>
                      </div>
                      <span className="hidden text-label-sm text-on-surface-variant sm:inline">
                        {timeAgo(s.submittedAt)}
                      </span>
                      <Icon
                        name="arrow_forward"
                        className="text-on-surface-variant"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Top jobs */}
        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest lg:col-span-5">
          <div className="flex items-center justify-between border-b border-outline-variant px-lg py-md">
            <h3 className="text-headline-sm text-on-surface">
              Top jobs by applicants
            </h3>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-xs text-label-md text-secondary hover:opacity-80"
            >
              All jobs
              <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
          {!mounted ? (
            <ActivitySkeleton />
          ) : topJobs.length === 0 ? (
            <EmptyState
              icon="leaderboard"
              title="Nothing to rank yet"
              description="Share a screening link to start collecting responses."
              className="py-xl"
            />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {topJobs.map(({ job, count }) => (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex items-center gap-md px-lg py-md transition-colors hover:bg-surface-container-low"
                  >
                    <span className="rounded-lg bg-secondary/10 p-sm text-secondary">
                      <Icon name={job.icon} size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-on-surface">
                        {job.title}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {job.department} · {job.location}
                      </p>
                    </div>
                    <Chip tone="secondary">
                      {count} applicant{count === 1 ? "" : "s"}
                    </Chip>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

/* ---------- Private helpers ---------- */

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
  mounted,
}: {
  icon: string;
  label: string;
  value?: string;
  sub: string;
  tone: "primary" | "secondary" | "info" | "success";
  mounted: boolean;
}) {
  const iconTone = {
    primary: "bg-primary/5 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    info: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  }[tone];
  return (
    <div className="flex items-start justify-between gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
      <div>
        <p className="text-label-sm font-bold uppercase tracking-wider text-outline">
          {label}
        </p>
        <div className="mt-xs text-headline-lg font-bold tracking-tight text-on-surface">
          {!mounted && value === undefined ? (
            <Skeleton className="mt-xs h-7 w-12" />
          ) : (
            (value ?? "—")
          )}
        </div>
        <p className="mt-xs text-label-sm text-on-surface-variant">{sub}</p>
      </div>
      <span className={`rounded-lg p-sm ${iconTone}`}>
        <Icon name={icon} fill={1} />
      </span>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <ul className="divide-y divide-outline-variant">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center gap-md px-lg py-md">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-xs">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}
