"use client";

import { useCallback, useMemo, useState } from "react";
import { useScreenings } from "@/lib/hooks";
import { saveSubmission } from "@/lib/storage";
import { generateQuestionsForJob } from "@/data/question-templates";
import type { Answer, Job, Question, Submission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input, Textarea } from "@/components/ui/input";
import { AudioRecorder } from "@/components/candidate/audio-recorder";
import { cn, isEmail, uid } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface AudioClip {
  audioDataUrl: string;
  audioDurationMs: number;
}

type Stage = "welcome" | "question" | "done";

interface CandidateFlowProps {
  job: Job;
}

/**
 * Candidate-facing screening flow. Three stages:
 *   welcome → collects name + email (both required, email validated)
 *   question → renders Q's one at a time with a progress bar
 *   done → confirmation screen
 *
 * Question source priority:
 *   1. A screening saved by the recruiter (localStorage) for this job, OR
 *   2. The seeded question-template fallback so the public link works
 *      even before a recruiter customizes it.
 */
export function CandidateFlow({ job }: CandidateFlowProps) {
  const screenings = useScreenings();
  const [stage, setStage] = useState<Stage>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [audioAnswers, setAudioAnswers] = useState<Record<string, AudioClip>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  // Pick the screening for this job; fall back to a deterministic seed set.
  const screening = useMemo(
    () =>
      screenings
        .filter((s) => s.jobId === job.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [screenings, job.id]
  );

  const [fallback] = useState<Question[]>(() => generateQuestionsForJob(job.id));
  const questions = screening?.questions ?? fallback;
  const total = questions.length;

  // Track elapsed time for the thank-you summary. We set this once at the
  // moment we transition from welcome → question. Doing it inside the
  // `startScreening` handler is the React-idiomatic place for that side
  // effect; storing it as state is fine because it's set exactly once.
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const minutesSpent = useMemo(() => {
    if (!startedAt || !submittedAt) return 0;
    const ms = new Date(submittedAt).getTime() - startedAt;
    return Math.max(1, Math.round(ms / 60_000));
  }, [startedAt, submittedAt]);

  const validateWelcome = (): boolean => {
    const e: { name?: string; email?: string } = {};
    if (!name.trim()) e.name = "Please enter your full name";
    if (!email.trim()) e.email = "Please enter your email";
    else if (!isEmail(email)) e.email = "That doesn't look like a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const startScreening = () => {
    if (!validateWelcome()) return;
    setStartedAt(Date.now());
    setStage("question");
    setQuestionIndex(0);
  };

  const currentQuestion = questions[questionIndex];
  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] ?? "") : "";
  const currentAudio = currentQuestion
    ? (audioAnswers[currentQuestion.id] ?? null)
    : null;
  // Either a non-empty text response OR a captured audio clip lets the
  // candidate advance. For text-only questions, audio is ignored.
  const canAdvance =
    currentAnswer.trim().length > 0 ||
    (currentQuestion?.responseType === "audio" && !!currentAudio);

  const onAnswer = (val: string) => {
    if (!currentQuestion) return;
    setAnswers((cur) => ({ ...cur, [currentQuestion.id]: val }));
  };

  const onAudio = (clip: AudioClip | null) => {
    if (!currentQuestion) return;
    setAudioAnswers((cur) => {
      const next = { ...cur };
      if (clip) next[currentQuestion.id] = clip;
      else delete next[currentQuestion.id];
      return next;
    });
  };

  const next = () => {
    if (!canAdvance) return;
    if (questionIndex < total - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      submit();
    }
  };
  const prev = () => {
    if (questionIndex > 0) setQuestionIndex((i) => i - 1);
  };

  const submit = useCallback(() => {
    if (!screening && fallback.length === 0) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    const submission: Submission = {
      id: uid("sub"),
      jobId: job.id,
      screeningId: screening?.id ?? "fallback",
      candidateName: name.trim(),
      candidateEmail: email.trim().toLowerCase(),
      answers: questions.map<Answer>((q) => {
        const clip = audioAnswers[q.id];
        return {
          questionId: q.id,
          responseType: q.responseType,
          value: (answers[q.id] ?? "").trim(),
          ...(clip
            ? {
                audioDataUrl: clip.audioDataUrl,
                audioDurationMs: clip.audioDurationMs,
              }
            : {}),
        };
      }),
      submittedAt: now,
      questionsSnapshot: questions,
    };
    setTimeout(() => {
      saveSubmission(submission);
      setSubmittedAt(now);
      setSubmissionId(submission.id);
      setSubmitting(false);
      setStage("done");
    }, 600);
  }, [answers, audioAnswers, email, fallback.length, job.id, name, questions, screening]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {stage === "welcome" && (
        <WelcomeStage
          job={job}
          total={total}
          name={name}
          email={email}
          errors={errors}
          onName={setName}
          onEmail={setEmail}
          onStart={startScreening}
        />
      )}
      {stage === "question" && currentQuestion && (
        <QuestionStage
          job={job}
          index={questionIndex}
          total={total}
          question={currentQuestion}
          value={currentAnswer}
          audio={currentAudio}
          onChange={onAnswer}
          onAudio={onAudio}
          onNext={next}
          onPrev={prev}
          submitting={submitting}
          canAdvance={canAdvance}
        />
      )}
      {stage === "done" && (
        <DoneStage
          job={job}
          name={name}
          email={email}
          submissionId={submissionId}
          submittedAt={submittedAt}
          minutesSpent={minutesSpent}
          totalAnswers={Object.keys(answers).filter((k) => answers[k].trim()).length}
          totalQuestions={total}
          totalAudio={Object.keys(audioAnswers).length}
        />
      )}
    </div>
  );
}

