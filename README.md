# Remotown — Phone Screening Platform

A Next.js take-home build for the Aihrly / Remotown frontend assessment. Two-sided UI: **recruiters** create and review structured phone screenings; **candidates** complete the screening via a public link.

- **Live demo**: [airly-phone-screening.vercel.app](https://airly-phone-screening.vercel.app)
- **Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · localStorage
- **Tests**: Vitest + React Testing Library + jsdom (14 tests)
- **Backend**: None. Jobs are hard-coded; screenings, submissions, and audio clips persist in `localStorage`.

---

## Run locally

**Prerequisites:** Node.js ≥ 20 and [pnpm](https://pnpm.io/installation) (recommended). `npm` and `yarn` also work — the lockfile is `pnpm-lock.yaml`, so `pnpm install` is the deterministic choice.

```bash
# 1. Clone the repo
git clone https://github.com/<your-org>/remotown-phone-screening.git
cd remotown-phone-screening

# 2. Install dependencies
pnpm install

# 3. Start the dev server
pnpm dev            # → http://localhost:3000
```

No env file, no database, no backend. Create a screening from `/jobs`, then open `/screening/<jobId>` in a separate window to act as the candidate.

| Command           | What it does                            |
| ----------------- | --------------------------------------- |
| `pnpm dev`        | Start the Next.js dev server on `:3000` |
| `pnpm build`      | Production build (Turbopack)            |
| `pnpm start`      | Serve the production build              |
| `pnpm lint`       | ESLint (`eslint-config-next`)           |
| `pnpm test`       | Run the Vitest suite once               |
| `pnpm test:watch` | Watch mode                              |

> **Resetting the demo:** run `localStorage.clear()` in the browser console.

---

## Approach

The brief asks for a small, two-sided Next.js app that is functionally complete without a backend. The two sides communicate through shared client storage, so the architecture is dominated by three concerns:

1. **A safe, reactive localStorage gateway.** Writes notify both same-tab subscribers (a custom `remotown:storage-changed` event) and other tabs (the native `storage` event). React reads through `useSyncExternalStore` with a module-level cache so snapshots stay referentially stable (otherwise React 19 enters a render loop).
2. **A clear split between recruiter and candidate surfaces.** Recruiter pages share chrome (side nav + top bar + bottom nav) via the `(recruiter)` route-group layout; the candidate flow lives under `(candidate)` and renders with no chrome so it feels like a focused task. Route groups don't affect URLs.
3. **Domain types as the single source of truth.** Everything that flows through props, storage, and the analyzer pipeline is typed in `lib/types.ts`. Local UI state stays local; nothing transient leaks into the storage schema.

---

## Project structure

```
app/
├── layout.tsx                    Root layout · fonts · Material Symbols · theme bootstrap
├── page.tsx                      / → redirect /jobs
├── not-found.tsx                 404
├── globals.css                   Tailwind v4 @theme tokens (light + dark)
│
├── (candidate)/                  Candidate route group — no chrome
│   └── screening/[jobId]/
│       ├── page.tsx              Server entry · generateStaticParams + metadata
│       └── candidate-flow.tsx    Welcome → Question → Done
│
└── (recruiter)/                  Recruiter route group
    ├── layout.tsx                Wraps every recruiter page in <RecruiterShell>
    ├── jobs/
    │   ├── page.tsx              /jobs (Suspense boundary for useSearchParams)
    │   ├── jobs-dashboard.tsx
    │   └── [jobId]/
    │       ├── page.tsx
    │       ├── job-detail.tsx
    │       ├── applicants/[applicantId]/
    │       │   ├── page.tsx
    │       │   └── applicant-detail.tsx
    │       └── screenings/[screeningId]/edit/
    │           ├── page.tsx
    │           └── screening-editor.tsx
    ├── screenings/               /screenings template index
    ├── candidates/               /candidates global applicants list
    ├── dashboard/                /dashboard hiring overview
    └── settings/                 /settings profile / appearance / data

components/
├── candidate/audio-recorder.tsx   MediaRecorder UI
├── recruiter/
│   ├── shell.tsx                  Side + top + bottom nav (mounted once via group layout)
│   ├── side-nav.tsx · top-bar.tsx · bottom-nav.tsx · theme-toggle.tsx
│   ├── job-card.tsx
│   ├── question-editor.tsx        Inline editor — also unit-tested
│   └── create-screening-drawer.tsx
├── ui/                            button · input · select · avatar · chip · empty-state ·
│                                  icon · progress-bar · segmented-control · skeleton · toast
└── theme-provider.tsx

data/
├── jobs.ts                       6 seeded jobs
├── question-templates.ts         Per-job question sets + generic fallback
├── mock-analysis.ts              Deterministic mock AI analyzer
└── mock-analysis.test.ts         Vitest spec

lib/
├── types.ts                      Job · Question · Screening · Submission · Answer · AnalysisResult
├── storage.ts                    localStorage gateway + change-event subscriber
├── hooks.ts                      useScreenings · useSubmissions · useMounted · useMediaQuery
├── use-audio-recorder.ts         MediaRecorder hook (90s cap + base64 encoding)
└── utils.ts                      cn · isEmail · formatDate · uid · initials · …

vitest.config.ts                  jsdom env + @ alias mirroring tsconfig
vitest.setup.ts                   Imports @testing-library/jest-dom/vitest
```

---

## What I built

### Recruiter

| Route | Description |
| ----- | ----------- |
| `/jobs` | Job dashboard — 6 seeded jobs, grid/list toggle, department + employment-type filters, search, sort. "Create Phone Screening" opens a drawer. |
| `/jobs/[jobId]` | Job detail — bento hero, copy-able candidate share link, screening status, applicants table (or empty state), conditional "Create screening" CTA, and an **Edit Screening** button when one exists. |
| `/jobs/[jobId]/applicants/[applicantId]` | Applicant detail — question/answer cards (real `<audio controls>` when the candidate recorded audio), "Analyze Response" runs the deterministic mock analyzer with a 1.5s loading state and produces summary / strengths / concerns / recommendation. |
| `/jobs/[jobId]/screenings/[screeningId]/edit` | First-class edit-screening route — hydrates from localStorage, lets the recruiter rewrite / reorder / add / remove questions and switch response types, preserves `createdAt`, and warns about applicants who answered an earlier version. |
| `/screenings` | Index of every saved screening template, with applicant counts and an Edit affordance. |

The **create-screening flow** is a right-side drawer with a 4-step progress bar: pick a job → generate questions (700ms simulated latency) → edit / reorder / add custom / switch response types → save. The same `<QuestionEditor>` is reused on the edit route.

### Candidate

| Route | Description |
| ----- | ----------- |
| `/screening/[jobId]` | Three-stage flow: **Welcome** (name + email, validated) → **Question** (one at a time, animated transitions, real audio recording when the question is `audio`) → **Thank you** (animated success seal, copyable confirmation reference, stats, "what happens next" timeline, CTAs). |

Back-navigation between questions is supported. On submit, the candidate writes a `Submission` to localStorage (with any captured audio embedded as a base64 data URL); the recruiter pages read it back through the same gateway.

### Bonus items shipped

- ✅ **Drag-and-drop** reordering of questions in both the create and edit flows.
- ✅ **Click-to-edit** for question text (textarea swap, blur or Cmd/Ctrl+Enter saves, Esc cancels).
- ✅ **Light/dark mode** with system-preference detection, persisted to localStorage. No flash on first paint.
- ✅ **Framer Motion** transitions on candidate question changes and on the thank-you screen.
- ✅ **Stats badge** ("X applicants screened") on each job card.
- ✅ **Real audio recording** via `MediaRecorder` — captured as `data:audio/webm;base64,...`, 90-second auto-stop, permission-denied + browser-unsupported fallbacks. Recruiter page renders a real `<audio controls>` player.
- ✅ **Unit tests** — 14 tests across `data/mock-analysis.test.ts` (determinism, confidence range, threshold mapping) and `components/recruiter/question-editor.test.tsx` (click-to-edit, Esc cancels, response-type switch, etc.).
- ✅ **404 page**.

---

## Trade-offs

- **Drawer for create, route for edit.** Create lives in a drawer to keep the recruiter in dashboard context. Edit gets its own route — it's a deeper task, often initiated from different contexts, and benefits from URL-shareability + a sticky save bar. The brief explicitly allowed "modal, drawer, or its own route".
- **No real DB / API.** Per the brief. The two halves communicate only through localStorage, so a candidate submission shows up in the recruiter view only if it happened in the same browser. Cross-tab works (the storage hook listens to both same-tab `remotown:storage-changed` and cross-tab `storage` events).
- **Mock analysis is deterministic.** Same submission → same recommendation. Looks like an LLM call without being one. The determinism is what makes it unit-testable.
- **Audio as base64 in localStorage.** A 30-second WebM/Opus clip is ~100–300 KB, well within the typical 5 MB quota for the small number of submissions this demo holds. In a real product this would be a presigned upload to object storage; here, embedding lets the recruiter view a clip in the same browser tab the candidate recorded it in.
- **90-second cap on recordings.** Keeps the localStorage payload predictable and reflects realistic phone-screen answer length.
- **Vitest, not Jest.** API-compatible with Jest; configuring Jest against Next 16 + Tailwind v4 + React 19 + ESM is currently fragile. The test files would port to Jest with zero source-code changes.
- **Search / filters / CSV export.** The applicant-status filter and CSV export on the job-detail page surface a toast explaining they're out of scope — implementing them honestly requires a real status model the brief doesn't define. The `/jobs` search and the department / employment-type / sort filters all work.

---

## What I didn't get to (and why)

- **CSV export & applicant-status filtering on the job-detail page.** Requires a real status model (Reviewing / In progress / Highly-rated, currently faked from row index) that the brief doesn't define.
- **Posting a new job.** Per Section 5 of the brief, jobs are seeded data. The "Post a New Job" card is a UI affordance only.
- **E2E test (Playwright) of the candidate flow.** The Vitest suite covers the most logic-heavy unit and the most interactive component. A Playwright happy-path would be the next addition.
- **MediaRecorder support detection at idle.** Today the recorder reports `unsupported` only after the user clicks **Start recording** and feature detection fails. Detecting up-front would let us swap to the text-only path silently.

---

## Assumptions I made

Where the brief was silent, I made these calls per the brief's "make a reasonable assumption, note it in the README" guidance:

- **Edit screening is a full route, not a drawer.** A route is shareable and matches how Linear / GitHub treat "edit" surfaces.
- **One active screening template per job.** Saving replaces the existing template (preserving `createdAt`); deleting is destructive.
- **Audio is recorded *or* typed, not both required.** For an `audio` question, either path lets the candidate advance. Both are persisted if both are provided.
- **Confirmation reference on the thank-you screen.** Derived deterministically from the submission ID. Not in the brief; added because every real screening tool surfaces something equivalent.

---

## Contributing

Contributions are welcome — bug reports, polish, or new features.

### Workflow

1. **Fork** the repo and clone your fork.
2. **Create a branch** from `main` using a `feat/`, `fix/`, `chore/`, or `docs/` prefix.
3. **Install + run the dev server** (see [Run locally](#run-locally)).
4. **Make your change.** Keep the diff focused.
5. **Verify before pushing:** `pnpm lint && pnpm test && pnpm build`.
6. **Open a PR** against `main`. Describe what changed, why, and how you verified it. Screenshots or a short Loom for UI changes are a big help.

### What we look for in a PR

- One concern per PR.
- No new `any` — lean on the existing domain types in `lib/types.ts`.
- No new `setState` inside `useEffect` for derived state — prefer `useSyncExternalStore`, lazy-init `useState`, event handlers, or `key`-remount.
- Design tokens (`bg-secondary`, `text-on-surface`, `p-gutter`) over raw hex / arbitrary spacing.
- Tests for non-trivial logic — see `data/mock-analysis.test.ts` and `components/recruiter/question-editor.test.tsx` for the house style.
- Keyboard reachability + visible focus styles on new interactive elements.

### Filing an issue

- What you were trying to do.
- What actually happened (error / screenshot).
- Steps to reproduce, including browser if it's a candidate-side bug (`MediaRecorder` varies by browser).
- Your localStorage state if relevant — `localStorage.getItem("aihrly_screenings")` and `localStorage.getItem("aihrly_submissions")`.
