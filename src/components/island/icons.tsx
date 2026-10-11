import type { SVGProps } from "react";

// Small inline icon set (stroke 2, 24 grid). No icon dependency in the project, so we keep the few we need here.
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
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const IconCross = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);

export const IconSwords = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
    <path d="M13 19l6-6M16 16l4 4M19 21l2-2" />
    <path d="M9.5 6.5L13 3h3v3l-3.5 3.5" />
    <path d="M5 14l-2 2 2 2M8 19l-2 2" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);

export const IconFlag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </Svg>
);

export const IconTemple = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9l9-5 9 5H3z" />
    <path d="M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 21h18M4 18h16" />
  </Svg>
);

export const IconAxe = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 10L4 20" />
    <path d="M13 4c3 0 7 3 7 7l-3 1-5-5 1-3z" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5.5c0 4.4-3 7.9-7 9.5-4-1.6-7-5.1-7-9.5V6l7-3z" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);

export const IconBox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8L12 4l8.5 4v8.5L12 20.5l-8.5-4V8z" />
    <path d="M3.5 8L12 12l8.5-4M12 12v8.5" />
  </Svg>
);

export const IconMap = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4L3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5L9 4z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </Svg>
);

export const IconScroll = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3h11a2 2 0 0 1 0 4h-2v12a2 2 0 0 1-2 2H6a2 2 0 0 1 0-4h2V3z" />
    <path d="M11 8h4M11 12h4" />
  </Svg>
);
