import { RecruiterShell } from "@/components/recruiter/shell";
import { CandidatesList } from "./candidates-list";

export const metadata = {
  title: "Candidates",
  description: "All candidates who have submitted a phone screening.",
};

export default function CandidatesPage() {
  return (
    <RecruiterShell>
      <CandidatesList />
    </RecruiterShell>
  );
}
