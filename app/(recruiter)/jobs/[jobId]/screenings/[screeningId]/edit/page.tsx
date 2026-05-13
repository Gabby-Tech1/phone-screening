import { notFound } from "next/navigation";
import { getJob } from "@/data/jobs";
import { ScreeningEditor } from "./screening-editor";

interface PageProps {
  params: Promise<{ jobId: string; screeningId: string }>;
}

/**
 * Edit-screening route. The screening lives in localStorage so we can't
 * pre-render its contents server-side — we render a client component that
 * hydrates from the store. The recruiter shell comes from the (recruiter)
 * group layout. If the route is hit with a stale or missing screening ID,
 * the client component renders an empty-state with a link back to the job.
 *
 * No `generateStaticParams` here: screening IDs are user-generated at runtime.
 */
export async function generateMetadata({ params }: PageProps) {
  const { jobId } = await params;
  const job = getJob(jobId);
  return {
    title: job ? `Edit screening · ${job.title}` : "Edit screening",
  };
}

export default async function EditScreeningPage({ params }: PageProps) {
  const { jobId, screeningId } = await params;
  const job = getJob(jobId);
  if (!job) notFound();
  return <ScreeningEditor job={job} screeningId={screeningId} />;
}
