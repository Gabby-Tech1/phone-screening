import { notFound } from "next/navigation";
import { getJob, jobs } from "@/data/jobs";
import { JobDetail } from "./job-detail";

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export async function generateStaticParams() {
  return jobs.map((j) => ({ jobId: j.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { jobId } = await params;
  const job = getJob(jobId);
  return {
    title: job ? job.title : "Job",
    description: job?.tagline ?? "Job opening at Remotown",
  };
}

export default async function JobDetailPage({ params }: PageProps) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) notFound();
  return <JobDetail job={job} />;
}
