"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";

/**
 * A card that leans toward the mouse with a soft glare, like a coin tilted in the light.
 * Mouse only (touch scrolls normally), springs back on leave, still for reduced motion.
 */
export function Tilt({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const spring = { stiffness: 260, damping: 22, mass: 0.6 };
  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 30 });
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgb(255 255 255 / 0.55), transparent 55%)`;

  return (
    <motion.div
      className={clsx("relative h-full [transform-style:preserve-3d]", className)}
      style={{ rotateX, rotateY, transformPerspective: 700 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        rotateY.set((px - 0.5) * max * 2);
        rotateX.set((0.5 - py) * max * 2);
        gx.set(px * 100);
        gy.set(py * 100);
        glareOpacity.set(0.7);
      }}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
        glareOpacity.set(0);
      }}
    >
      {children}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
        style={{ backgroundImage: glare, opacity: glareOpacity }}
      />
    </motion.div>
  );
}
