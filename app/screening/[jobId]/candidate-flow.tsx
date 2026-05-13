"use client";

import { useCallback, useMemo, useState } from "react";
import { useScreenings } from "@/lib/hooks";
import { saveSubmission } from "@/lib/storage";
import { generateQuestionsForJob } from "@/data/question-templates";
import type { Answer, Job, Question, Submission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input, Textarea } from "@/components/ui/input";
import { isEmail, uid } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

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
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

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
  const canAdvance = currentAnswer.trim().length > 0;

  const onAnswer = (val: string) => {
    if (!currentQuestion) return;
    setAnswers((cur) => ({ ...cur, [currentQuestion.id]: val }));
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
      answers: questions.map<Answer>((q) => ({
        questionId: q.id,
        responseType: q.responseType,
        value: (answers[q.id] ?? "").trim(),
      })),
      submittedAt: now,
      questionsSnapshot: questions,
    };
    setTimeout(() => {
      saveSubmission(submission);
      setSubmittedAt(now);
      setSubmitting(false);
      setStage("done");
    }, 600);
  }, [answers, email, fallback.length, job.id, name, questions, screening]);

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
          onChange={onAnswer}
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
          minutesSpent={minutesSpent}
          totalAnswers={Object.keys(answers).filter((k) => answers[k].trim()).length}
          totalQuestions={total}
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
  onChange,
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
  onChange: (v: string) => void;
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
                  label="Written Response"
                  rows={8}
                  value={value}
                  placeholder="Type your response here…"
                  onChange={(e) => onChange(e.target.value)}
                  required
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
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-xl text-center">
                      <div className="mb-md flex h-16 w-16 items-center justify-center rounded-full bg-surface-variant opacity-50">
                        <Icon name="mic_off" size={32} className="text-outline" />
                      </div>
                      <p className="text-label-md text-on-surface-variant">
                        Audio recording is currently disabled.
                      </p>
                      <p className="mt-xs text-body-sm text-outline">
                        Please use the written response above to proceed.
                      </p>
                      <button
                        type="button"
                        disabled
                        className="mt-lg inline-flex cursor-not-allowed items-center gap-sm rounded-full bg-outline-variant px-xl py-md text-label-md text-on-primary"
                      >
                        <Icon name="mic" size={18} />
                        Record Audio
                      </button>
                    </div>
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
  minutesSpent,
  totalAnswers,
  totalQuestions,
}: {
  job: Job;
  name: string;
  minutesSpent: number;
  totalAnswers: number;
  totalQuestions: number;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-start">
      <header className="fixed top-0 left-0 z-40 w-full border-b border-outline-variant/30 bg-surface-container-lowest/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-container-max items-center justify-between px-gutter">
          <span className="text-headline-sm font-bold text-on-surface">
            Remotown
          </span>
          <span className="text-label-md text-on-surface-variant">
            Candidate Portal
          </span>
        </div>
      </header>

      <main className="confetti-gradient relative flex w-full max-w-[640px] flex-col items-center px-md py-2xl pt-32 text-center">
        <div className="relative mb-xl w-full">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-outline-variant bg-gradient-to-br from-primary-container to-primary-fixed-dim/20 shadow-sm">
            <div className="flex h-full w-full items-end justify-center pb-lg">
              <span className="inline-flex items-center gap-xs rounded-full bg-secondary px-lg py-sm font-semibold text-on-secondary shadow-lg">
                <Icon name="check_circle" fill={1} />
                Successfully Submitted
              </span>
            </div>
          </div>
          <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-secondary-fixed-dim/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary-fixed/20 blur-3xl" />
        </div>

        <h1 className="text-display-lg tracking-tight text-on-surface">
          You&rsquo;re all set!
        </h1>
        <p className="mx-auto mt-md max-w-[500px] text-body-lg text-on-surface-variant">
          Thank you{name ? `, ${name.split(" ")[0]}` : ""}, for completing the{" "}
          {job.title} screening. Your responses have been saved and shared with
          the hiring team.
        </p>

        <div className="mt-xl grid w-full grid-cols-2 gap-md">
          <Stat
            icon="timer"
            label="Time Spent"
            value={`${minutesSpent || 1} min`}
          />
          <Stat
            icon="fact_check"
            label="Responses"
            value={`${totalAnswers} / ${totalQuestions}`}
          />
        </div>

        <div className="mt-xl w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-left">
          <h3 className="mb-lg text-headline-sm text-on-surface">Next Steps</h3>
          <div className="space-y-lg">
            <NextStep
              icon="check"
              filled
              title="Initial Screening Completed"
              subtitle={`Today · ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
            />
            <NextStep
              dot
              title="Recruiter Review"
              subtitle="Estimated: 48 – 72 hours"
            />
            <NextStep
              upcoming
              title="Technical Interview"
              subtitle="Pending review results"
            />
          </div>
        </div>

        <div className="mt-xl flex w-full flex-col gap-md sm:flex-row sm:justify-center">
          <Link href={`/jobs/${job.id}`}>
            <Button
              variant="primary"
              size="lg"
              trailingIcon={<Icon name="arrow_forward" />}
            >
              View Recruiter Dashboard
            </Button>
          </Link>
          <Link href="/jobs">
            <Button variant="outline" size="lg">
              Browse Other Jobs
            </Button>
          </Link>
        </div>

        <p className="mt-xl text-body-sm text-on-surface-variant">
          Have questions? Contact our team at{" "}
          <a
            className="font-semibold text-secondary hover:underline"
            href="mailto:support@remotown.com"
          >
            support@remotown.com
          </a>
        </p>
      </main>
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
    <div className="flex flex-col items-center gap-xs rounded-xl border border-outline-variant bg-surface-container-low p-lg transition-colors hover:bg-surface-container-high">
      <Icon name={icon} className="text-secondary" />
      <span className="text-label-sm uppercase tracking-wider text-outline">
        {label}
      </span>
      <span className="text-headline-sm text-on-surface">{value}</span>
    </div>
  );
}

function NextStep({
  icon,
  filled,
  dot,
  upcoming,
  title,
  subtitle,
}: {
  icon?: string;
  filled?: boolean;
  dot?: boolean;
  upcoming?: boolean;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex gap-md">
      <div className="flex flex-col items-center">
        <div
          className={[
            "flex h-8 w-8 items-center justify-center rounded-full",
            filled && "bg-secondary",
            dot && "border-2 border-secondary bg-surface-container-lowest",
            upcoming && "border-2 border-outline-variant bg-surface-container-low",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {filled && icon && (
            <Icon name={icon} size={18} className="text-on-secondary" fill={1} />
          )}
          {dot && <span className="h-2 w-2 rounded-full bg-secondary" />}
        </div>
      </div>
      <div>
        <p
          className={[
            "text-label-md",
            upcoming ? "text-outline" : "text-on-surface",
          ].join(" ")}
        >
          {title}
        </p>
        <p className="text-body-sm text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  );
}
