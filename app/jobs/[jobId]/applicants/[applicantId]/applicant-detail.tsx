"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSubmissions } from "@/lib/hooks";
import { analyzeSubmission, recommendationMeta } from "@/data/mock-analysis";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import type { AnalysisResult, Job } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

interface ApplicantDetailProps {
  job: Job;
  applicantId: string;
}

export function ApplicantDetail({ job, applicantId }: ApplicantDetailProps) {
  const submissions = useSubmissions();
  const { show } = useToast();
  const submission = useMemo(
    () => submissions.find((s) => s.id === applicantId),
    [submissions, applicantId]
  );

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  function handleAnalyze() {
    if (!submission || analyzing) return;
    setAnalyzing(true);
    setAnalysis(null);
    setTimeout(() => {
      setAnalysis(analyzeSubmission(submission));
      setAnalyzing(false);
    }, 1500);
  }

  if (!submission) {
    return (
      <>
        <Link
          href={`/jobs/${job.id}`}
          className="mb-md inline-flex items-center gap-xs text-label-md text-secondary hover:opacity-80"
        >
          <Icon name="arrow_back" size={18} />
          Back to {job.title}
        </Link>
        <EmptyState
          icon="person_off"
          title="Applicant not found"
          description="This submission has been removed, or the link is stale. Try returning to the job page."
          action={
            <Link href={`/jobs/${job.id}`}>
              <Button variant="outline">Back to job</Button>
            </Link>
          }
          className="py-2xl"
        />
      </>
    );
  }

  const meta = analysis ? recommendationMeta(analysis.recommendation) : null;

  return (
    <>
      {/* Back link */}
      <Link
        href={`/jobs/${job.id}`}
        className="mb-md inline-flex items-center gap-xs text-label-md text-secondary hover:opacity-80"
      >
        <Icon name="arrow_back" size={18} />
        Back to {job.title}
      </Link>

      {/* Header */}
      <header className="mb-xl flex flex-col gap-lg md:flex-row md:items-end md:justify-between">
        <div className="space-y-sm">
          <h2 className="text-headline-lg tracking-tight text-on-surface">
            {submission.candidateName}
          </h2>
          <div className="flex flex-wrap gap-md text-body-sm text-on-surface-variant">
            <span className="inline-flex items-center gap-xs">
              <Icon name="mail" size={18} />
              {submission.candidateEmail}
            </span>
            <span className="inline-flex items-center gap-xs">
              <Icon name="schedule" size={18} />
              Completed {formatDateTime(submission.submittedAt)}
            </span>
            <span className="inline-flex items-center gap-xs">
              <Icon name="quiz" size={18} />
              {submission.answers.length} of {submission.questionsSnapshot.length}{" "}
              answered
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-md">
          <Button
            variant="outline"
            leadingIcon={<Icon name="download" />}
            onClick={() => show("Transcript export is mocked.", { tone: "info" })}
          >
            Transcript
          </Button>
          <Button
            onClick={handleAnalyze}
            loading={analyzing}
            leadingIcon={<Icon name="auto_awesome" fill={1} />}
          >
            {analysis ? "Re-run Analysis" : "Analyze Response"}
          </Button>
        </div>
      </header>

      {/* Bento layout */}
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        {/* Q&A column */}
        <section className="space-y-gutter lg:col-span-8">
          {submission.questionsSnapshot.map((q, idx) => {
            const answer = submission.answers.find(
              (a) => a.questionId === q.id
            );
            return (
              <article
                key={q.id}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm"
              >
                <div className="mb-md flex items-start justify-between gap-md">
                  <span className="rounded-md bg-surface-container-highest px-sm py-xs text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                    Question {idx + 1}
                  </span>
                  <span className="inline-flex items-center gap-xs text-label-sm text-on-surface-variant">
                    <Icon
                      name={
                        q.responseType === "audio" ? "mic" : "edit_note"
                      }
                      size={18}
                    />
                    {q.responseType === "audio" ? "Audio Response" : "Text Response"}
                  </span>
                </div>
                <h3 className="text-headline-sm text-on-surface">
                  &ldquo;{q.text}&rdquo;
                </h3>

                {q.responseType === "audio" ? (
                  <AudioPlaceholder note={answer?.value} />
                ) : answer && answer.value.trim() ? (
                  <blockquote className="mt-md rounded-r-lg border-l-4 border-secondary bg-surface-bright p-md text-body-md text-on-surface dark:bg-surface-container-low">
                    {answer.value}
                  </blockquote>
                ) : (
                  <p className="mt-md rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low py-md text-center text-body-sm text-on-surface-variant">
                    No response captured.
                  </p>
                )}
              </article>
            );
          })}
        </section>

        {/* Analysis panel */}
        <aside className="lg:col-span-4">
          <div className="confetti-gradient sticky top-24 rounded-xl bg-primary-container p-lg text-on-primary-container shadow-2xl">
            <div className="mb-lg flex items-center gap-md">
              <span className="rounded-lg bg-secondary p-sm text-on-secondary">
                <Icon name="psychology" fill={1} />
              </span>
              <div>
                <h4 className="text-headline-sm text-on-primary-fixed">
                  AI Analysis
                </h4>
                <p className="text-label-sm text-on-primary-container">
                  {analysis
                    ? "Updated just now"
                    : analyzing
                      ? "Running…"
                      : "Tap Analyze to begin"}
                </p>
              </div>
            </div>

            {analyzing ? (
              <AnalysisLoading />
            ) : analysis ? (
              <AnalysisBody analysis={analysis} />
            ) : (
              <p className="text-body-sm text-on-primary-container">
                Click <span className="font-semibold text-on-primary-fixed">Analyze Response</span>{" "}
                to generate a structured summary, key strengths, concerns, and
                a hiring recommendation based on this candidate&rsquo;s answers.
              </p>
            )}

            {analysis && meta && (
              <div className="mt-lg border-t border-on-primary-container/20 pt-lg">
                <h5 className="mb-sm text-label-md text-on-primary-fixed">
                  Final Recommendation
                </h5>
                <div
                  className={[
                    "flex items-center justify-between gap-sm rounded-lg px-md py-sm font-semibold shadow-lg",
                    meta.tone === "success" &&
                      "bg-secondary text-on-secondary",
                    meta.tone === "warning" && "bg-amber-500 text-white",
                    meta.tone === "error" && "bg-error text-on-error",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span>{meta.label}</span>
                  <span className="text-label-md">{analysis.confidence}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Documents card — mocked, design parity */}
          <div className="mt-gutter rounded-xl border border-outline-variant bg-surface-container-low p-lg">
            <h4 className="mb-md text-label-md text-on-surface">
              Candidate Context
            </h4>
            <div className="space-y-sm">
              <DocumentRow
                icon="event"
                label={`Submitted ${formatDate(submission.submittedAt)}`}
              />
              <DocumentRow
                icon="schedule"
                label={`${submission.answers.length}/${submission.questionsSnapshot.length} responses captured`}
              />
              <DocumentRow
                icon="mail"
                label={submission.candidateEmail}
                action="open_in_new"
                onClick={() =>
                  window.open(`mailto:${submission.candidateEmail}`)
                }
              />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

/* ---------- Sub-components ---------- */

function AudioPlaceholder({ note }: { note?: string }) {
  return (
    <div className="mt-md space-y-md">
      <div className="flex items-center gap-md rounded-full border border-dashed border-outline-variant bg-surface-container p-sm pr-md opacity-80">
        <button
          type="button"
          disabled
          aria-disabled
          className="flex h-10 w-10 items-center justify-center rounded-full bg-outline-variant text-on-surface-variant"
        >
          <Icon name="play_arrow" />
        </button>
        <div className="relative flex-1 overflow-hidden rounded-full bg-outline-variant/40">
          <div className="h-1 w-1/3 rounded-full bg-secondary/60" />
        </div>
        <span className="text-label-sm text-on-surface-variant">
          Audio not available
        </span>
        <Icon name="volume_off" className="text-on-surface-variant" />
      </div>
      <p className="rounded-xl border-2 border-dashed border-outline-variant px-md py-md text-center text-body-sm text-on-surface-variant">
        Audio responses are a UI placeholder for this build.{" "}
        {note ? <em>Candidate note: &ldquo;{note}&rdquo;</em> : null}
      </p>
    </div>
  );
}

function AnalysisLoading() {
  return (
    <div className="space-y-md">
      <Skeleton className="h-3 w-24 bg-on-primary-container/20" />
      <Skeleton className="h-3 w-full bg-on-primary-container/20" />
      <Skeleton className="h-3 w-11/12 bg-on-primary-container/20" />
      <Skeleton className="h-3 w-3/4 bg-on-primary-container/20" />
      <Skeleton className="mt-lg h-3 w-20 bg-on-primary-container/20" />
      <div className="space-y-xs">
        <Skeleton className="h-3 w-5/6 bg-on-primary-container/20" />
        <Skeleton className="h-3 w-3/4 bg-on-primary-container/20" />
        <Skeleton className="h-3 w-4/6 bg-on-primary-container/20" />
      </div>
    </div>
  );
}

function AnalysisBody({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="space-y-lg">
      <section>
        <h5 className="mb-xs text-label-md text-on-primary-fixed">Summary</h5>
        <p className="text-body-sm leading-relaxed text-on-primary-container">
          {analysis.summary}
        </p>
      </section>
      <section>
        <h5 className="mb-sm text-label-md text-on-primary-fixed">
          Key Strengths
        </h5>
        <ul className="space-y-sm">
          {analysis.strengths.map((s) => (
            <li
              key={s}
              className="flex items-center gap-sm text-body-sm text-on-primary-container"
            >
              <Icon name="check_circle" className="text-secondary" fill={1} />
              {s}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h5 className="mb-sm text-label-md text-on-primary-fixed">
          Potential Concerns
        </h5>
        {analysis.concerns.map((c) => (
          <div
            key={c}
            className="flex items-start gap-sm rounded-lg border border-error/20 bg-error/10 p-sm"
          >
            <Icon name="warning" size={20} className="text-error" fill={1} />
            <p className="text-body-sm text-on-primary-container">{c}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function DocumentRow({
  icon,
  label,
  action,
  onClick,
}: {
  icon: string;
  label: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-sm">
      <div className="flex items-center gap-sm text-on-surface-variant">
        <Icon name={icon} />
        <span className="truncate text-label-sm">{label}</span>
      </div>
      {action && (
        <button
          type="button"
          onClick={onClick}
          aria-label={`Action: ${label}`}
          className="rounded-md p-xs text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <Icon name={action} size={18} />
        </button>
      )}
    </div>
  );
}
