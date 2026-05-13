import { RecruiterShell } from "@/components/recruiter/shell";
import { DashboardOverview } from "./dashboard-overview";

export const metadata = {
  title: "Dashboard",
  description: "Hiring activity overview for Remotown recruiters.",
};

export default function DashboardPage() {
  return (
    <RecruiterShell>
      <DashboardOverview />
    </RecruiterShell>
  );
}
