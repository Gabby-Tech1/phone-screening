import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

/**
 * Material Symbols Outlined wrapper.
 *
 * The font is loaded in `app/layout.tsx`. We expose `fill` and `weight` props
 * so individual icons can opt into a filled or heavier glyph without a
 * separate font request.
 */
export interface IconProps {
  name: string;
  className?: string;
  /** 0 = outlined, 1 = filled. */
  fill?: 0 | 1;
  /** Glyph weight (100..700). Default 400. */
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  /** Optical size in px — leave as default for most cases. */
  opsz?: number;
  /** Size in px (font-size). The icon scales by font-size. */
  size?: number;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
}

export function Icon({
  name,
  className,
  fill = 0,
  weight = 400,
  opsz = 24,
  size,
  style,
  "aria-hidden": ariaHidden = true,
}: IconProps) {
  return (
    <span
      aria-hidden={ariaHidden}
      className={cn("material-symbols-outlined leading-none", className)}
      style={{
        fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${opsz}`,
        fontSize: size ? `${size}px` : undefined,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
