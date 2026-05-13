"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMounted, useScreenings, useSubmissions } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateScreeningDrawer } from "@/components/recruiter/create-screening-drawer";
import { buildShareLink, formatDate } from "@/lib/utils";
import type { Job, Submission } from "@/lib/types";

interface JobDetailProps {
  job: Job;
}

/**
 * Recruiter view of a single job. Renders:
 *   - "Back" link
 *   - Bento hero (job summary + public screening card)
 *   - Edit / Archive actions (UI-only)
 *   - Applicant table (or empty state)
 *   - "Boost your hiring precision" CTA if no screening exists yet
 */
export function JobDetail({ job }: JobDetailProps) {
  const submissions = useSubmissions();
  const screenings = useScreenings();
  const mounted = useMounted();
  const { show } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const applicants = useMemo<Submission[]>(
    () =>
      submissions
        .filter((s) => s.jobId === job.id)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [submissions, job.id]
  );

  const screening = useMemo(
    () =>
      screenings
        .filter((s) => s.jobId === job.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [screenings, job.id]
  );

  const fallbackShareLink = `/screening/${job.id}`;
  const shareLink = mounted ? buildShareLink(job.id) : fallbackShareLink;

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(buildShareLink(job.id));
      show("Screening link copied");
    } catch {
      show("Could not copy link", { tone: "error" });
    }
  }

  return (
    <>
      {/* Breadcrumb */}
      <Link
        href="/jobs"
        className="mb-md inline-flex items-center gap-xs text-label-md text-secondary transition-opacity hover:opacity-80"
      >
        <Icon name="arrow_back" size={18} />
        Back to Jobs
      </Link>

      {/* Bento hero */}
      <section className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-xl lg:col-span-2">
          <div className="mb-md flex items-center gap-sm">
            <Chip tone="secondary">{job.department}</Chip>
            <span className="text-outline">·</span>
            <span className="text-label-sm text-on-surface-variant">
              Posted {job.postedDaysAgo} day{job.postedDaysAgo === 1 ? "" : "s"} ago
            </span>
          </div>

          <h2 className="text-headline-lg tracking-tight text-on-surface">
            {job.title}
          </h2>

          <div className="mt-sm flex flex-wrap items-center gap-md text-on-surface-variant">
            <span className="inline-flex items-center gap-xs text-body-sm">
              <Icon name="location_on" size={18} />
              {job.location}
            </span>
            {job.salaryRange && (
              <span className="inline-flex items-center gap-xs text-body-sm">
                <Icon name="payments" size={18} />
                {job.salaryRange}
              </span>
            )}
            <span className="inline-flex items-center gap-xs text-body-sm">
              <Icon name="schedule" size={18} />
              {job.employmentType}
            </span>
          </div>

          <p className="mt-lg max-w-2xl text-body-md leading-relaxed text-on-surface-variant">
            {job.description}
          </p>

          <div className="mt-xl flex flex-wrap gap-md">
            <Button
              variant="primary"
              leadingIcon={<Icon name="edit" />}
              className="text-white dark:text-black"
              onClick={() => show("Editing the job post is out of scope.", { tone: "info" })}
            >
              Edit Job Post
            </Button>
            <Button
              variant="outline"
              onClick={() => show("Archiving is out of scope for this assessment.", { tone: "info" })}
            >
              Archive Job
            </Button>
          </div>
        </div>

        {/* Public screening card */}
        <div className="flex flex-col gap-lg rounded-xl border border-outline-variant bg-surface-container-low p-xl">
          <div className="space-y-xs">
            <h3 className="text-headline-sm text-on-surface">Public Screening</h3>
            <p className="text-body-sm text-on-surface-variant">
              Share this link with candidates to start the automated screening
              process.
            </p>
          </div>

          <div className="flex items-center justify-between gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-sm">
            <span className="truncate font-mono text-label-sm text-secondary">
              {shareLink.replace(/^https?:\/\//, "")}
            </span>
            <button
              type="button"
              aria-label="Copy screening link"
              onClick={copyShare}
              className="rounded-md p-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <Icon name="content_copy" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-xs">
            <Button
              variant="ghost"
              leadingIcon={<Icon name="open_in_new" />}
              onClick={() =>
                window.open(buildShareLink(job.id), "_blank", "noopener,noreferrer")
              }
            >
              Preview candidate view
            </Button>
            {screening && (
              <Link href={`/jobs/${job.id}/screenings/${screening.id}/edit`}>
                <Button variant="ghost" leadingIcon={<Icon name="edit" />}>
                  Edit screening
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-auto space-y-md">
            <div className="flex items-center justify-between">
              <span className="text-label-md text-on-surface-variant">
                Screening Status
              </span>
              <Chip tone={screening ? "success" : "neutral"}>
                {screening ? "Active" : "Not Set Up"}
              </Chip>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-outline-variant">
              <div
                className="h-full rounded-full bg-secondary transition-[width] duration-500"
                style={{ width: screening ? "75%" : "0%" }}
              />
            </div>
            <p className="text-label-sm text-on-surface-variant">
              {applicants.length} candidate{applicants.length === 1 ? "" : "s"}{" "}
              {applicants.length === 1 ? "is" : "are"} in the pipeline.
            </p>
          </div>
        </div>
      </section>

      {/* Applicants */}
      <section className="mt-gutter overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center justify-between border-b border-outline-variant px-xl py-lg">
          <h3 className="text-headline-sm text-on-surface">Applicants</h3>
          <div className="flex items-center gap-md">
            <button
              type="button"
              onClick={() => show("Filters coming in v2.", { tone: "info" })}
              className="inline-flex items-center gap-xs text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              <Icon name="filter_list" />
              Filter
            </button>
            <button
              type="button"
              onClick={() => show("CSV export is out of scope.", { tone: "info" })}
              className="inline-flex items-center gap-xs text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              <Icon name="download" />
              Export CSV
            </button>
          </div>
        </div>

        {applicants.length === 0 ? (
          <EmptyState
            icon="person_search"
            title="No applicants yet"
            description={
              screening
                ? "Candidates who complete the screening will appear here automatically."
                : "Create a screening template first, then share the public link to start collecting responses."
            }
            action={
              screening ? (
                <Button variant="outline" onClick={copyShare}>
                  Copy screening link
                </Button>
              ) : (
                <Button className="text-white" onClick={() => setDrawerOpen(true)}>
                  Create Screening
                </Button>
              )
            }
            className="py-2xl"
          />
        ) : (
          <ApplicantsTable applicants={applicants} jobId={job.id} />
        )}
      </section>

      {/* Conditional CTA */}
      {!screening && (
        <section className="mt-gutter rounded-xl border-2 border-dashed border-secondary/30 bg-secondary p-xl text-on-secondary">
          <div className="flex flex-col items-start gap-lg md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-lg">
              <span className="rounded-xl bg-surface-container-lowest p-md text-secondary">
                <Icon name="add_task" size={28} />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-headline-sm font-bold">
                  Boost your hiring precision
                </h4>
                <p className="mt-xs max-w-2xl text-body-md text-on-secondary/80">
                  Create a custom screening module to automatically filter top
                  talent before the first interview.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="whitespace-nowrap !border-on-secondary/60 !bg-transparent !text-white hover:!bg-on-secondary/10 dark:!text-on-secondary"
              onClick={() => setDrawerOpen(true)}
            >
              Create New Screening
            </Button>
          </div>
        </section>
      )}

      <CreateScreeningDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        defaultJobId={job.id}
      />
    </>
  );
}

function ApplicantsTable({
  applicants,
  jobId,
}: {
  applicants: Submission[];
  jobId: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-surface-container-low">
            <Th>Candidate Name</Th>
            <Th>Email Address</Th>
            <Th>Submission Date</Th>
            <Th>Status</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {applicants.map((a, idx) => {
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
                key={a.id}
                className="group transition-colors hover:bg-surface-container-low"
              >
                <Td>
                  <div className="flex items-center gap-md">
                    <Avatar name={a.candidateName} />
                    <span className="font-semibold text-on-surface">
                      {a.candidateName}
                    </span>
                  </div>
                </Td>
                <Td className="text-on-surface-variant">{a.candidateEmail}</Td>
                <Td className="text-on-surface-variant">
                  {formatDate(a.submittedAt)}
                </Td>
                <Td>
                  <Chip tone={tone}>{label}</Chip>
                </Td>
                <Td align="right">
                  <Link
                    href={`/jobs/${jobId}/applicants/${a.id}`}
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
      className={`px-xl py-md text-body-sm ${className ?? ""}`}
      style={{ textAlign: align }}
    >
      {children}
    </td>
  );
}
