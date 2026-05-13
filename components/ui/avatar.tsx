import { cn, avatarTone, initials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "h-8 w-8 text-label-sm",
  md: "h-10 w-10 text-label-md",
  lg: "h-12 w-12 text-headline-sm",
};

const toneStyles = {
  primary:
    "bg-secondary-fixed text-on-secondary-fixed dark:bg-secondary-container dark:text-on-secondary-container",
  tertiary:
    "bg-tertiary-fixed text-on-tertiary-fixed dark:bg-tertiary-container dark:text-on-tertiary-container",
  neutral: "bg-surface-variant text-on-surface-variant",
} as const;

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const tone = avatarTone(name);
  return (
    <div
      aria-label={name}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full font-semibold tracking-tight",
        sizeStyles[size],
        toneStyles[tone],
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
