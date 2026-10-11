"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import clsx from "clsx";
import { motion, useReducedMotion, type Variants } from "motion/react";
import "./landing.css";

const EASE = [0.22, 1, 0.36, 1] as const;

const stageVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.92 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 220, damping: 20 } },
};
const drop: Variants = {
  hidden: { opacity: 0, y: -60, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 16 } },
};
const march: Variants = {
  hidden: { opacity: 0, x: -90 },
  show: { opacity: 1, x: 0, transition: { duration: 0.9, ease: EASE } },
};
const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: EASE } },
};
const textVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE, delay: 0.2 } },
};

type Beat = { numeral: string; title: string; text: string; stage: ReactNode; alt: string };

const BEATS: Beat[] = [
  {
    numeral: "I",
    title: "Fundá tu polis",
    text: "Ordenás la obra y te vas. Se levanta sin vos.",
    alt: "Intendencia, academia y depósito que se levantan sobre una plaza",
    stage: <FoundStage />,
  },
  {
    numeral: "II",
    title: "Comerciá entre islas",
    text: "La tuya da vino y la de al lado, mármol. Tus barcos llevan lo que falta.",
    alt: "Un trirreme navega entre una isla de viñedos y una isla de mármol",
    stage: <TradeStage />,
  },
  {
    numeral: "III",
    title: "Conquistá el mar",
    text: "Primero los bárbaros de tu isla. Después, quien se anime.",
    alt: "Lanceros, hoplitas, arqueros y una catapulta avanzan hacia un campamento bárbaro",
    stage: <ConquerStage />,
  },
];

/**
 * The three beats of a game as cards; each plays its little scene when it comes into view.
 * Phones swipe through them (the next card peeks in), wider screens see the three in a row.
 */
export function Beats() {
  const list = useRef<HTMLOListElement>(null);
  // Keyboard users can scroll the row only while it actually scrolls (phones); on wide screens it's a plain grid.
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const sync = () => {
      if (el.scrollWidth > el.clientWidth + 1) el.tabIndex = 0;
      else el.removeAttribute("tabindex");
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <ol
      ref={list}
      aria-label="Cómo se juega, en tres momentos"
      className="scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {BEATS.map((beat) => (
        <motion.li
          key={beat.numeral}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="panel flex w-[84%] shrink-0 snap-start flex-col p-2 sm:w-[46%] lg:w-auto"
        >
          <motion.div variants={stageVariants} role="img" aria-label={beat.alt} className="relative aspect-[4/3] w-full">
            {beat.stage}
          </motion.div>
          <motion.div variants={textVariants} className="flex flex-col gap-1 px-2 pt-3 pb-2">
            <h3 className="font-display text-xl leading-tight font-bold text-ink">
              <span aria-hidden className="mr-2 text-bronze/60">
                {beat.numeral}
              </span>
              {beat.title}
            </h3>
            <p className="text-[16px] leading-snug text-ink-soft">{beat.text}</p>
          </motion.div>
        </motion.li>
      ))}
    </ol>
  );
}

function Sprite({ src, size, className, style, variants = rise }: { src: string; size: number; className?: string; style?: CSSProperties; variants?: Variants }) {
  return (
    <motion.div variants={variants} className={clsx("absolute", className)} style={style}>
      <Image src={src} alt="" width={size} height={size} className="sprite h-auto w-full" />
    </motion.div>
  );
}

function Puff({ className, delay }: { className: string; delay: number }) {
  return (
    <Image
      src="/assets/fx/smoke.webp"
      alt=""
      width={96}
      height={96}
      className={clsx("ld-smoke", "pointer-events-none absolute w-[18%] opacity-0", className)}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    />
  );
}

