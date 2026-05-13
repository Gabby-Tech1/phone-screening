"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useScreenings, useSubmissions, useMounted } from "@/lib/hooks";
import { deleteScreening, saveScreening } from "@/lib/storage";
import { makeCustomQuestion } from "@/data/question-templates";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionEditor } from "@/components/recruiter/question-editor";
import type { Job, Question, Screening } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface ScreeningEditorProps {
  job: Job;
  screeningId: string;
}

/**
 * Recruiter-facing editor for an existing screening template.
 *
 * Unlike the create-screening drawer, this is a full route. It hydrates the
 * draft from localStorage on mount, lets the recruiter mutate questions
 * (add / remove / reorder / change response type / rewrite), and persists by
 * calling `saveScreening` with the *original* id and createdAt — so the
 * template's "Saved X days ago" copy stays meaningful across edits.
 *
 * If the screening doesn't exist (stale link, cleared storage, wrong tab),
 * we render an empty state pointing back to the job.
 */
export function ScreeningEditor({ job, screeningId }: ScreeningEditorProps) {
  const router = useRouter();
  const { show } = useToast();
  const screenings = useScreenings();
  const submissions = useSubmissions();
  const mounted = useMounted();

  const original = useMemo(
    () => screenings.find((s) => s.id === screeningId && s.jobId === job.id),
    [screenings, screeningId, job.id]
  );

  // Local draft, seeded from `original` exactly once when it first becomes
  // available. We use the lazy-init form to keep the seed pure of effects.
  // After that, the draft is its own source of truth — re-renders from the
  // store cache don't clobber an in-flight edit.
  const [questions, setQuestions] = useState<Question[] | null>(null);
  if (questions === null && original) {
    setQuestions(original.questions);
  }

  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const clearDragState = () => {
    setDragId(null);
    setDragOverId(null);
  };

  const applicantCount = useMemo(
    () => submissions.filter((s) => s.jobId === job.id).length,
    [submissions, job.id]
  );

  const audioCount = useMemo(
    () => (questions ?? []).filter((q) => q.responseType === "audio").length,
    [questions]
  );

  const dirty = useMemo(() => {
    if (!original || !questions) return false;
    if (original.questions.length !== questions.length) return true;
    return original.questions.some((q, i) => {
      const cur = questions[i];
      return (
        !cur ||
        cur.id !== q.id ||
        cur.text !== q.text ||
        cur.responseType !== q.responseType
      );
    });
  }, [original, questions]);

  const canSave =
    !!original &&
    !!questions &&
    questions.length > 0 &&
    questions.every((q) => q.text.trim().length > 0) &&
    dirty &&
    !saving;

  /* ----- Mutations ----- */
  const updateQuestion = (q: Question) =>
    setQuestions((cur) => cur?.map((c) => (c.id === q.id ? q : c)) ?? cur);
  const removeQuestion = (id: string) =>
    setQuestions((cur) => cur?.filter((c) => c.id !== id) ?? cur);
  const addCustom = () =>
    setQuestions((cur) => [...(cur ?? []), makeCustomQuestion("")]);
  const move = (id: string, dir: -1 | 1) =>
    setQuestions((cur) => {
      if (!cur) return cur;
      const idx = cur.findIndex((q) => q.id === id);
      if (idx === -1) return cur;
      const next = idx + dir;
      if (next < 0 || next >= cur.length) return cur;
      const copy = cur.slice();
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  const moveTo = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setQuestions((cur) => {
      if (!cur) return cur;
      const from = cur.findIndex((q) => q.id === fromId);
      const to = cur.findIndex((q) => q.id === toId);
      if (from === -1 || to === -1) return cur;
      const copy = cur.slice();
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  const handleSave = useCallback(() => {
    if (!canSave || !original || !questions) return;
    setSaving(true);
    const next: Screening = {
      id: original.id,
      jobId: original.jobId,
      createdAt: original.createdAt,
      questions: questions.filter((q) => q.text.trim().length > 0),
    };
    setTimeout(() => {
      saveScreening(next);
      show("Screening updated");
      setSaving(false);
      router.push(`/jobs/${job.id}`);
    }, 300);
  }, [canSave, job.id, original, questions, router, show]);

  const handleDelete = useCallback(() => {
    if (!original) return;
    if (
      !confirm(
        `Delete the screening template for ${job.title}? Existing applicant responses are kept, but new candidates won't have questions to answer.`
      )
    )
      return;
    deleteScreening(original.id);
    show("Screening deleted");
    router.push(`/jobs/${job.id}`);
  }, [job.id, job.title, original, router, show]);

  /* ----- Render ----- */

  // SSR / pre-hydration — the store is empty until `useMounted` flips. Show a
  // light skeleton so the page isn't blank.
  if (!mounted) return <EditorSkeleton job={job} />;

  if (!original) {
    return (
      <>
        <BackLink job={job} />
        <EmptyState
          icon="search_off"
          title="Screening not found"
          description="This template may have been deleted, or the link is stale. Pick a screening from the job page to keep editing."
          action={
            <Link href={`/jobs/${job.id}`}>
              <Button variant="outline">Back to {job.title}</Button>
            </Link>
          }
          className="py-2xl"
        />
      </>
    );
  }

  const list = questions ?? original.questions;

  return (
    <>
      <BackLink job={job} />

      <header className="mb-xl flex flex-col gap-md md:flex-row md:items-end md:justify-between">
        <div className="space-y-xs">
          <Chip tone="secondary">Editing screening</Chip>
          <h2 className="text-headline-lg tracking-tight text-on-surface">
            {job.title}
          </h2>
          <p className="text-body-md text-on-surface-variant">
            Saved {formatDate(original.createdAt)} · {list.length} question
            {list.length === 1 ? "" : "s"} · {audioCount} audio ·{" "}
            {applicantCount} applicant{applicantCount === 1 ? "" : "s"} have
            already responded
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <Button
            variant="ghost"
            className="!text-error hover:!bg-error/10"
            leadingIcon={<Icon name="delete" />}
            onClick={handleDelete}
            disabled={saving}
          >
            Delete template
          </Button>
        </div>
      </header>

      {applicantCount > 0 && (
        <p className="mb-lg flex items-start gap-sm rounded-lg border border-outline-variant bg-surface-container-low p-md text-body-sm text-on-surface-variant">
          <Icon name="info" className="mt-[2px] text-secondary" />
          <span>
            Edits only affect <strong>new</strong> screening attempts. The{" "}
            {applicantCount} candidate{applicantCount === 1 ? "" : "s"} who
            already submitted answered an earlier version of these questions,
            and their responses stay tied to that snapshot.
          </span>
        </p>
      )}

      <ul className="space-y-md">
        {list.map((q, i) => (
          <li key={q.id}>
            <QuestionEditor
              index={i}
              question={q}
              onChange={updateQuestion}
              onRemove={() => removeQuestion(q.id)}
              onMoveUp={i > 0 ? () => move(q.id, -1) : undefined}
              onMoveDown={
                i < list.length - 1 ? () => move(q.id, 1) : undefined
              }
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", q.id);
                setDragId(q.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverId !== q.id) setDragOverId(q.id);
              }}
              onDrop={() => {
                if (dragId) moveTo(dragId, q.id);
                clearDragState();
              }}
              onDragEnd={clearDragState}
              isDragging={dragId === q.id}
              isDragOver={dragOverId === q.id && dragId !== q.id}
            />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addCustom}
        className="mt-md flex w-full items-center justify-center gap-sm rounded-xl border-2 border-dashed border-outline-variant py-md text-label-md text-on-surface-variant transition-all hover:border-secondary hover:bg-secondary/5 hover:text-secondary"
      >
        <Icon name="add_circle" />
        Add Custom Question
      </button>

      <footer className="sticky bottom-0 -mx-gutter mt-xl flex items-center justify-between gap-md border-t border-outline-variant bg-surface-container-lowest/95 px-gutter py-md backdrop-blur-md">
        <span className="text-label-sm text-on-surface-variant">
          {dirty ? (
            <span className="inline-flex items-center gap-xs text-secondary">
              <Icon name="edit" size={16} />
              Unsaved changes
            </span>
          ) : (
            <span className="inline-flex items-center gap-xs">
              <Icon name="check_circle" size={16} />
              Up to date
            </span>
          )}
        </span>
        <div className="flex items-center gap-sm">
          <Link href={`/jobs/${job.id}`}>
            <Button variant="ghost" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button
            className="text-white dark:text-black"
            onClick={handleSave}
            disabled={!canSave}
            loading={saving}
          >
            Save Changes
          </Button>
        </div>
      </footer>
    </>
  );
}

function BackLink({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="mb-md inline-flex items-center gap-xs text-label-md text-secondary transition-opacity hover:opacity-80"
    >
      <Icon name="arrow_back" size={18} />
      Back to {job.title}
    </Link>
  );
}

function EditorSkeleton({ job }: { job: Job }) {
  return (
    <>
      <BackLink job={job} />
      <Skeleton className="mb-md h-6 w-24" />
      <Skeleton className="mb-xs h-10 w-2/3" />
      <Skeleton className="mb-xl h-4 w-1/2" />
      <div className="space-y-md">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </>
  );
}
