import { Suspense } from "react";
import { RecruiterShell } from "@/components/recruiter/shell";
import { JobsDashboard } from "./jobs-dashboard";

export const metadata = {
  title: "Jobs",
  description: "Active job openings at Remotown.",
};

export default function JobsPage() {
  return (
    <RecruiterShell>
      {/* Suspense boundary because the inner client component reads
          useSearchParams (?create=1 etc). */}
      <Suspense fallback={null}>
        <JobsDashboard />
      </Suspense>
    </RecruiterShell>
  );
}
