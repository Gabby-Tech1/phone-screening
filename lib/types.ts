/**
 * Domain types for the Remotown phone-screening platform.
 *
 * These are the single source of truth for shapes that flow through props,
 * localStorage, and the React Context provider. Keep them narrow on purpose —
 * if a value belongs in the UI but not in storage, model it locally.
 */

export type EmploymentType = "Full-time" | "Part-time" | "Contract" | "Internship" | "NSS";

export type JobDepartment =
  | "Engineering"
  | "Design"
  | "Marketing"
  | "Operations"
  | "Customer Success"
  | "Data";

export type JobIcon =
  | "code"
  | "palette"
  | "campaign"
  | "headset_mic"
  | "terminal"
  | "analytics"
  | "support_agent"
  | "rocket_launch";

export interface Job {
  id: string;
  title: string;
  department: JobDepartment;
  location: string;
  employmentType: EmploymentType;
  description: string;
  /** Short one-liner that's shown in card hover states / metadata strips. */
  tagline?: string;
  /** Optional, used by the job hero on the detail page. */
  salaryRange?: string;
  /** Material Symbols Outlined icon name. Drives card iconography. */
  icon: JobIcon;
  /** "Active" | "On Hold" rendered as a chip on the dashboard. */
  status: "Active" | "On Hold";
  postedDaysAgo: number;
}

export type ResponseType = "text" | "audio";

export interface Question {
  id: string;
  text: string;
  responseType: ResponseType;
  /** True if added by the recruiter (vs. coming from the generated template). */
  isCustom: boolean;
}

export interface Screening {
  id: string;
  jobId: string;
  createdAt: string;
  questions: Question[];
}

export interface Answer {
  questionId: string;
  responseType: ResponseType;
  /** Text response, or a candidate-supplied note for audio answers. */
  value: string;
  /** Optional `data:audio/...;base64,...` URL when the candidate recorded audio
   *  via the in-browser MediaRecorder. Optional so older submissions without
   *  this field deserialize cleanly. */
  audioDataUrl?: string;
  /** Recorded clip length in milliseconds, when `audioDataUrl` is present. */
  audioDurationMs?: number;
}

export interface Submission {
  id: string;
  jobId: string;
  screeningId: string;
  candidateName: string;
  candidateEmail: string;
  answers: Answer[];
  submittedAt: string;
  /** Snapshot of the questions at the time of submission — keeps the recruiter
   *  view stable even if the screening template is later edited. */
  questionsSnapshot: Question[];
}

export interface AnalysisResult {
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendation: "advance" | "reject" | "hold";
  /** Confidence score 0–100, used by the recommendation chip. */
  confidence: number;
}

export type ThemeMode = "light" | "dark" | "system";
