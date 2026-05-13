# Remotown — Phone Screening Platform

A Next.js take-home build for the Aihrly / Remotown frontend assessment. Two-sided UI: **recruiters** create and review structured phone screenings; **candidates** complete the screening via a public link.

- **Live demo**: _(deploy link goes here once Vercel is wired up)_
- **Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · localStorage
- **Design**: Custom design system exported from Google Stitch (`stitch_phone_screening_platform/remotown_design_system/DESIGN.md`)
- **Backend**: None. Jobs are hard-coded; screenings + submissions persist in `localStorage`.

---

## Run locally

```bash
pnpm install        # or npm install / yarn
pnpm dev            # http://localhost:3000
```

Other scripts: `pnpm build`, `pnpm lint`, `pnpm start`.

> **Note on persistence**: Screenings and candidate submissions live in your browser's localStorage under the keys `aihrly_screenings` and `aihrly_submissions`. To reset the demo, run `localStorage.clear()` in the browser console.

---

## What I built

Every must-have item in **Section 4** of the brief is implemented end-to-end and matches the Stitch design.

### Recruiter side

| Route | Description |
| ----- | ----------- |
| `/jobs` | Job dashboard — 6 seeded jobs, grid/list toggle, department + employment-type filters, search, sort. "Create Phone Screening" opens a drawer. |
| `/jobs/[jobId]` | Job detail — bento hero, copy-able candidate share link, screening status, applicants table (or empty state), conditional "Create screening" CTA when no screening exists yet. |
| `/jobs/[jobId]/applicants/[applicantId]` | Applicant detail — question/answer cards (audio rendered as a disabled player placeholder), "Analyze Response" runs the mock analyzer with a 1.5s loading state and produces summary / strengths / concerns / recommendation. |

The **create-screening flow** is a right-side drawer with a 4-step progress bar:

1. Pick a job
2. Generate AI questions (700ms simulated latency)
3. Edit, reorder (drag + arrow buttons), add custom questions, switch response type per question
4. Save → persisted to localStorage, redirects to the job detail page

The drawer also supports **click-to-edit** on question text and **drag-and-drop reordering** (bonus items from the brief).

### Candidate side

| Route | Description |
| ----- | ----------- |
| `/screening/[jobId]` | Three-stage flow: **Welcome** (name + email, validated) → **Question** (one at a time, animated transitions via Framer Motion, audio shown as a disabled placeholder with text fallback per the brief) → **Thank you** (success card, "Next Steps" timeline, time-spent + completion stats). |

Back-navigation between questions is supported. Submission writes a `Submission` record to localStorage which the recruiter pages then read.

### Bonus items

- ✅ **Drag-and-drop** reordering of questions in the create-screening drawer (HTML5 DnD).
- ✅ **Click-to-edit** for question text (textarea swap, blur or Cmd/Ctrl+Enter saves, Esc cancels).
- ✅ **Light/dark mode** with system-preference detection, persisted to localStorage. No flash of incorrect theme on first paint (inline bootstrap script in `app/layout.tsx`).
- ✅ **Framer Motion** transitions on candidate question changes.
- ✅ **Stats badge** ("X applicants screened") on each job card, derived from localStorage submissions.
- ✅ **404 page** with a clear path back to `/jobs`.

Not attempted: real `MediaRecorder` audio capture, unit tests.

---

## Architecture