/* =====================  STAGE: WELCOME  ===================== */

function WelcomeStage({
  job,
  total,
  name,
  email,
  errors,
  onName,
  onEmail,
  onStart,
}: {
  job: Job;
  total: number;
  name: string;
  email: string;
  errors: { name?: string; email?: string };
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onStart: () => void;
}) {
  return (
    <>
      <CandidateProgressHeader step="Step 1 of 4" label="Introduction" pct={0.25} />
      <main className="flex flex-1 items-center justify-center px-gutter pt-32 pb-xl">
        <div className="w-full max-w-[640px]">
          <div className="mb-xl text-center">
            <div className="mb-lg inline-flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container-high">
              <Icon name="apartment" size={32} className="text-secondary" fill={1} />
            </div>
            <h1 className="text-headline-lg text-on-surface">
              Welcome to Remotown
            </h1>
            <p className="mt-xs text-body-lg text-on-surface-variant">
              Screening for:{" "}
              <span className="font-semibold text-on-surface">{job.title}</span>
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
            <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-secondary/15 via-primary/5 to-transparent">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-label-sm font-bold uppercase tracking-[0.3em] text-secondary">
                    WELCOME
                  </p>
                  <p className="mt-xs text-body-sm text-on-surface-variant">
                    {job.department} · {job.location}
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent" />
            </div>

            <div className="space-y-lg p-xl">
              <div className="space-y-md">
                <h2 className="text-headline-sm text-on-surface">
                  Let&rsquo;s get started
                </h2>
                <p className="text-body-md text-on-surface-variant">
                  We&rsquo;re excited to learn more about your experience and
                  how you might fit into the Remotown team. This screening will
                  take about {Math.max(5, Math.ceil(total * 1.5))} minutes —
                  there are <strong>{total}</strong> questions.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onStart();
                }}
                className="space-y-lg"
                noValidate
              >
                <Input
                  label="Full Name"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => onName(e.target.value)}
                  error={errors.name}
                  autoComplete="name"
                  autoFocus
                />
                <Input
                  label="Email Address"
                  required
                  type="email"
                  placeholder="alex.rivera@example.com"
                  value={email}
                  onChange={(e) => onEmail(e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                />
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  className="text-white dark:text-black"
                  trailingIcon={<Icon name="arrow_forward" />}
                >
                  Start Assessment
                </Button>
              </form>

              <div className="flex items-start gap-md rounded-lg border border-outline-variant/30 bg-surface-container-low p-md">
                <Icon name="info" className="text-on-surface-variant" />
                <p className="text-body-sm text-on-surface-variant">
                  Your information is used strictly for recruitment purposes.
                  By proceeding, you agree to our{" "}
                  <a className="text-secondary underline underline-offset-2" href="#">
                    Candidate Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>

          <p className="mt-xl text-center text-label-md text-on-surface-variant">
            <span className="inline-flex items-center gap-xs">
              <Icon name="help_outline" size={18} />
              Need help? Contact support
            </span>
          </p>
        </div>
      </main>
    </>
  );
}

