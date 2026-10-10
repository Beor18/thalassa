import clsx from "clsx";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ambrosia" | "sea";
type Size = "sm" | "md" | "lg";

/*
  Bronze and ambrosia buttons are physical: a 3px "depth" under the face, a light sweep on hover,
  and they sink 2px when pressed. Flat variants just shift color.
*/
const variants: Record<Variant, string> = {
  primary: clsx(
    "btn-sheen border border-bronze-dark bg-gradient-to-b from-bronze-light via-bronze to-bronze-dark text-marble",
    "[text-shadow:0_1px_0_rgb(92_58_16/0.7)]",
    "shadow-[0_1px_0_rgb(255_255_255/0.4)_inset,0_-1px_0_rgb(0_0_0/0.15)_inset,0_3px_0_var(--color-bronze-deep),0_6px_14px_-6px_rgb(6_26_48/0.6)]",
    "hover:brightness-110",
    "active:translate-y-[2px] active:shadow-[0_1px_0_rgb(255_255_255/0.35)_inset,0_1px_0_var(--color-bronze-deep)]",
  ),
  secondary: clsx(
    "border border-parchment-3 bg-gradient-to-b from-marble to-parchment-2 text-ink",
    "shadow-[0_1px_0_rgb(255_255_255/0.7)_inset,0_2px_0_var(--color-parchment-3)]",
    "hover:from-parchment hover:to-parchment-3/80 active:translate-y-px active:shadow-[0_1px_0_var(--color-parchment-3)]",
  ),
  ghost: "bg-transparent text-ink-soft hover:bg-ink/5 hover:text-ink active:bg-ink/10",
  danger: clsx(
    "border border-[#7d1a14] bg-gradient-to-b from-[#c8372d] to-danger text-marble",
    "shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_3px_0_#5e130e] hover:brightness-110",
    "active:translate-y-[2px] active:shadow-[0_1px_0_#5e130e]",
  ),
  ambrosia: clsx(
    "btn-sheen border border-ambrosia-deep bg-gradient-to-b from-ambrosia-light via-ambrosia to-ambrosia-dark text-marble",
    "[text-shadow:0_1px_0_rgb(63_28_107/0.7)]",
    "shadow-[0_1px_0_rgb(255_255_255/0.4)_inset,0_3px_0_var(--color-ambrosia-deep),0_8px_18px_-8px_rgb(155_93_229/0.7)]",
    "hover:brightness-110",
    "active:translate-y-[2px] active:shadow-[0_1px_0_rgb(255_255_255/0.35)_inset,0_1px_0_var(--color-ambrosia-deep)]",
  ),
  sea: clsx(
    "border border-sea-500/60 bg-gradient-to-b from-sea-500 to-sea-700 text-foam",
    "shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_2px_0_var(--color-sea-900)]",
    "hover:brightness-110 active:translate-y-px active:shadow-[0_1px_0_var(--color-sea-900)]",
  ),
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-[15px] gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return clsx(
    "relative isolate inline-flex items-center justify-center overflow-hidden rounded-lg font-bold tracking-wide whitespace-nowrap select-none",
    "transition-[transform,box-shadow,filter,background-color,color,opacity] duration-100 ease-out",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

/** Small spinning ring sized to the button text. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={clsx("size-4 shrink-0 animate-spin", className)} fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      className={buttonClass(variant, size, clsx(loading && "disabled:opacity-80", className))}
      disabled={disabled || loading}
      {...(loading ? { "aria-busy": true } : null)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
