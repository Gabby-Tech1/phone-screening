import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center px-lg py-xl text-center",
        className
      )}
    >
      <div className="mb-md flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low">
        <Icon name={icon} className="text-on-surface-variant" size={32} />
      </div>
      <div className="min-w-0 self-stretch px-md">
        <h4 className="mx-auto max-w-[32rem] text-headline-sm text-on-surface">
          {title}
        </h4>
        {description && (
          <p className="mx-auto mt-sm max-w-[36rem] text-body-md leading-relaxed text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-lg">{action}</div>}
    </div>
  );
}