function FoundStage() {
  return (
    <div className="ld-stage ld-stage-plaza absolute inset-0">
      <div className="ld-stage-caustics" />
      <Sprite src="/assets/f-city.webp" size={192} variants={fade} className="top-[6%] left-[4%] w-[24%] opacity-80" />
      <Sprite src="/assets/b-town_hall.webp" size={384} variants={drop} className="top-[14%] left-[27%] w-[46%]" />
      <Sprite src="/assets/b-academy.webp" size={256} variants={drop} className="top-[44%] left-[6%] w-[36%]" />
      <Sprite src="/assets/b-warehouse.webp" size={256} variants={drop} className="top-[46%] right-[6%] w-[34%]" />
      <Puff className="top-[30%] left-[42%]" delay={600} />
      <Puff className="top-[58%] left-[16%]" delay={1900} />
      <Puff className="top-[60%] right-[16%]" delay={3200} />
    </div>
  );
}

const ROUTE = "M 92 182 C 150 90, 250 250, 312 132";

function TradeStage() {
  const svg = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) svg.current?.pauseAnimations();
  }, [reduce]);

  return (
    <div className="ld-stage ld-stage-sea absolute inset-0">
      <div className="ld-stage-caustics" />
      <Sprite src="/assets/island-wine.webp" size={256} className="top-[34%] left-[2%] w-[40%]" />
      <Sprite src="/assets/island-marble.webp" size={256} className="top-[10%] right-[2%] w-[40%]" />
      <motion.div variants={fade} className="absolute top-[22%] left-[14%] w-[11%]">
        <Image src="/assets/r-wine.webp" alt="" width={64} height={64} className="ld-bob sprite h-auto w-full" />
      </motion.div>
      <motion.div variants={fade} className="absolute top-[2%] right-[18%] w-[11%]">
        <Image
          src="/assets/r-marble.webp"
          alt=""
          width={64}
          height={64}
          className="ld-bob sprite h-auto w-full"
          style={{ "--d": "-1.4s" } as CSSProperties}
        />
      </motion.div>
      {/* Same 4:3 box as the stage, so the route and the ship scale together. */}
      <svg ref={svg} viewBox="0 0 400 300" className="absolute inset-0 size-full" aria-hidden>
        <motion.path
          d={ROUTE}
          fill="none"
          stroke="rgb(244 232 204 / 0.85)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="ld-route"
          variants={{ hidden: { pathLength: 0, opacity: 0 }, show: { pathLength: 1, opacity: 1, transition: { duration: 1.2, ease: EASE } } }}
        />
        <motion.g variants={fade}>
          <g>
            <animateMotion
              dur="10s"
              repeatCount="indefinite"
              rotate="auto"
              path={ROUTE}
              keyPoints="0.04;0.96;0.04"
              keyTimes="0;0.5;1"
              calcMode="spline"
              keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
            />
            <g transform="rotate(90)">
              <image href="/assets/fx/trireme-top.webp" x="-22" y="-22" width="44" height="44" style={{ filter: "drop-shadow(0 4px 3px rgb(6 26 48 / 0.5))" }} />
            </g>
          </g>
        </motion.g>
      </svg>
    </div>
  );
}

function ConquerStage() {
  return (
    <div className="ld-stage ld-stage-dusk absolute inset-0">
      <Sprite src="/assets/f-barbarians.webp" size={256} variants={fade} className="top-[18%] right-[3%] w-[44%]" />
      <Puff className="top-[10%] right-[22%]" delay={400} />
      <Puff className="top-[16%] right-[10%]" delay={2600} />
      <Sprite src="/assets/u-catapult.webp" size={192} variants={march} className="top-[50%] left-[2%] w-[24%]" />
      <Sprite src="/assets/u-archer.webp" size={192} variants={march} className="top-[22%] left-[14%] w-[22%]" />
      <Sprite src="/assets/u-spearman.webp" size={192} variants={march} className="top-[44%] left-[26%] w-[24%]" />
      <Sprite src="/assets/u-hoplite.webp" size={256} variants={march} className="top-[28%] left-[40%] w-[27%]" />
    </div>
  );
}
