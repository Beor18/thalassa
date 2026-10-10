"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import heroImage from "../../../public/assets/hero.webp";
import { seeded } from "@/components/motion/reveal";
import "./landing.css";

/* Golden dust drifting in the late-afternoon light (upper right of the painting). Deterministic. */
const DUST = Array.from({ length: 30 }, (_, i) => {
  const r = seeded(i + 1);
  const r2 = seeded(i + 101);
  const r3 = seeded(i + 211);
  return {
    left: `${(30 + r * 68).toFixed(2)}%`,
    top: `${(10 + r2 * 70).toFixed(2)}%`,
    size: 3 + Math.round(r3 * 4),
    duration: `${(9 + r2 * 9).toFixed(2)}s`,
    delay: `${(-r * 16).toFixed(2)}s`,
    dx: `${Math.round((r3 - 0.5) * 80)}px`,
    glint: i % 7 === 0,
  };
});

const GULLS = [
  { top: "19%", size: 36, duration: "30s", delay: "-9s", flap: "0.9s" },
  { top: "29%", size: 26, duration: "42s", delay: "-30s", flap: "0.75s" },
];

/**
 * The painted harbor, alive: a slow Ken Burns push, light dancing on the water, drifting clouds,
 * gulls, a trireme crossing and golden dust in the sun. Mouse and scroll add a little depth.
 * Everything pauses when the hero leaves the screen; reduced motion leaves a still painting.
 */
export function HeroScene() {
  const root = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Pointer parallax (fine pointers only), smoothed with springs.
  const px = useSpring(0, { stiffness: 60, damping: 18, mass: 0.6 });
  const py = useSpring(0, { stiffness: 60, damping: 18, mass: 0.6 });
  useEffect(() => {
    if (reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      px.set(e.clientX / window.innerWidth - 0.5);
      py.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, px, py]);

  // Pause every loop once the hero is out of view.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.paused = entry.isIntersecting ? "false" : "true";
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { scrollY } = useScroll();
  const scrollFar = useTransform(scrollY, [0, 900], [0, 140]);
  const scrollNear = useTransform(scrollY, [0, 900], [0, 60]);
  const farX = useTransform(px, (v) => v * -14);
  const farY = useTransform(py, (v) => v * -8);
  const midX = useTransform(px, (v) => v * -26);
  const nearX = useTransform(px, (v) => v * -44);
  const nearY = useTransform(py, (v) => v * -16);
  // Motion values always render (same markup on server and client); they just stay at 0 when reduced.
  const farTotalY = useTransform(() => farY.get() + (reduce ? 0 : scrollFar.get()));
  const midTotalY = useTransform(() => (reduce ? 0 : scrollNear.get()));

  return (
    <div ref={root} aria-hidden className="ld-scene absolute inset-0 -z-10 overflow-hidden">
      {/* Far: the painting */}
      <motion.div className="absolute -inset-[4%]" style={{ x: farX, y: farTotalY }}>
        <div className="ld-ken-burns absolute inset-0">
          <Image
            src={heroImage}
            alt=""
            fill
            preload
            placeholder="blur"
            sizes="108vw"
            className="object-cover object-[62%_center] sm:object-center"
          />
          {/* Light on the water: caustics masked to the sea, drifting two ways */}
          <div className="ld-water-mask">
            <div className="ld-caustics-a" />
            <div className="ld-caustics-b" />
          </div>
        </div>
      </motion.div>

      {/* Mid: a trireme rowing across the bay toward the open sea */}
      <motion.div className="absolute inset-0" style={{ x: midX, y: midTotalY }}>
        <div className="ld-ship-lane">
          <div className="ld-ship">
            <span className="ld-wake" />
            <Image src="/assets/u-ship.webp" alt="" width={192} height={192} className="ld-ship-sprite" />
          </div>
        </div>
      </motion.div>

      {/* Near: clouds, gulls and dust */}
      <motion.div className="absolute inset-0" style={{ x: nearX, y: nearY }}>
        <Image src="/assets/fx/cloud-1.webp" alt="" width={1024} height={512} loading="eager" sizes="52vw" className="ld-cloud ld-cloud-a" />
        <Image src="/assets/fx/cloud-3.webp" alt="" width={1024} height={512} loading="eager" sizes="36vw" className="ld-cloud ld-cloud-b" />
        {GULLS.map((g, i) => (
          <div
            key={i}
            className="ld-gull-lane"
            style={{ top: g.top, "--dur": g.duration, "--delay": g.delay } as CSSProperties}
          >
            <Image
              src="/assets/fx/seagull.webp"
              alt=""
              width={g.size * 2}
              height={g.size * 2}
              className="ld-gull"
              style={{ width: g.size, height: g.size, "--flap": g.flap } as CSSProperties}
            />
          </div>
        ))}
      </motion.div>

      {/* Warm light from the sun, then the scrims that keep the copy readable */}
      <div className="ld-sun-rays" />
      <div className="absolute inset-0 bg-gradient-to-t from-sea-950 via-sea-950/55 to-sea-950/5" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-sea-950/70 via-sea-950/25 to-transparent" />
      <div className="absolute inset-0 hidden bg-gradient-to-r from-sea-950/85 via-sea-950/30 to-transparent md:block" />

      {/* Golden dust floats in front of everything, catching the light */}
      <motion.div className="absolute inset-0 mix-blend-screen" style={{ x: nearX, y: nearY }}>
        {DUST.map((d, i) => (
          <span
            key={i}
            className={d.glint ? "ld-glint" : "ld-dust"}
            style={
              {
                left: d.left,
                top: d.top,
                width: d.glint ? 14 : d.size,
                height: d.glint ? 14 : d.size,
                "--dur": d.duration,
                "--delay": d.delay,
                "--dx": d.dx,
              } as CSSProperties
            }
          />
        ))}
      </motion.div>
    </div>
  );
}
