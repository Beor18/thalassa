"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

/**
 * App-wide motion settings. `reducedMotion="user"` turns transform and layout animations
 * off for people who asked their OS for less motion; opacity changes still apply.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.8 }}>
      {children}
    </MotionConfig>
  );
}
