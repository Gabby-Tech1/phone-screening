"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { jobs } from "@/data/jobs";
import { useScreenings, useSubmissions, useMounted } from "@/lib/hooks";
import { deleteScreening } from "@/lib/storage";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateScreeningDrawer } from "@/components/recruiter/create-screening-drawer";
import { buildShareLink, formatDate } from "@/lib/utils";

/**
 * Recruiter view of every screening template currently saved.
 *
 * Each template card shows:
 *   - The job it belongs to (with link)
 *   - When it was created
 *   - Number of questions (and a peek of the first)
 *   - Applicant count derived from submissions
 *   - Quick actions: copy public link, re-create / replace
 *
 * If the recruiter hasn't created any screenings yet, we show a single, action-
 * oriented empty state pointing back into the create flow.
 */
export function ScreeningsList() {
  const screenings = useScreenings();
  const submissions = useSubmissions();
  const mounted = useMounted();
  const { show } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [defaultJobId, setDefaultJobId] = useState<string | undefined>(undefined);

  const sorted = useMemo(
    () =>
      screenings
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [screenings]
  );

  const submissionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of submissions) map[s.jobId] = (map[s.jobId] ?? 0) + 1;
    return map;
  }, [submissions]);

  async function copyLink(jobId: string) {
    try {
      await navigator.clipboard.writeText(buildShareLink(jobId));
      show("Screening link copied");
    } catch {
      show("Could not copy link", { tone: "error" });
    }
  }

  function handleDelete(id: string, jobTitle: string) {
    if (!confirm(`Delete the screening template for ${jobTitle}?`)) return;
    deleteScreening(id);
    show("Screening deleted");
  }

  return (
    <>
      <header className="mb-xl flex flex-col gap-md md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-headline-lg tracking-tight text-on-surface">
            Screening templates
          </h2>
          <p className="mt-xs text-body-md text-on-surface-variant">
            Every saved question set that powers your candidate screening links.
          </p>
        </div>
        <Button
          leadingIcon={<Icon name="add_circle" fill={1} />}
          className="text-white"
          onClick={() => {
            setDefaultJobId(undefined);
            setDrawerOpen(true);
          }}
        >
          Create Screening
        </Button>
      </header>

      {!mounted ? (
        <ScreeningSkeletonGrid />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="auto_awesome"
          title="No screenings yet"
          description="Create your first screening template — pick a job, generate questions, edit, and save. You can have one active template per job."
          action={
            <Button className="text-white" onClick={() => setDrawerOpen(true)}>
              Create your first screening
            </Button>
          }
          className="py-2xl"
        />
      ) : (
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((s) => {
            const job = jobs.find((j) => j.id === s.jobId);
            const firstQ = s.questions[0]?.text;
            const audioCount = s.questions.filter(
              (q) => q.responseType === "audio"
            ).length;
            return (
              <article
                key={s.id}
                className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-lg"
              >
                <div className="mb-md flex items-start justify-between gap-md">
                  <div className="min-w-0">
                    <span className="rounded-md bg-secondary/10 px-sm py-xs text-label-sm font-bold uppercase tracking-wider text-secondary">
                      Screening
                    </span>
                    <h3 className="mt-sm text-headline-sm text-on-surface">
                      {job ? (
                        <Link
                          href={`/jobs/${job.id}`}
                          className="hover:text-secondary"
                        >
                          {job.title}
                        </Link>
                      ) : (
                        "Unknown job"
                      )}
                    </h3>
                    <p className="mt-xs text-label-sm text-on-surface-variant">
                      Saved {formatDate(s.createdAt)}
                    </p>
                  </div>
                  <Chip tone="success">Active</Chip>
                </div>

                {firstQ && (
                  <blockquote className="mb-md rounded-md border-l-2 border-secondary bg-surface-container-low/70 px-md py-sm text-body-sm text-on-surface-variant">
                    &ldquo;{firstQ}&rdquo;
                  </blockquote>
                )}

                <dl className="mb-lg grid grid-cols-3 gap-xs text-center">
                  <Metric label="Questions" value={`${s.questions.length}`} />
                  <Metric
                    label="Audio"
                    value={`${audioCount}`}
                  />
                  <Metric
                    label="Applicants"
                    value={`${submissionCounts[s.jobId] ?? 0}`}
                  />
                </dl>

                <div className="mt-auto flex flex-wrap items-center gap-xs border-t border-outline-variant pt-md">
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon={<Icon name="content_copy" size={18} />}
                    onClick={() => copyLink(s.jobId)}
                  >
                    Copy link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon={<Icon name="edit" size={18} />}
                    onClick={() => {
                      setDefaultJobId(s.jobId);
                      setDrawerOpen(true);
                    }}
                  >
                    Replace
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto !text-error hover:!bg-error/10"
                    leadingIcon={<Icon name="delete" size={18} />}
                    onClick={() => handleDelete(s.id, job?.title ?? "this job")}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <CreateScreeningDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        defaultJobId={defaultJobId}
      />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container-low px-sm py-sm">
      <div className="text-headline-sm font-bold text-on-surface">{value}</div>
      <div className="text-label-sm text-on-surface-variant">{label}</div>
    </div>
  );
}

function ScreeningSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-md h-6 w-3/4" />
          <Skeleton className="mt-sm h-3 w-1/3" />
          <Skeleton className="mt-lg h-16 w-full" />
          <Skeleton className="mt-lg h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
