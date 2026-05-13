import Link from "next/link";
import type { Job } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  screeningCount: number;
}

export function JobCard({ job, screeningCount }: JobCardProps) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-secondary"
    >
      <div className="mb-md flex items-start justify-between">
        <div className="rounded-lg bg-secondary/10 p-sm text-secondary">
          <Icon name={job.icon} size={24} />
        </div>
        <Chip tone={job.status === "Active" ? "success" : "warning"}>
          {job.status}
        </Chip>
      </div>

      <h3 className="text-headline-sm text-on-surface transition-colors group-hover:text-secondary">
        {job.title}
      </h3>

      <div className="mt-xs mb-lg flex flex-wrap items-center gap-xs text-body-sm text-on-surface-variant">
        <span className="inline-flex items-center gap-xs">
          <Icon name="location_on" size={16} />
          {job.location}
        </span>
        <span className="h-1 w-1 self-center rounded-full bg-outline-variant" />
        <span className="inline-flex items-center gap-xs">
          <Icon name="schedule" size={16} />
          {job.employmentType}
        </span>
      </div>

      <div
        className={cn(
          "mt-auto flex items-center justify-between border-t border-outline-variant pt-lg"
        )}
      >
        <div>
          <p className="text-label-sm uppercase tracking-wider text-outline">
            Screenings
          </p>
          <p className="text-headline-sm font-bold text-on-surface">
            {screeningCount}
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
          <Icon name="arrow_forward" />
        </span>
      </div>
    </Link>
  );
}
