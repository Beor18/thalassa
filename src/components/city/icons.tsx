import type { SVGProps } from "react";

/* Small inline icons for the city panels (24 grid, stroke 2). Decorative: always aria-hidden. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.01" />
  </Svg>
);

export const IconPencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="M13.5 6.5l4 4" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);

/** Upgrade arrow. */
export const IconUp = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.6}>
    <path d="M12 19V6M6 11.5 12 5.5l6 6" />
  </Svg>
);

export const IconHammer = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 12-8.4 8.4a2.1 2.1 0 0 1-3-3L12 9" />
    <path d="M17.6 15.4 22 11l-2.4-2.4V7l-3-3C15 2.6 13 2 11 2H9l1 1c1.3 1.3 2 2.8 2 4.6V9l3 3h1.4z" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6l-7-3Z" />
  </Svg>
);

export const IconSword = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
    <path d="M13 19l6-6M16 16l4 4M19 21l2-2" />
  </Svg>
);

export const IconShip = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 16h18l-2.5 4h-13z" />
    <path d="M12 3v13M12 4l6 9h-6" />
  </Svg>
);

export const IconBox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8 12 3l9 5v9l-9 5-9-5z" />
    <path d="M3 8l9 5 9-5M12 13v9" />
  </Svg>
);

export const IconChevron = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);

export const IconColumns = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8 12 3l9 5H3ZM4 20h16M5 11v7M9.7 11v7M14.3 11v7M19 11v7" />
  </Svg>
);

/** Colored face: happy when `happy`, sad otherwise. */
export function FaceIcon({ happy = true, size = 20, className }: { happy?: boolean; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false" className={className}>
      <circle cx="12" cy="12" r="10" fill={happy ? "#e3b341" : "#d98a6a"} stroke="#7a4f18" strokeWidth="1.4" />
      <circle cx="8.6" cy="10" r="1.3" fill="#2b2118" />
      <circle cx="15.4" cy="10" r="1.3" fill="#2b2118" />
      <path
        d={happy ? "M7.8 14.2c1 1.6 2.5 2.4 4.2 2.4s3.2-.8 4.2-2.4" : "M7.8 16.6c1-1.5 2.5-2.3 4.2-2.3s3.2.8 4.2 2.3"}
        fill="none"
        stroke="#2b2118"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
