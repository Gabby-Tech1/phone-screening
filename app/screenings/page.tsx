import { RecruiterShell } from "@/components/recruiter/shell";
import { ScreeningsList } from "./screenings-list";

export const metadata = {
  title: "Screenings",
  description: "All screening templates across your active jobs.",
};

export default function ScreeningsPage() {
  return (
    <RecruiterShell>
      <ScreeningsList />
    </RecruiterShell>
  );
}