function CandidateProgressHeader({
  step,
  label,
  pct,
}: {
  step: string;
  label: string;
  pct: number;
}) {
  return (
    <nav className="fixed top-0 left-0 z-50 w-full bg-surface/80 backdrop-blur-md">
      <div className="mx-auto max-w-[640px] px-gutter py-md">
        <div className="mb-sm flex items-center justify-between">
          <span className="text-label-sm font-bold uppercase tracking-wider text-secondary">
            {step}
          </span>
          <span className="text-label-sm text-on-surface-variant">{label}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="h-full rounded-full bg-secondary transition-[width] duration-500"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>
    </nav>
  );
}

/* =====================  STAGE: QUESTION  ===================== */

function QuestionStage({
  job,
  index,
  total,
  question,
  value,
  audio,
  onChange,
  onAudio,
  onNext,
  onPrev,
  submitting,
  canAdvance,
}: {
  job: Job;
  index: number;
  total: number;
  question: Question;
  value: string;
  audio: AudioClip | null;
  onChange: (v: string) => void;
  onAudio: (clip: AudioClip | null) => void;
  onNext: () => void;
  onPrev: () => void;
  submitting: boolean;
  canAdvance: boolean;
}) {
  const last = index === total - 1;
  return (
    <>
      <header className="fixed top-0 left-0 z-50 w-full bg-surface-container-lowest">
        <div className="mx-auto flex h-2 max-w-4xl items-center overflow-hidden bg-surface-variant">
          <div
            className="h-full bg-secondary transition-[width] duration-500"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-md px-gutter py-md">
          <div className="flex items-center gap-sm">
            <span className="text-headline-sm font-bold text-on-surface">
              Remotown
            </span>
            <span className="h-4 w-px bg-outline-variant" />
            <span className="text-label-md text-on-surface-variant">
              {job.title} Screening
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm("Exit the screening? Your progress will not be saved.")) {
                window.location.href = "/";
              }
            }}
            className="inline-flex items-center gap-xs text-label-md text-on-surface-variant hover:text-secondary"
          >
            <Icon name="close" size={20} />
            Save &amp; Exit
          </button>
        </div>
      </header>

      <main className="flex flex-grow items-center justify-center px-gutter pt-32 pb-40">
        <div className="w-full max-w-[640px] space-y-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-xl"
            >
              <div className="space-y-sm text-left">
                <p className="text-label-md font-semibold uppercase tracking-wider text-secondary">
                  Question {index + 1} of {total}
                </p>
                <h1 className="text-headline-lg text-on-surface">
                  {question.text}
                </h1>
              </div>

              <div className="space-y-lg">
                <Textarea
                  label={
                    question.responseType === "audio"
                      ? "Written Response (optional if you record)"
                      : "Written Response"
                  }
                  rows={8}
                  value={value}
                  placeholder="Type your response here…"
                  onChange={(e) => onChange(e.target.value)}
                  required={question.responseType !== "audio"}
                />

                {question.responseType === "audio" && (
                  <div className="space-y-sm">
                    <div className="flex items-center gap-md py-sm">
                      <div className="h-px flex-grow bg-outline-variant" />
                      <span className="text-label-sm uppercase text-outline">
                        Or
                      </span>
                      <div className="h-px flex-grow bg-outline-variant" />
                    </div>

                    <label className="block text-label-sm uppercase text-on-surface-variant">
                      Voice Response (Optional)
                    </label>
                    <AudioRecorder value={audio} onChange={onAudio} />
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer nav */}
      <footer className="fixed bottom-0 left-0 z-40 w-full border-t border-outline-variant/30 bg-surface-container-lowest px-gutter py-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-md">
          <Button
            variant="ghost"
            onClick={onPrev}
            disabled={index === 0 || submitting}
            leadingIcon={<Icon name="arrow_back" />}
          >
            Back
          </Button>
          <ol className="hidden items-center gap-xs md:flex" aria-hidden>
            {Array.from({ length: total }).map((_, i) => (
              <li
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i <= index ? "bg-secondary" : "bg-outline-variant"
                }`}
              />
            ))}
          </ol>
          <Button
            onClick={onNext}
            disabled={!canAdvance}
            loading={submitting && last}
            className="text-white dark:text-black"
            trailingIcon={
              !submitting && <Icon name={last ? "check" : "arrow_forward"} />
            }
          >
            {last ? "Submit Responses" : "Next Question"}
          </Button>
        </div>
      </footer>
    </>
  );
}

/* =====================  STAGE: DONE  ===================== */

function DoneStage({
  job,
  name,
  email,
  submissionId,
  submittedAt,
  minutesSpent,
  totalAnswers,
  totalQuestions,
  totalAudio,
}: {
  job: Job;
  name: string;
  email: string;
  submissionId: string | null;
  submittedAt: string | null;
  minutesSpent: number;
  totalAnswers: number;
  totalQuestions: number;
  totalAudio: number;
}) {
  const firstName = name.trim().split(/\s+/)[0] || "there";
  // Short, human-friendly reference code derived from the submission id.
  // Format: AAAA-BBBB. Falls back to a placeholder during the first paint
  // before the parent has set the id.
  const referenceCode = useMemo(() => {
    if (!submissionId) return "————-————";
    const hex = submissionId
      .replace(/[^a-z0-9]/gi, "")
      .toUpperCase()
      .slice(-8)
      .padStart(8, "0");
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
  }, [submissionId]);

  const submittedAtDate = submittedAt ? new Date(submittedAt) : new Date();
  const timeString = submittedAtDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateString = submittedAtDate.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Layered ambient background. Sits behind everything; pointer-events-none
          so it doesn't interfere with playback / scroll. */}
      <BackgroundDecor />

      <header className="fixed top-0 left-0 z-40 w-full border-b border-outline-variant/30 bg-surface-container-lowest/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-container-max items-center justify-between px-gutter">
          <span className="text-headline-sm font-bold text-on-surface">
            Remotown
          </span>
          <span className="hidden text-label-md text-on-surface-variant sm:inline">
            Candidate Portal
          </span>
        </div>
      </header>

      <motion.main
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
        }}
        className="relative z-10 mx-auto flex w-full max-w-[680px] flex-col items-center px-gutter pt-28 pb-2xl"
      >
        {/* ───── Hero ───── */}
        <motion.div variants={fadeUp} className="relative w-full">
          <SuccessBadge />
        </motion.div>

        <motion.div variants={fadeUp} className="mt-xl text-center">
          <span className="inline-flex items-center gap-xs rounded-full border border-secondary/30 bg-secondary/10 px-md py-xs text-label-sm font-semibold uppercase tracking-wider text-secondary">
            <Icon name="check_circle" size={16} fill={1} />
            Submission received
          </span>
          <h1 className="mt-md text-display-lg tracking-tight text-on-surface">
            Thanks, {firstName}.
          </h1>
          <p className="mx-auto mt-sm max-w-[520px] text-body-lg text-on-surface-variant">
            Your responses for the{" "}
            <span className="font-semibold text-on-surface">{job.title}</span>{" "}
            screening are with the hiring team. They&rsquo;ll be in touch at{" "}
            <span className="font-semibold text-on-surface">{email}</span>.
          </p>
        </motion.div>

        {/* ───── Receipt ───── */}
        <motion.div variants={fadeUp} className="mt-xl w-full">
          <Receipt
            code={referenceCode}
            job={job.title}
            submittedAt={`${dateString} · ${timeString}`}
          />
        </motion.div>

        {/* ───── Stats row ───── */}
        <motion.div
          variants={fadeUp}
          className="mt-gutter grid w-full grid-cols-2 gap-sm sm:grid-cols-4"
        >
          <Stat icon="timer" label="Time" value={`${minutesSpent || 1}m`} />
          <Stat
            icon="fact_check"
            label="Answered"
            value={`${totalAnswers}/${totalQuestions}`}
          />
          <Stat
            icon="graphic_eq"
            label="Audio"
            value={totalAudio > 0 ? `${totalAudio} clip${totalAudio === 1 ? "" : "s"}` : "—"}
          />
          <Stat icon="event" label="Date" value={dateString} />
        </motion.div>

        {/* ───── Next steps ───── */}
        <motion.section
          variants={fadeUp}
          className="mt-gutter w-full overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm"
        >
          <header className="flex items-center justify-between gap-md border-b border-outline-variant bg-surface-container-low px-lg py-md">
            <div className="flex items-center gap-sm">
              <span className="rounded-lg bg-secondary/10 p-xs text-secondary">
                <Icon name="route" fill={1} size={20} />
              </span>
              <h3 className="text-headline-sm text-on-surface">
                What happens next
              </h3>
            </div>
            <span className="hidden text-label-sm text-on-surface-variant sm:inline">
              Avg. response 48–72h
            </span>
          </header>
          <ol className="divide-y divide-outline-variant/60">
            <NextStep
              state="done"
              icon="check"
              title="Initial screening completed"
              subtitle={`Today · ${timeString}`}
              eta="Just now"
            />
            <NextStep
              state="current"
              icon="hourglass_empty"
              title="Recruiter review"
              subtitle="A human will read your full set of responses."
              eta="48 – 72 hrs"
            />
            <NextStep
              state="upcoming"
              icon="forum"
              title="Technical interview"
              subtitle="If we move forward, a recruiter schedules a 45-minute call."
              eta="Next week"
            />
            <NextStep
              state="upcoming"
              icon="celebration"
              title="Decision & offer"
              subtitle="Final round + offer if there's a fit."
              eta="~2 weeks"
            />
          </ol>
        </motion.section>

        {/* ───── Tip cards ───── */}
        <motion.div
          variants={fadeUp}
          className="mt-gutter grid w-full grid-cols-1 gap-sm sm:grid-cols-3"
        >
          <Tip
            icon="bookmark"
            title="Save your reference code"
            body={`Quote ${referenceCode} when emailing us — it pulls up your submission instantly.`}
          />
          <Tip
            icon="mark_email_read"
            title="Watch your inbox"
            body="Add hiring@remotown.com to your contacts so updates don't land in spam."
          />
          <Tip
            icon="explore"
            title="Explore other roles"
            body="Browse open positions at Remotown while you wait to hear back."
          />
        </motion.div>

        {/* ───── CTAs ───── */}
        <motion.div
          variants={fadeUp}
          className="mt-gutter flex w-full flex-col gap-sm sm:flex-row sm:justify-center"
        >
          <Link href="/jobs" className="flex-1 sm:flex-initial">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              trailingIcon={<Icon name="arrow_forward" />}
            >
              Browse open roles
            </Button>
          </Link>
          <Link href={`/jobs/${job.id}`} className="flex-1 sm:flex-initial">
            <Button variant="outline" size="lg" fullWidth>
              Back to {job.title}
            </Button>
          </Link>
        </motion.div>

        {/* ───── Footer support ───── */}
        <motion.footer
          variants={fadeUp}
          className="mt-2xl flex w-full flex-col items-center gap-xs border-t border-outline-variant/40 pt-lg text-center"
        >
          <p className="text-body-sm text-on-surface-variant">
            Need help or want to update your answers?
          </p>
          <a
            href="mailto:support@remotown.com"
            className="inline-flex items-center gap-xs text-label-md font-semibold text-secondary transition-opacity hover:opacity-80"
          >
            <Icon name="mail" size={18} />
            support@remotown.com
          </a>
        </motion.footer>
      </motion.main>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/** Big animated success seal at the top of the page. */
function SuccessBadge() {
  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
      {/* Outer ring pulse */}
      <motion.span
        aria-hidden
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{
          scale: [0.9, 1.15, 1],
          opacity: [0, 0.25, 0],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
        className="absolute inset-0 rounded-full bg-secondary/30 blur-2xl"
      />
      {/* Middle ring */}
      <motion.span
        aria-hidden
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.05, ease: "easeOut" }}
        className="absolute inset-4 rounded-full border border-secondary/40 bg-secondary/5"
      />
      {/* Inner disc */}
      <motion.span
        aria-hidden
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        className="absolute inset-9 rounded-full bg-gradient-to-br from-secondary to-secondary/70 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.35)]"
      />
      {/* Check */}
      <motion.span
        initial={{ scale: 0, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ delay: 0.32, duration: 0.45, type: "spring", bounce: 0.5 }}
        className="relative z-10 text-on-secondary"
      >
        <Icon name="check" size={56} fill={1} />
      </motion.span>
      {/* Sparkles */}
      <Sparkle className="-top-1 left-3 text-secondary" delay={0.55} />
      <Sparkle className="top-1/4 -right-2 text-secondary/70" delay={0.65} small />
      <Sparkle className="-bottom-1 left-1/3 text-secondary/80" delay={0.75} />
      <Sparkle className="bottom-6 -right-3 text-secondary/60" delay={0.85} small />
    </div>
  );
}

function Sparkle({
  className,
  delay,
  small,
}: {
  className?: string;
  delay: number;
  small?: boolean;
}) {
  return (
    <motion.span
      aria-hidden
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1, 0.85], opacity: [0, 1, 0.9] }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className={cn("absolute", className)}
    >
      <Icon name="auto_awesome" fill={1} size={small ? 16 : 22} />
    </motion.span>
  );
}

/** Receipt-style confirmation card with a copyable reference code. */
function Receipt({
  code,
  job,
  submittedAt,
}: {
  code: string;
  job: string;
  submittedAt: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore — clipboard not available */
    }
  }
  return (
    <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      {/* Top dotted strip for a "receipt" feel */}
      <div className="flex h-1.5 bg-secondary" />
      <div className="grid grid-cols-1 gap-md p-lg sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-xs text-left">
          <p className="text-label-sm uppercase tracking-wider text-on-surface-variant">
            Confirmation reference
          </p>
          <p className="font-mono text-display-sm tracking-[0.12em] text-on-surface">
            {code}
          </p>
          <p className="text-label-sm text-on-surface-variant">
            {job} · Submitted {submittedAt}
          </p>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className={cn(
            "inline-flex items-center justify-center gap-xs self-start rounded-lg border px-md py-sm text-label-md font-semibold transition-all active:scale-[0.97] sm:self-center",
            copied
              ? "border-secondary bg-secondary text-white dark:text-black"
              : "border-outline-variant bg-surface-container-low text-on-surface hover:border-secondary/40 hover:bg-secondary/5"
          )}
        >
          <Icon name={copied ? "check" : "content_copy"} size={18} />
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-center transition-colors hover:border-secondary/30 hover:bg-surface-container-low">
      <span className="rounded-lg bg-secondary/10 p-xs text-secondary">
        <Icon name={icon} size={20} />
      </span>
      <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <span className="text-headline-sm font-semibold text-on-surface">
        {value}
      </span>
    </div>
  );
}

function NextStep({
  state,
  icon,
  title,
  subtitle,
  eta,
}: {
  state: "done" | "current" | "upcoming";
  icon: string;
  title: string;
  subtitle: string;
  eta?: string;
}) {
  return (
    <li className="flex items-start gap-md px-lg py-md">
      <div
        className={cn(
          "relative mt-[2px] flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          state === "done" && "bg-secondary text-white dark:text-black",
          state === "current" &&
            "border-2 border-secondary bg-surface-container-lowest text-secondary",
          state === "upcoming" &&
            "border-2 border-outline-variant bg-surface-container-low text-outline"
        )}
      >
        {state === "current" && (
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full border-2 border-secondary opacity-40"
          />
        )}
        <Icon name={icon} size={18} fill={state === "done" ? 1 : 0} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-xs">
          <p
            className={cn(
              "text-label-md font-semibold",
              state === "upcoming" ? "text-on-surface-variant" : "text-on-surface"
            )}
          >
            {title}
          </p>
          {eta && (
            <span
              className={cn(
                "text-label-sm",
                state === "current"
                  ? "font-semibold text-secondary"
                  : "text-on-surface-variant"
              )}
            >
              {eta}
            </span>
          )}
        </div>
        <p className="mt-xs text-body-sm text-on-surface-variant">{subtitle}</p>
      </div>
    </li>
  );
}

function Tip({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-md transition-all hover:-translate-y-0.5 hover:border-secondary/30 hover:shadow-sm">
      <span className="mb-sm inline-flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
        <Icon name={icon} size={18} fill={1} />
      </span>
      <p className="text-label-md font-semibold text-on-surface">{title}</p>
      <p className="mt-xs text-body-sm leading-relaxed text-on-surface-variant">
        {body}
      </p>
    </div>
  );
}

/** Soft, low-contrast ambient background — grid + two color blobs. */
function BackgroundDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-secondary/15 blur-[120px]"
      />
      <div
        className="absolute top-1/3 -right-32 h-[360px] w-[360px] rounded-full bg-primary-fixed/15 blur-[120px]"
      />
      <div
        className="absolute bottom-0 -left-24 h-[320px] w-[320px] rounded-full bg-secondary/10 blur-[120px]"
      />
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}
