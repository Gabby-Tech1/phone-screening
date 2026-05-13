import { describe, it, expect } from "vitest";
import { analyzeSubmission, recommendationMeta } from "./mock-analysis";
import type { Submission } from "@/lib/types";

function makeSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: "sub_test_1",
    jobId: "senior-backend-engineer",
    screeningId: "scr_test",
    candidateName: "Ada Lovelace",
    candidateEmail: "ada@example.com",
    submittedAt: "2026-05-13T12:00:00.000Z",
    answers: [
      {
        questionId: "q1",
        responseType: "text",
        value: "I led the migration to event-driven payments at my last company.",
      },
      {
        questionId: "q2",
        responseType: "text",
        value: "We measured success with p95 latency and a custom SLO budget.",
      },
    ],
    questionsSnapshot: [
      { id: "q1", text: "Tell me about a recent project.", responseType: "text", isCustom: false },
      { id: "q2", text: "How do you measure success?", responseType: "text", isCustom: false },
    ],
    ...overrides,
  };
}

describe("analyzeSubmission", () => {
  it("is deterministic — same submission yields the same result", () => {
    const sub = makeSubmission();
    const a = analyzeSubmission(sub);
    const b = analyzeSubmission(sub);
    expect(a).toEqual(b);
  });

  it("returns different results for materially different submissions", () => {
    const a = analyzeSubmission(makeSubmission({ id: "sub_a", candidateEmail: "a@x.com" }));
    const b = analyzeSubmission(makeSubmission({ id: "sub_b", candidateEmail: "b@x.com" }));
    // Not all fields will differ — but at least one structural piece should.
    const differ =
      a.confidence !== b.confidence ||
      a.summary !== b.summary ||
      a.recommendation !== b.recommendation ||
      a.strengths.join("|") !== b.strengths.join("|");
    expect(differ).toBe(true);
  });

  it("biases confidence into the 70–95 range", () => {
    // Sample across a range of synthetic submissions to be sure the
    // arithmetic stays inside the documented window.
    for (let i = 0; i < 100; i++) {
      const result = analyzeSubmission(
        makeSubmission({ id: `sub_${i}`, candidateEmail: `c${i}@x.com` })
      );
      expect(result.confidence).toBeGreaterThanOrEqual(70);
      expect(result.confidence).toBeLessThanOrEqual(95);
    }
  });

  it("maps confidence to recommendation by documented thresholds", () => {
    // The function is pure of (id, email, first-16-chars-of-each-answer), so
    // we just verify the invariant: given the result, the recommendation
    // follows from confidence.
    for (let i = 0; i < 100; i++) {
      const result = analyzeSubmission(
        makeSubmission({ id: `sub_${i}`, candidateEmail: `c${i}@x.com` })
      );
      if (result.confidence >= 85) expect(result.recommendation).toBe("advance");
      else if (result.confidence >= 75) expect(result.recommendation).toBe("hold");
      else expect(result.recommendation).toBe("reject");
    }
  });

  it("produces three distinct strengths and one concern", () => {
    const result = analyzeSubmission(makeSubmission());
    expect(result.strengths).toHaveLength(3);
    expect(new Set(result.strengths).size).toBe(3);
    expect(result.concerns).toHaveLength(1);
  });
});

describe("recommendationMeta", () => {
  it("returns the right label + tone for each recommendation", () => {
    expect(recommendationMeta("advance")).toEqual({
      label: "Strong Hire",
      tone: "success",
    });
    expect(recommendationMeta("hold")).toEqual({
      label: "On Hold",
      tone: "warning",
    });
    expect(recommendationMeta("reject")).toEqual({
      label: "Do Not Advance",
      tone: "error",
    });
  });
});
