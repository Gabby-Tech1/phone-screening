import { RecruiterShell } from "@/components/recruiter/shell";
import { SettingsView } from "./settings-view";

export const metadata = {
  title: "Settings",
  description: "Profile, appearance, and data preferences.",
};

export default function SettingsPage() {
  return (
    <RecruiterShell>
      <SettingsView />
    </RecruiterShell>
  );
}
