import type { AnalysisResult, Submission } from "@/lib/types";

/**
 * Deterministic mock analyzer. Real systems would call an LLM; we hash a stable
 * digest of the submission to pick a believable recommendation + tone.
 *
 * The goal isn't realism — it's that the recruiter sees a result that *feels*
 * shaped by the submission (different candidates get different recs).
 */

const summaries = [
  "Candidate demonstrates strong leadership maturity and a data-driven approach to product decisions. Communication style is structured, empathetic, and well-paced.",
  "Solid technical foundation paired with clear, concise communication. Answers are specific and grounded in concrete examples rather than abstraction.",
  "Thoughtful, deliberate answers. Shows real ownership of ambiguous problems and a healthy bias toward writing things down before discussing.",
  "Strong execution signal with measurable outcomes referenced throughout. Reasoning is structured and trade-offs are surfaced without prompting.",
];

const strengthsPool = [
  "Strategic prioritization (RICE)",
  "High emotional intelligence",
  "Technical conflict resolution",
  "Clear written communication",
  "Strong async working style",
  "Customer-obsessed framing",
  "Decisive under ambiguity",
  "Pragmatic about trade-offs",
  "Mentors without micromanaging",
  "Comfortable with measurement",
];

const concernsPool = [
  "Limited experience with direct revenue-generating cycles in current role.",
  "Most examples come from small-team contexts; scaling experience is implied rather than demonstrated.",
  "Answer on team conflict avoided naming the trade-off explicitly — worth probing in the next round.",
  "Strong on individual delivery, lighter signal on cross-functional facilitation.",
  "Comfortable shipping; less detail on how they measure outcomes after launch.",
];

// Deterministic hash so the same submission always renders the same analysis.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number, n: number): T[] {
  const out: T[] = [];
  const used = new Set<number>();
  let cursor = seed;
  while (out.length < n && used.size < arr.length) {
    cursor = (cursor * 1103515245 + 12345) >>> 0;
    const idx = cursor % arr.length;
    if (!used.has(idx)) {
      used.add(idx);
      out.push(arr[idx]);
    }
  }
  return out;
}

/**
 * Build an AnalysisResult from a submission. Pure + deterministic.
 * Call sites typically wrap this in a setTimeout to simulate latency.
 */
export function analyzeSubmission(submission: Submission): AnalysisResult {
  const digest =
    submission.id +
    submission.candidateEmail +
    submission.answers.map((a) => a.value.slice(0, 16)).join("|");
  const seed = hash(digest);

  // Confidence: bias toward 70–95 so it feels considered, not random.
  const confidence = 70 + (seed % 26);
  const recommendation =
    confidence >= 85 ? "advance" : confidence >= 75 ? "hold" : "reject";

  return {
    summary: summaries[seed % summaries.length],
    strengths: pick(strengthsPool, seed, 3),
    concerns: pick(concernsPool, seed + 1, 1),
    recommendation,
    confidence,
  };
}

/** UI label + tonal color for the recommendation chip. */
export function recommendationMeta(rec: AnalysisResult["recommendation"]) {
  switch (rec) {
    case "advance":
      return { label: "Strong Hire", tone: "success" as const };
    case "hold":
      return { label: "On Hold", tone: "warning" as const };
    case "reject":
      return { label: "Do Not Advance", tone: "error" as const };
  }
}
