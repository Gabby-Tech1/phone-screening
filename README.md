# Remotown — Phone Screening Platform

A Next.js take-home build for the Aihrly / Remotown frontend assessment. Two-sided UI: **recruiters** create and review structured phone screenings; **candidates** complete the screening via a public link.

- **Live demo**: [airly-phone-screening.vercel.app](https://airly-phone-screening.vercel.app)
- **Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · localStorage
- **Tests**: Vitest + React Testing Library + jsdom (14 tests across pure logic and one interactive component)
- **Design**: Custom design system exported from Google Stitch (`stitch_phone_screening_platform/remotown_design_system/DESIGN.md`)
- **Backend**: None. Jobs are hard-coded; screenings, submissions, and audio clips persist in `localStorage`.

---

## Run locally

**Prerequisites:** Node.js ≥ 20 and [pnpm](https://pnpm.io/installation) (recommended). `npm` or `yarn` work too — the lockfile is `pnpm-lock.yaml`, so `pnpm install` is the deterministic choice.

```bash
# 1. Clone the repo
git clone https://github.com/<your-org>/remotown-phone-screening.git
cd remotown-phone-screening

# 2. Install dependencies
pnpm install        # or `npm install` / `yarn`

# 3. Start the dev server
pnpm dev            # → http://localhost:3000
```

That's the whole setup — there's no backend, no env file, no database migration. The app boots cold against an empty localStorage; create a screening from `/jobs`, then open `/screening/<jobId>` in a separate window to act as the candidate.

Other scripts:

| Command            | What it does                                       |
| ------------------ | -------------------------------------------------- |
| `pnpm dev`         | Start the Next.js dev server on `:3000`            |
| `pnpm build`       | Production build (Turbopack)                       |
| `pnpm start`       | Serve the production build                         |
| `pnpm lint`        | ESLint (`eslint-config-next`)                      |
| `pnpm test`        | Run the Vitest suite once                          |
| `pnpm test:watch`  | Watch mode                                         |

> **Note on persistence**: Screenings, candidate submissions, and audio clips live in your browser's localStorage under `aihrly_screenings` and `aihrly_submissions`. To reset the demo, run `localStorage.clear()` in the browser console.

---

## Approach

The brief asks for a small, two-sided Next.js app that is functionally complete without a backend. The two sides communicate through shared client storage, so the architecture is dominated by three concerns:

1. **A safe, reactive localStorage gateway** — writes from one tab notify both same-tab subscribers (a custom `remotown:storage-changed` event) and other tabs (the native `storage` event). React reads through `useSyncExternalStore` with a module-level cache so snapshots stay referentially stable (otherwise React 19 enters a render loop).
2. **A clear split between recruiter and candidate surfaces.** Recruiter pages share a chrome (side nav + top bar + bottom nav) via the `(recruiter)` route-group layout; the candidate flow lives under `(candidate)` and renders with no chrome so it feels like a focused task. Route groups don't affect URLs — the candidate URL is still `/screening/[jobId]` and the recruiter URL is still `/jobs`, etc.
3. **Domain types as the single source of truth.** Everything that flows through props, storage, and the toast/analyzer pipeline is typed in `lib/types.ts`. Local UI state is kept local; nothing about a transient component lives in the storage schema.

Everything Section 4 of the brief requires is implemented end-to-end. Several Section 7 (bonus) items are implemented too — see the breakdown below.

---

## What I built

### Recruiter side

| Route | Description |
| ----- | ----------- |
| `/jobs` | Job dashboard — 6 seeded jobs, grid/list toggle, department + employment-type filters, search, sort. "Create Phone Screening" opens a drawer. |
| `/jobs/[jobId]` | Job detail — bento hero, copy-able candidate share link, screening status, applicants table (or empty state), conditional "Create screening" CTA when no screening exists yet, and an **Edit Screening** button when one does. |
| `/jobs/[jobId]/applicants/[applicantId]` | Applicant detail — question/answer cards (real `<audio controls>` when the candidate recorded audio), "Analyze Response" runs the deterministic mock analyzer with a 1.5s loading state and produces summary / strengths / concerns / recommendation. |
| `/jobs/[jobId]/screenings/[screeningId]/edit` | **First-class edit-screening route** — hydrates the draft from localStorage, lets the recruiter rewrite / reorder / add / remove questions and switch response types, preserves `createdAt` on save, and warns about applicants who already answered an earlier version. Delete-from-here is also supported. |
| `/screenings` | Index of every saved screening template across jobs, with applicant counts and an "Edit" affordance that routes to the edit page above. |
| `/candidates`, `/dashboard`, `/settings` | Supporting pages that round out the recruiter shell (candidate index across all jobs, hiring overview, profile/appearance/data preferences). |

The **create-screening flow** is a right-side drawer with a 4-step progress bar:

1. Pick a job
2. Generate AI questions (700ms simulated latency)
3. Edit, reorder (drag + arrow buttons), add custom questions, switch response type per question
4. Save → persisted to localStorage, redirects to the job detail page

The drawer supports **click-to-edit** on question text and **drag-and-drop reordering**, and the same `<QuestionEditor>` component is reused on the edit-screening route.

### Candidate side

| Route | Description |
| ----- | ----------- |
| `/screening/[jobId]` | Three-stage flow: **Welcome** (name + email, validated) → **Question** (one at a time, animated transitions via Framer Motion, real audio recording when the question is `audio`) → **Thank you** (animated success seal, copyable confirmation reference, time/audio/answers stats, 4-step "what happens next" timeline, tip cards, CTAs). |

Back-navigation between questions is supported. On submit, the candidate writes a `Submission` to localStorage (with any captured audio embedded as a base64 data URL); the recruiter pages then read it.

### Bonus items shipped

- ✅ **Drag-and-drop** reordering of questions in the create-screening flow and the edit-screening route (HTML5 DnD).
- ✅ **Click-to-edit** for question text (textarea swap, blur or Cmd/Ctrl+Enter saves, Esc cancels).
- ✅ **Light/dark mode** with system-preference detection, persisted to localStorage. No flash of incorrect theme on first paint (inline bootstrap script in `app/layout.tsx`).
- ✅ **Framer Motion** transitions — question-to-question on the candidate flow, and a staggered entrance + animated success seal on the thank-you screen.
- ✅ **Stats badge** ("X applicants screened") on each job card, derived from localStorage submissions.
- ✅ **Real audio recording** via `MediaRecorder` (`navigator.mediaDevices.getUserMedia` → encoded as a `data:audio/webm;base64,...` URL → written into the submission alongside text). 90-second auto-stop, permission-denied fallback, browser-unsupported fallback (a static placeholder + text-only path). The recruiter page renders the clip with a real `<audio controls>` player.
- ✅ **Unit tests** (Section 7 "Unit test for one non-trivial component") — see the [Tests](#tests) section.
- ✅ **404 page** with a clear path back to `/jobs`.

---

## Tests

```bash
pnpm test          # one-shot
pnpm test:watch    # watch mode
```

Two suites, 14 tests, ~3.5s to run:

| File | What it covers |
| ---- | -------------- |
| `data/mock-analysis.test.ts` | Determinism (same submission → same result), responsiveness to different inputs, confidence stays in the 70–95 window, recommendation ↔ confidence threshold invariant, strengths/concerns shape, `recommendationMeta` mapping. |
| `components/recruiter/question-editor.test.tsx` | Click-to-edit → blur commits, Escape cancels with no `onChange`, unchanged text doesn't fire `onChange`, response-type switch via the segmented control, delete button, the `Custom` badge appears only for `isCustom`, move-up/down render conditionally on the optional handlers. |

The setup uses **Vitest + jsdom + RTL** rather than Jest. The API is Jest-compatible (`describe` / `it` / `expect` / `vi.fn`), so the test files read identically to a Jest suite. Configuring Jest cleanly against Next 16 + Tailwind v4 + React 19 + ESM is currently a meaningful yak-shave; Vitest gets us there in ~5 lines of config (`vitest.config.ts` + a one-line `vitest.setup.ts` that imports `@testing-library/jest-dom/vitest`).

---

## Architecture

```
app/
├── layout.tsx                              Root layout · Inter (next/font) · Material Symbols · theme bootstrap
├── page.tsx                                /  → redirect /jobs
├── not-found.tsx                           404
├── globals.css                             Tailwind v4 @theme tokens (light + dark)
│
├── (candidate)/                            Candidate route group (no chrome)
│   └── screening/[jobId]/
│       ├── page.tsx                        Server entry · generateStaticParams + metadata
│       └── candidate-flow.tsx              Welcome → Question → Done (animated, real audio)
│
└── (recruiter)/                            Recruiter route group
    ├── layout.tsx                          Wraps every recruiter page in <RecruiterShell>
    ├── jobs/
    │   ├── page.tsx                        /jobs server entry (Suspense for useSearchParams)
    │   ├── jobs-dashboard.tsx              Client UI (filters, search, sort, grid/list)
    │   └── [jobId]/
    │       ├── page.tsx                    /jobs/[jobId] · generates static params for seeded jobs
    │       ├── job-detail.tsx              Bento hero + applicants table + edit-screening entry
    │       ├── applicants/[applicantId]/
    │       │   ├── page.tsx
    │       │   └── applicant-detail.tsx    Responses (text + real audio playback) + analyze panel
    │       └── screenings/[screeningId]/edit/
    │           ├── page.tsx
    │           └── screening-editor.tsx    First-class edit route (reuses <QuestionEditor>)
    ├── screenings/                         /screenings — template index
    ├── candidates/                         /candidates — global applicants list
    ├── dashboard/                          /dashboard — hiring overview
    └── settings/                           /settings — profile / appearance / data

components/
├── candidate/
│   └── audio-recorder.tsx                  MediaRecorder UI · idle → requesting → recording → recorded / re-record / unsupported
├── recruiter/
│   ├── shell.tsx                           SideNav + TopBar + BottomNav layout (now mounted once via group layout)
│   ├── side-nav.tsx · top-bar.tsx · bottom-nav.tsx · theme-toggle.tsx
│   ├── job-card.tsx
│   ├── question-editor.tsx                 Inline editor — also unit-tested
│   └── create-screening-drawer.tsx
├── ui/
│   ├── button.tsx · input.tsx · select.tsx · avatar.tsx
│   ├── chip.tsx · empty-state.tsx · icon.tsx
│   ├── progress-bar.tsx · segmented-control.tsx
│   ├── skeleton.tsx · toast.tsx
└── theme-provider.tsx

data/
├── jobs.ts                                 6 seeded jobs
├── question-templates.ts                   Per-job question sets + generic fallback
├── mock-analysis.ts                        Deterministic mock AI analyzer
└── mock-analysis.test.ts                   Vitest spec for the analyzer

lib/
├── types.ts                                Domain types (Job, Question, Screening, Submission, Answer, AnalysisResult)
├── storage.ts                              localStorage gateway + change-event subscriber
├── hooks.ts                                useScreenings · useSubmissions · useMounted · useMediaQuery
├── use-audio-recorder.ts                   Custom hook around MediaRecorder + a 90s cap + base64 encoding
└── utils.ts                                cn() · isEmail() · formatDate() · uid() · initials() · …

vitest.config.ts                            jsdom env + @ alias mirroring tsconfig
vitest.setup.ts                             Imports @testing-library/jest-dom/vitest
```

### Approach notes

- **Route groups, not duplicated wrappers.** `(candidate)` and `(recruiter)` make the audience split a structural fact of the file tree instead of something a reader has to infer from `screening/` vs `screenings/` (which read like a typo). The `(recruiter)/layout.tsx` mounts `<RecruiterShell>` once, replacing 7 separate per-page wrappers.
- **No external state library.** The brief allows it; the app doesn't need it. `useSyncExternalStore` against localStorage is enough and keeps the surface area small.
- **No `setState`-in-`useEffect` violations.** React 19 / Next 16 added a strict rule; the codebase uses `useSyncExternalStore` for external sources, event handlers for one-time transitions, lazy-init for derived state on first render (`if (questions === null && original) setQuestions(...)` in the editor), and `key` remount for "reset on open" in the drawer. Lint passes cleanly.
- **Theme.** Mode is light / dark / system. An inline script in `<head>` reads the preference and applies `.dark` before paint so there's no flash. The `<html>` class is the only switch — Tailwind v4 `@custom-variant dark` does the rest. CSS variables are mirrored in `globals.css` for dark.
- **Design tokens.** All color / spacing / typography / radius tokens from Stitch's `DESIGN.md` are wired into Tailwind v4 via `@theme` in `globals.css`. Class names like `bg-secondary`, `text-headline-lg`, `p-gutter` come straight out of those declarations.
- **Storage shape.** Submissions snapshot the questions they were answered against (`questionsSnapshot`) so the recruiter view stays stable even if the recruiter later edits the screening template. Audio clips are embedded as base64 `data:` URLs inside `Answer.audioDataUrl` — no Object URL lifetime to manage, and the clip travels with the submission.
- **Static routing where possible.** Seeded job paths use `generateStaticParams` on both sides (`/jobs/[jobId]` and `/screening/[jobId]`). The edit-screening route is dynamic (`ƒ`) because screening IDs are user-generated at runtime.

### Trade-offs I made

- **Drawer for create, route for edit.** Create-screening lives in a drawer to keep the recruiter in dashboard context without losing list state. Edit-screening got its own route — it's a deeper task, often initiated from a different starting context (job detail, screenings list), and benefits from URL-shareability + a sticky save bar. The brief explicitly allowed "modal, drawer, or its own route" — we use both, where each fits best.
- **No real DB / API.** Per the brief. The two halves of the app communicate only through localStorage, which means a candidate submission shows up in the recruiter view if and only if it happened in the same browser. Cross-tab works (the storage hook listens to both same-tab `remotown:storage-changed` and cross-tab `storage` events).
- **Mock analysis is deterministic.** The same submission always yields the same recommendation — looks like an LLM call without being one. Source is `data/mock-analysis.ts`. The determinism is what makes it unit-testable.
- **Audio as base64 in localStorage.** A 30-second WebM/Opus clip is roughly 100–300 KB, well within the typical 5 MB localStorage quota for the small number of submissions this demo holds. In a real product this would be a presigned upload to object storage; here, embedding lets the recruiter view a clip in the same browser tab the candidate recorded it in, which is the contract we have.
- **90-second cap on recordings.** Hard-coded in `lib/use-audio-recorder.ts`. Keeps the localStorage payload predictable and reflects realistic phone-screen answer length.
- **Vitest, not Jest.** API-compatible with Jest; configuring Jest against Next 16 + Tailwind v4 + React 19 + ESM is currently fragile. The test files would port to Jest with zero source-code changes if needed.
- **Search / filters / CSV export.** The job-detail filter and CSV export still surface a toast explaining they're out of scope — implementing them well requires status states on submissions, which the brief doesn't define. The `/jobs` search and the department / employment-type / sort filters all work.

---

## Visual reference

The Stitch export under `stitch_phone_screening_platform/` was the source of truth for every screen. The implemented app is a close match — same color tokens, same Inter typographic scale, same Material Symbols, same layout decisions (bento hero, fixed sidebar, sticky candidate footer, etc.). The thank-you screen and the audio recorder are extensions beyond the Stitch export, designed to match the rest of the system.

---

## What I didn't get to (and why)

- **CSV export & applicant-status filtering on the job-detail page.** Implementing them honestly requires a real status model (Reviewing / In progress / Highly-rated etc. — currently faked from row index) that the brief doesn't define. Surfaced as a toast.
- **Posting a new job.** Per Section 5 of the brief, jobs are seeded data. The "Post a New Job" card is a UI affordance only.
- **E2E test (Playwright) of the full candidate flow.** The Vitest suite covers the most logic-heavy unit (`mock-analysis`) and the most interactive component (`<QuestionEditor>`). A Playwright happy-path would be the next addition once a test job + clean fixture-reset story is in place.
- **MediaRecorder support detection at idle.** Today the recorder only reports `unsupported` after the user clicks **Start recording** and feature detection fails. Detecting up-front would let us swap to the text-only path silently — minor UX polish that didn't make the cut.

---

## Assumptions I made

Where the brief was silent or ambiguous, I made these calls (called out per the brief's "make a reasonable assumption, note it in the README" guidance):

- **Edit screening is a full route, not a drawer.** The brief mentioned create-screening only; edit was implied by "Things I'd do next" in the original README. A route is more shareable and matches how Linear / GitHub treat "edit" surfaces.
- **One active screening template per job.** Multiple drafts per job would clutter the recruiter UI without a status concept. Saving replaces the existing template (preserving `createdAt`); deleting is destructive but kept the door open.
- **Audio is recorded *or* typed, not both required.** For an `audio` question, either a non-empty text response or a captured audio clip lets the candidate advance. Both are persisted if both are provided; recruiters see them side-by-side.
- **Confirmation reference on the thank-you screen.** Derived deterministically from the submission ID. Not in the brief; added because every real screening tool I've used surfaces something equivalent.

---

## How this maps to Section 9 (evaluation)

| Area              | Where to look                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Functionality 30% | Every must-have in Section 4 works end-to-end. Recruiter + candidate sides are fully wired; the edit route + real audio go beyond the must-haves. |
| Code quality 25%  | Per-feature components, no 600-line page (the biggest file, `candidate-flow.tsx`, decomposes into Welcome / Question / Done stages + named sub-components). Strict TypeScript. Lint clean. |
| UX & polish 20%   | Loading states (`Skeleton`, button spinners, simulated AI latency), empty states (`EmptyState` component), validated form, focus-visible rings, animations on the candidate side, light/dark with no flash. |
| Next.js idioms 15%| App Router, `generateStaticParams`, `generateMetadata`, route groups for layout sharing, server components where possible (page.tsx) and client where required (`"use client"`), Suspense boundary for `useSearchParams`. |
| Communication 10% | This README, intentional small commits where applicable, and inline comments only where the WHY isn't obvious. |

---

## Contributing

This started as a take-home, but contributions are welcome — bug reports, polish, or new features.

### Workflow

1. **Fork** the repo and clone your fork.
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-thing
   ```
   Use `feat/`, `fix/`, `chore/`, or `docs/` prefixes — they read well in `git log` and match the commits already in this tree.
3. **Install + run the dev server** (see [Run locally](#run-locally)).
4. **Make your change.** Keep the diff focused; if you find yourself touching unrelated files, split into a second branch.
5. **Verify before pushing:**
   ```bash
   pnpm lint         # ESLint clean
   pnpm test         # 14/14 pass
   pnpm build        # next build succeeds
   ```
6. **Commit** with a short, present-tense subject (≤ 70 chars). The body, if any, explains *why* — not what.
7. **Open a PR** against `main`. Describe what changed, why, and how you verified it. Screenshots / short Loom for UI changes are a big help.

### What we look for in a PR

- **Scope discipline.** One concern per PR. If you fix a bug *and* refactor the surrounding code, that's two PRs.
- **No new `any`.** TypeScript is strict; lean on the existing domain types in `lib/types.ts`.
- **No new `setState` inside `useEffect` for derived state.** React 19 / Next 16 are noisy about it. The codebase prefers `useSyncExternalStore` for external sources, lazy-init `useState`, event handlers, or `key`-remount.
- **Design tokens over raw colors.** Use `bg-secondary`, `text-on-surface`, `p-gutter`, etc. — not hex codes or arbitrary spacing. Tokens live in `app/globals.css` and are documented in `stitch_phone_screening_platform/remotown_design_system/DESIGN.md`.
- **Tests for non-trivial logic.** New pure functions deserve a Vitest spec; new interactive components benefit from at least a smoke test. See `data/mock-analysis.test.ts` and `components/recruiter/question-editor.test.tsx` for the house style.
- **Accessibility hygiene.** New interactive elements need keyboard reachability and visible focus styles. Icons that carry meaning need a label; decorative ones get `aria-hidden`.

### Filing an issue

Open a GitHub issue with:

- What you were trying to do.
- What actually happened (stack trace, console error, screenshot — whichever fits).
- Steps to reproduce, including the browser if it's a candidate-side bug (the `MediaRecorder` paths in particular vary by browser).
- Your localStorage state if relevant — `localStorage.getItem("aihrly_screenings")` and `localStorage.getItem("aihrly_submissions")`.

### Code of conduct

Be kind. Reviews are about the code, not the person. If you disagree with a review comment, push back — but with reasoning, not snark.

---

