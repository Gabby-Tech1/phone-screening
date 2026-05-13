import type { Job } from "@/lib/types";

/**
 * Hard-coded job seed data. The brief requires at least three; we ship six to
 * give the dashboard grid enough visual weight (3-up at md, 4-up at 2xl).
 *
 * IDs are stable, human-readable slugs so URLs stay clean and the
 * question-template lookup map can key off them.
 */
export const jobs: Job[] = [
  {
    id: "senior-backend-engineer",
    title: "Senior Backend Engineer",
    department: "Engineering",
    location: "Berlin, DE",
    employmentType: "Full-time",
    description:
      "Architect and ship the services that power the Remotown recruiter platform. You'll own backend systems end-to-end, partner with product, and set the bar for service reliability across the engineering org.",
    tagline: "Own systems end-to-end at the platform layer.",
    salaryRange: "€85k – €120k",
    icon: "code",
    status: "Active",
    postedDaysAgo: 2,
  },
  {
    id: "lead-product-designer",
    title: "Lead Product Designer",
    department: "Design",
    location: "Remote (EU)",
    employmentType: "NSS",
    description:
      "Define the visual and interaction language for our hiring suite. You'll partner with PM and engineering to ship workflows that make recruiters faster and candidates feel respected.",
    tagline: "Set the design direction for the hiring suite.",
    salaryRange: "€70k – €95k",
    icon: "palette",
    status: "Active",
    postedDaysAgo: 5,
  },
  {
    id: "growth-marketing-manager",
    title: "Growth Marketing Manager",
    department: "Marketing",
    location: "Munich, DE",
    employmentType: "Full-time",
    description:
      "Lead acquisition for our employer-facing product. You'll run experiments across paid, content, and lifecycle to compound pipeline quality month over month.",
    tagline: "Compound pipeline quality, not just volume.",
    salaryRange: "€65k – €90k",
    icon: "campaign",
    status: "On Hold",
    postedDaysAgo: 11,
  },
  {
    id: "customer-success-lead",
    title: "Customer Success Lead",
    department: "Customer Success",
    location: "London, UK",
    employmentType: "Full-time",
    description:
      "Build the playbook for how mid-market recruiters succeed on Remotown. You'll combine high-touch onboarding with scalable enablement, and your renewal rate will tell the story.",
    tagline: "Own renewal, expansion, and customer voice.",
    salaryRange: "£75k – £95k",
    icon: "headset_mic",
    status: "Active",
    postedDaysAgo: 7,
  },
  {
    id: "devops-specialist",
    title: "DevOps Specialist",
    department: "Engineering",
    location: "Remote (Global)",
    employmentType: "Contract",
    description:
      "Tighten the loop between commit and customer. You'll harden our CI/CD, observability, and incident response so every team ships with confidence.",
    tagline: "Tighten the commit-to-customer loop.",
    salaryRange: "€110/hr",
    icon: "terminal",
    status: "Active",
    postedDaysAgo: 1,
  },
  {
    id: "frontend-fullstack-nss",
    title: "Frontend-Focused Full Stack Developer",
    department: "Engineering",
    location: "Remote, Ghana",
    employmentType: "NSS",
    description:
      "Join Remotown's National Service rotation as a frontend-leaning full-stack engineer. You'll build delightful UI in Next.js and TypeScript with senior engineers shadowing your work.",
    tagline: "Ship production Next.js as part of NSS.",
    salaryRange: "Stipend",
    icon: "rocket_launch",
    status: "Active",
    postedDaysAgo: 3,
  },
];

/** O(1) lookup by id. Reduce over recompute. */
export const jobsById: Record<string, Job> = jobs.reduce(
  (acc, j) => {
    acc[j.id] = j;
    return acc;
  },
  {} as Record<string, Job>
);

export function getJob(id: string): Job | undefined {
  return jobsById[id];
}
