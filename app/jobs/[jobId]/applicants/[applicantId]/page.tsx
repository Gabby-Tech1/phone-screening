import { notFound } from "next/navigation";
import { getJob } from "@/data/jobs";
import { RecruiterShell } from "@/components/recruiter/shell";
import { ApplicantDetail } from "./applicant-detail";

interface PageProps {
  params: Promise<{ jobId: string; applicantId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { jobId } = await params;
  const job = getJob(jobId);
  return {
    title: job ? `Applicant · ${job.title}` : "Applicant",
  };
}

export default async function ApplicantPage({ params }: PageProps) {
  const { jobId, applicantId } = await params;
  const job = getJob(jobId);
  if (!job) notFound();
  return (
    <RecruiterShell>
      <ApplicantDetail job={job} applicantId={applicantId} />
    </RecruiterShell>
  );
}
