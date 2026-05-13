import type { Question, ResponseType } from "@/lib/types";

/**
 * Mocked "AI-generated" screening questions. We map each seeded job ID to a
 * deterministic set of 5–8 questions. If a job doesn't have a specific template,
 * we fall back to a generic role-agnostic set.
 *
 * This is the data side of the Generate button: the UI fakes a network delay,
 * then calls `generateQuestionsForJob()` to populate the editor.
 */

type Template = { text: string; responseType: ResponseType };

const generic: Template[] = [
  {
    text: "Walk us through your background and what drew you to this role at Remotown.",
    responseType: "text",
  },
  {
    text: "Describe a project from the last 12 months that you're particularly proud of, and why.",
    responseType: "text",
  },
  {
    text: "How do you stay focused and organized when working asynchronously across time zones?",
    responseType: "text",
  },
  {
    text: "Tell us about a time you received tough feedback. What did you change?",
    responseType: "audio",
  },
  {
    text: "What does great cross-functional collaboration look like to you in practice?",
    responseType: "text",
  },
  {
    text: "Where do you want to grow in the next 18 months, and how does this role support that?",
    responseType: "text",
  },
];

const templates: Record<string, Template[]> = {
  "senior-backend-engineer": [
    {
      text: "Describe a backend system you've designed end-to-end. What were the trade-offs you optimized for?",
      responseType: "text",
    },
    {
      text: "Walk us through how you'd approach reducing p95 latency on a critical write endpoint.",
      responseType: "text",
    },
    {
      text: "Tell us about a production incident you owned. How did you debug it, and what changed afterward?",
      responseType: "audio",
    },
    {
      text: "How do you decide when to introduce a queue, a cache, or a new service vs. extending an existing one?",
      responseType: "text",
    },
    {
      text: "What's your approach to API versioning and backward compatibility for high-traffic endpoints?",
      responseType: "text",
    },
    {
      text: "Describe how you mentor mid-level engineers on system design without taking the keyboard.",
      responseType: "audio",
    },
  ],

  "lead-product-designer": [
    {
      text: "Walk us through a recent design decision you had to defend against significant stakeholder pushback.",
      responseType: "text",
    },
    {
      text: "How do you balance research depth against velocity when shipping into a fast-moving roadmap?",
      responseType: "text",
    },
    {
      text: "Tell us about a moment you killed a design you loved. What signal made you cut it?",
      responseType: "audio",
    },
    {
      text: "How do you set up design critique so juniors contribute as seriously as senior ICs?",
      responseType: "text",
    },
    {
      text: "Describe how you measure the success of a feature you shipped — beyond completion.",
      responseType: "text",
    },
    {
      text: "What does your handoff to engineering look like, and where do you intentionally leave room?",
      responseType: "text",
    },
  ],

  "growth-marketing-manager": [
    {
      text: "Walk us through your highest-leverage growth experiment in the last year. What was the hypothesis and the outcome?",
      responseType: "text",
    },
    {
      text: "How do you decide between paid acquisition and content/SEO investment for a B2B product?",
      responseType: "text",
    },
    {
      text: "Tell us about a channel you scaled — and one you killed. What signal drove each call?",
      responseType: "audio",
    },
    {
      text: "How do you build a forecast model that holds up to a CFO who is skeptical of marketing math?",
      responseType: "text",
    },
    {
      text: "Describe your relationship with sales. How do you handoff and feedback-loop on lead quality?",
      responseType: "text",
    },
  ],

  "customer-success-lead": [
    {
      text: "Tell us about a high-risk renewal you saved. What was the signal you caught, and what did you do?",
      responseType: "audio",
    },
    {
      text: "How do you scale white-glove onboarding without losing the qualities that make it work?",
      responseType: "text",
    },
    {
      text: "Describe how you turn customer voice into product change. Walk us through a recent example.",
      responseType: "text",
    },
    {
      text: "What metrics anchor your team's weekly review, and why those specifically?",
      responseType: "text",
    },
    {
      text: "How do you coach an AM through a churn conversation without writing the script for them?",
      responseType: "audio",
    },
  ],

  "devops-specialist": [
    {
      text: "Walk us through a CI/CD pipeline you've owned. What did you optimize for, and what did you accept?",
      responseType: "text",
    },
    {
      text: "Describe an incident response process you've run during a Sev-1. What did you do in the first 10 minutes?",
      responseType: "audio",
    },
    {
      text: "How do you decide what to monitor vs. what to alert on? Give a concrete example.",
      responseType: "text",
    },
    {
      text: "Tell us about a time you reduced cloud spend without compromising reliability.",
      responseType: "text",
    },
    {
      text: "What's your approach to introducing infrastructure-as-code into a team that resists it?",
      responseType: "text",
    },
  ],

  "frontend-fullstack-nss": [
    {
      text: "Tell us about a Next.js or React project you built — what made it interesting?",
      responseType: "text",
    },
    {
      text: "Walk us through how you'd structure the file tree for a small two-sided web app.",
      responseType: "text",
    },
    {
      text: "Describe a time you had to debug something tricky in a frontend. How did you approach it?",
      responseType: "audio",
    },
    {
      text: "How do you decide when to lift state up vs. introduce a context or external store?",
      responseType: "text",
    },
    {
      text: "What does accessible by default mean to you in practice on a form-heavy UI?",
      responseType: "text",
    },
    {
      text: "What are you most excited to learn during an NSS rotation on a production engineering team?",
      responseType: "text",
    },
  ],
};

let counter = 0;
function nextId() {
  counter += 1;
  return `q_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/**
 * Build a fresh array of Question objects for a job. Each call mints new IDs,
 * which is what we want — the editor treats this as "generate a new draft".
 */
export function generateQuestionsForJob(jobId: string): Question[] {
  const template = templates[jobId] ?? generic;
  return template.map((t) => ({
    id: nextId(),
    text: t.text,
    responseType: t.responseType,
    isCustom: false,
  }));
}

export function makeCustomQuestion(
  text = "",
  responseType: ResponseType = "text"
): Question {
  return { id: nextId(), text, responseType, isCustom: true };
}