```
app/
├── layout.tsx                       Root layout · Inter (next/font) · Material Symbols · theme bootstrap
├── page.tsx                         /  → redirect /jobs
├── not-found.tsx                    404
├── jobs/
│   ├── page.tsx                     /jobs server entry
│   ├── jobs-dashboard.tsx           Client UI (filters, search, sort, grid/list)
│   └── [jobId]/
│       ├── page.tsx                 Generates static params for seeded jobs
│       ├── job-detail.tsx           Bento hero + applicants table + CTA
│       └── applicants/
│           └── [applicantId]/
│               ├── page.tsx
│               └── applicant-detail.tsx   Responses + analyze panel
└── screening/
    └── [jobId]/
        ├── page.tsx
        └── candidate-flow.tsx       Welcome / Question / Done

components/
├── recruiter/
│   ├── shell.tsx                    SideNav + TopBar + BottomNav layout
│   ├── side-nav.tsx
│   ├── top-bar.tsx
│   ├── bottom-nav.tsx
│   ├── theme-toggle.tsx
│   ├── job-card.tsx
│   ├── question-editor.tsx
│   └── create-screening-drawer.tsx
├── ui/
│   ├── button.tsx · input.tsx · select.tsx · avatar.tsx
│   ├── chip.tsx · empty-state.tsx · icon.tsx
│   ├── progress-bar.tsx · segmented-control.tsx
│   ├── skeleton.tsx · toast.tsx
└── theme-provider.tsx

data/
├── jobs.ts                          6 seeded jobs
├── question-templates.ts            Per-job question sets + generic fallback
└── mock-analysis.ts                 Deterministic mock AI analyzer

lib/
├── types.ts                         Domain types (Job, Question, Screening, Submission, AnalysisResult)
├── storage.ts                       localStorage gateway + change-event subscriber
├── hooks.ts                         useScreenings · useSubmissions · useMounted · useMediaQuery
└── utils.ts                         cn() · isEmail() · formatDate() · uid() · initials() · …
```

### Approach notes

- **No external state library.** The brief allows it; the app doesn't need it. `useSyncExternalStore` against localStorage is enough and keeps the surface area small.
- **No `setState`-in-`useEffect` violations.** React 19 / Next 16 added a strict rule; the codebase uses `useSyncExternalStore` for external sources, event handlers for one-time transitions, and `key` remount for "reset on open". Lint passes cleanly.
- **Theme.** Mode is light / dark / system. An inline script in `<head>` reads the preference and applies `.dark` before paint so there's no flash. The `<html>` class is the only switch — Tailwind v4 `@custom-variant dark` does the rest. CSS variables are mirrored in `globals.css` for dark.
- **Design tokens.** All color / spacing / typography / radius tokens from Stitch's `DESIGN.md` are wired into Tailwind v4 via `@theme` in `globals.css`. Class names like `bg-secondary`, `text-headline-lg`, `p-gutter` come straight out of those declarations.
- **Storage shape.** Submissions snapshot the questions they were answered against (`questionsSnapshot`) so the recruiter view stays stable even if the recruiter later edits the screening template.
- **Routing.** Recruiter routes live under `/jobs/...`. Candidate route is intentionally separate at `/screening/[jobId]` and has no chrome (no side nav, no top bar) so it feels like a focused task. Both branches use `generateStaticParams` to pre-render seeded paths.

### Trade-offs I made

- **Drawer over route for create-screening.** A `/jobs/[jobId]/screenings/new` route was a candidate, but a drawer keeps the recruiter in the dashboard context without losing list state. The brief explicitly allowed "modal, drawer, or its own route".
- **No real DB / API.** Per the brief. The two halves of the app communicate only through localStorage, which means a candidate submission shows up in the recruiter view if and only if it happened in the same browser. Cross-tab works (the storage hook listens to both same-tab and cross-tab events).
- **Mock analysis is deterministic.** The same submission always yields the same recommendation — looks like an LLM call without being one. Source is `data/mock-analysis.ts`.
- **Audio recording is a placeholder.** Per the brief, audio responses render as a disabled mic UI with a text-fallback prompt. The candidate must answer in text.
- **Search / filters / CSV export on the recruiter side are UI-complete but functionally minimal** — search and the basic filters work; CSV export and applicant-status filtering surface a toast explaining they're out of scope.

---

## Visual reference

The Stitch export under `stitch_phone_screening_platform/` was the source of truth for every screen. The implemented app should be a close match — same color tokens, same Inter typographic scale, same Material Symbols, same layout decisions (bento hero, fixed sidebar, sticky candidate footer, etc.).

---

## Things I'd do next (not shipped)

- Real audio recording via `MediaRecorder` with a localStorage-backed blob URL.
- Unit tests with Jest + RTL for `mock-analysis.ts`, the localStorage gateway, and `<QuestionEditor />`.
- E2E happy-path test (Playwright) that runs through the candidate flow.
- A genuine "Edit Screening" route — currently saving replaces by job ID, but there's no first-class edit affordance from the job detail page.

---

— Built for the Aihrly / Remotown hiring team. Time spent: roughly one focused day.
