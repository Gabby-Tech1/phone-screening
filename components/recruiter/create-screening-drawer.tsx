"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { jobs } from "@/data/jobs";
import { findScreeningByJob, saveScreening } from "@/lib/storage";
import {
  generateQuestionsForJob,
  makeCustomQuestion,
} from "@/data/question-templates";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { QuestionEditor } from "./question-editor";
import type { Question, Screening } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  defaultJobId?: string;
}

/**
 * Public drawer component. We render nothing when `open=false`. When the
 * caller flips it on, React mounts a fresh `DrawerImpl` and any in-flight
 * draft state is naturally discarded — no setState-in-effect reset needed.
 */
export function CreateScreeningDrawer(props: DrawerProps) {
  if (!props.open) return null;
  return <DrawerImpl {...props} />;
}

function DrawerImpl({ open, onClose, defaultJobId }: DrawerProps) {
  const router = useRouter();
  const { show } = useToast();

  const [jobId, setJobId] = useState<string>(defaultJobId ?? "");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  // Lock body scroll while mounted.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const canGenerate = jobId.length > 0;
  const canSave = jobId.length > 0 && questions.length > 0 && !generating;

  // Estimated duration: assume ~40 seconds per text Q, ~60s per audio Q.
  const estimatedMinutes = useMemo(() => {
    const seconds = questions.reduce(
      (acc, q) => acc + (q.responseType === "audio" ? 60 : 40),
      0
    );
    return Math.max(1, Math.round(seconds / 60));
  }, [questions]);

  const stepProgress = useMemo(() => {
    // 4 segments. 1: job picked; 2: questions generated; 3: edited (touched);
    // 4: save in progress.
    let current = 0;
    if (jobId) current = 1;
    if (questions.length > 0) current = 2;
    if (touched) current = 3;
    if (saving) current = 4;
    return { total: 4, current };
  }, [jobId, questions, touched, saving]);

  const handleGenerate = useCallback(() => {
    if (!canGenerate) return;
    setGenerating(true);
    // Simulated AI latency — keeps the button feeling intentional.
    setTimeout(() => {
      setQuestions(generateQuestionsForJob(jobId));
      setGenerating(false);
    }, 700);
  }, [canGenerate, jobId]);

  const handleSave = useCallback(() => {
    if (!canSave) return;
    setSaving(true);
    const screening: Screening = {
      id: uid("scr"),
      jobId,
      createdAt: new Date().toISOString(),
      questions: questions.filter((q) => q.text.trim().length > 0),
    };
    // Tiny delay to let the spinner breathe; UX > raw speed here.
    setTimeout(() => {
      saveScreening(screening);
      show("Screening template saved");
      setSaving(false);
      onClose();
      router.push(`/jobs/${jobId}`);
    }, 350);
  }, [canSave, jobId, questions, onClose, router, show]);

  // ----- Question list mutations -----
  const updateQuestion = (q: Question) => {
    setTouched(true);
    setQuestions((cur) => cur.map((c) => (c.id === q.id ? q : c)));
  };
  const removeQuestion = (id: string) => {
    setTouched(true);
    setQuestions((cur) => cur.filter((c) => c.id !== id));
  };
  const addCustom = () => {
    setTouched(true);
    setQuestions((cur) => [...cur, makeCustomQuestion("")]);
  };
  const move = (id: string, dir: -1 | 1) => {
    setTouched(true);
    setQuestions((cur) => {
      const idx = cur.findIndex((q) => q.id === id);
      if (idx === -1) return cur;
      const next = idx + dir;
      if (next < 0 || next >= cur.length) return cur;
      const copy = cur.slice();
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  };
  const moveTo = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setTouched(true);
    setQuestions((cur) => {
      const from = cur.findIndex((q) => q.id === fromId);
      const to = cur.findIndex((q) => q.id === toId);
      if (from === -1 || to === -1) return cur;
      const copy = cur.slice();
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  // Drag state. We keep these in React state (not refs) so we can read them
  // during render without violating the "no refs during render" rule.
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const clearDragState = () => {
    setDragId(null);
    setDragOverId(null);
  };

  // Warn if the recruiter already has a screening for this job.
  const existing = useMemo(
    () => (jobId ? findScreeningByJob(jobId) : undefined),
    [jobId]
  );

  // `open` is always true here — wrapper short-circuits on close.
  void open;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-screening-title"
      className="fixed inset-0 z-[80] flex"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close create screening"
        onClick={() => !saving && onClose()}
        className="flex-1 bg-black/40 backdrop-blur-sm transition-opacity"
        style={{ animation: "fadeIn 200ms ease-out" }}
      />

      {/* Panel */}
      <div
        className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden border-l border-outline-variant bg-surface shadow-2xl"
        style={{ animation: "slideIn 260ms ease-out" }}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-md border-b border-outline-variant bg-surface-container-lowest px-xl py-lg">
          <div>
            <h2
              id="create-screening-title"
              className="text-headline-lg tracking-tight text-on-surface"
            >
              Phone Screening Setup
            </h2>
            <p className="mt-xs text-body-md text-on-surface-variant">
              Configure automated screening questions for your recruitment funnel.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => !saving && onClose()}
            className="rounded-lg p-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="px-xl pt-md">
          <ProgressBar value={stepProgress.current / stepProgress.total} segmented={stepProgress} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-xl py-lg">
          {/* Step 1 */}
          <section className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
            <Select
              label="Step 1 — Select active job listing"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              required
            >
              <option value="" disabled>
                Choose a job…
              </option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} · {j.location}
                </option>
              ))}
            </Select>
            {existing && (
              <p className="mt-sm flex items-center gap-xs text-label-sm text-on-surface-variant">
                <Icon name="info" size={16} />
                A screening already exists for this job — saving will replace it.
              </p>
            )}
          </section>

          {/* Step 2 */}
          <div className="mb-lg flex justify-center">
            <Button
              variant="primary"
              size="lg"
              className="text-white dark:text-black"
              onClick={handleGenerate}
              loading={generating}
              disabled={!canGenerate}
              leadingIcon={
                <Icon
                  name="auto_awesome"
                  fill={1}
                  className={generating ? "animate-spin" : undefined}
                />
              }
            >
              {questions.length > 0 ? "Regenerate Questions" : "Generate AI Questions"}
            </Button>
          </div>

          {/* Step 3 */}
          {questions.length > 0 && (
            <div className="space-y-md">
              <div className="flex items-center justify-between gap-md">
                <h3 className="text-headline-sm text-on-surface">
                  Screening Questions ({questions.length})
                </h3>
                <span className="rounded-md bg-surface-container px-sm py-xs text-label-sm text-on-surface-variant">
                  Estimated duration · {estimatedMinutes} min
                </span>
              </div>

              <ul className="space-y-md">
                {questions.map((q, i) => (
                  <li key={q.id}>
                    <QuestionEditor
                      index={i}
                      question={q}
                      onChange={updateQuestion}
                      onRemove={() => removeQuestion(q.id)}
                      onMoveUp={i > 0 ? () => move(q.id, -1) : undefined}
                      onMoveDown={
                        i < questions.length - 1
                          ? () => move(q.id, 1)
                          : undefined
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
                className="flex w-full items-center justify-center gap-sm rounded-xl border-2 border-dashed border-outline-variant py-md text-label-md text-on-surface-variant transition-all hover:border-secondary hover:bg-secondary/5 hover:text-secondary"
              >
                <Icon name="add_circle" />
                Add Custom Question
              </button>
            </div>
          )}

          {/* Empty state when nothing generated */}
          {questions.length === 0 && !generating && (
            <div className="mt-lg rounded-xl border border-dashed border-outline-variant bg-surface-container-low/60 p-xl text-center">
              <Icon
                name="auto_awesome"
                size={32}
                className="text-on-surface-variant"
              />
              <p className="mt-sm text-body-md text-on-surface-variant">
                Pick a job above and hit{" "}
                <span className="font-semibold text-on-surface">Generate</span>{" "}
                to draft 5–8 tailored screening questions you can edit before
                saving.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer
          className={cn(
            "flex items-center justify-end gap-md border-t border-outline-variant bg-surface-container-lowest px-xl py-md",
            saving && "pointer-events-none"
          )}
        >
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel &amp; Discard
          </Button>
          <Button
            className="text-white dark:text-black"
            onClick={handleSave}
            disabled={!canSave}
            loading={saving}
          >
            Save Screening Template
          </Button>
        </footer>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
      `}</style>
    </div>
  );
}
