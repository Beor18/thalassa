// Camera for the world map. Lives outside React: every frame writes CSS transforms straight to a
// few layers, so panning and zooming never re-render the islands.
//
// Coordinates: world pixels (the island layout) and screen pixels (relative to the stage box).
// The camera stores the world point at the center of the stage and a zoom factor.

import { clamp } from "./geometry";

export type Lod = "far" | "mid" | "near";

export interface View {
  x: number;
  y: number;
  z: number;
}

interface Layer {
  el: HTMLElement;
  /** 1 = moves with the sea; > 1 = closer to the camera (clouds). */
  parallax: number;
}

const Z_MAX = 1.7;
const LOD_FAR = 0.42;
const LOD_NEAR = 0.7;
const FRICTION_MS = 325; // inertia time constant
const ZOOM_SMOOTH_MS = 75;

// van Wijk & Nuij "smooth and efficient zooming and panning" (same math as d3.interpolateZoom).
// Views are [cx, cy, w] where w is the visible width in world units.
const RHO = Math.SQRT2;
const RHO2 = 2;
const RHO4 = 4;
const cosh = (x: number) => ((x = Math.exp(x)) + 1 / x) / 2;
const sinh = (x: number) => ((x = Math.exp(x)) - 1 / x) / 2;
const tanh = (x: number) => ((x = Math.exp(2 * x)) - 1) / (x + 1);

function interpolateZoom(p0: [number, number, number], p1: [number, number, number]) {
  const [ux0, uy0, w0] = p0;
  const [ux1, uy1, w1] = p1;
  const dx = ux1 - ux0;
  const dy = uy1 - uy0;
  const d2 = dx * dx + dy * dy;
  let S: number;
  let fn: (t: number) => [number, number, number];
  if (d2 < 1e-12) {
    S = Math.log(w1 / w0) / RHO;
    fn = (t) => [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(RHO * t * S)];
  } else {
    const d1 = Math.sqrt(d2);
    const b0 = (w1 * w1 - w0 * w0 + RHO4 * d2) / (2 * w0 * RHO2 * d1);
    const b1 = (w1 * w1 - w0 * w0 - RHO4 * d2) / (2 * w1 * RHO2 * d1);
    const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
    const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
    S = (r1 - r0) / RHO;
    fn = (t) => {
      const s = t * S;
      const coshr0 = cosh(r0);
      const u = (w0 / (RHO2 * d1)) * (coshr0 * tanh(RHO * s + r0) - sinh(r0));
      return [ux0 + u * dx, uy0 + u * dy, (w0 * coshr0) / cosh(RHO * s + r0)];
    };
  }
  return { fn, duration: Math.abs(S) * 1000 * (RHO / Math.SQRT2) };
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Camera {
  x = 0;
  y = 0;
  z = 0.8;
  vw = 1;
  vh = 1;
  zMin = 0.1;
  readonly zMax = Z_MAX;
  reducedMotion = false;
  onLod?: (lod: Lod) => void;

  private world: { w: number; h: number };
  private extent: { x0: number; y0: number; x1: number; y1: number };
  private layers: Layer[] = [];
  private worldEl: HTMLElement | null = null;
  private causticsEl: HTMLElement | null = null;
  private skyEl: HTMLElement | null = null;
  private causticsTile = 512;

  private raf = 0;
  private last = 0;
  private flight: { fn: (t: number) => [number, number, number]; start: number; dur: number } | null = null;
  private vel = { x: 0, y: 0 }; // screen px per ms
  private zoomGoal: { z: number; ax: number; ay: number } | null = null;
  private lod: Lod | null = null;
  private labelScale = 0;

  constructor(world: { w: number; h: number }, extent: { x0: number; y0: number; x1: number; y1: number }) {
    this.world = world;
    this.extent = extent;
    this.x = (extent.x0 + extent.x1) / 2;
    this.y = (extent.y0 + extent.y1) / 2;
  }

  attach({ layers, world, caustics, sky }: { layers: Layer[]; world: HTMLElement; caustics: HTMLElement | null; sky: HTMLElement | null }) {
    this.layers = layers;
    this.worldEl = world;
    this.causticsEl = caustics;
    this.skyEl = sky;
  }

  detach() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.layers = [];
    this.worldEl = this.causticsEl = this.skyEl = null;
  }

  /** Smallest zoom: the whole archipelago fits, and the stage never sees past the painted sea. */
  resize(vw: number, vh: number) {
    this.vw = Math.max(1, vw);
    this.vh = Math.max(1, vh);
    const cover = Math.max(this.vw / this.world.w, this.vh / this.world.h);
    const ew = this.extent.x1 - this.extent.x0 + 200;
    const eh = this.extent.y1 - this.extent.y0 + 260;
    const contain = Math.min(this.vw / ew, this.vh / eh);
    this.zMin = Math.min(0.5, Math.max(cover, contain * 0.85));
    this.z = clamp(this.z, this.zMin, Z_MAX);
    this.clampCenter();
    this.apply();
  }

  /** Overview: the whole archipelago from high above. */
  overview(): View {
    const ew = this.extent.x1 - this.extent.x0 + 200;
    const eh = this.extent.y1 - this.extent.y0 + 260;
    const fit = Math.min(this.vw / ew, this.vh / eh);
    return { x: (this.extent.x0 + this.extent.x1) / 2, y: (this.extent.y0 + this.extent.y1) / 2, z: clamp(fit * 1.15, this.zMin, 0.5) };
  }

  get view(): View {
    return { x: this.x, y: this.y, z: this.z };
  }

  setView(v: View) {
    this.stop();
    this.x = v.x;
    this.y = v.y;
    this.z = clamp(v.z, this.zMin, Z_MAX);
    this.clampCenter();
    this.apply();
  }

  screenToWorld(sx: number, sy: number) {
    return { x: this.x + (sx - this.vw / 2) / this.z, y: this.y + (sy - this.vh / 2) / this.z };
  }

  worldToScreen(wx: number, wy: number) {
    return { x: (wx - this.x) * this.z + this.vw / 2, y: (wy - this.y) * this.z + this.vh / 2 };
  }

  /** Cancel every running motion (flight, inertia, smooth zoom). */
  stop() {
    this.flight = null;
    this.zoomGoal = null;
    this.vel = { x: 0, y: 0 };
  }

  get moving() {
    return this.raf !== 0;
  }

  dragBy(dx: number, dy: number) {
    this.x -= dx / this.z;
    this.y -= dy / this.z;
    this.clampCenter();
    this.apply();
  }

  /** Let go after a drag: glide with the release velocity (screen px per ms). */
  release(vx: number, vy: number) {
    if (this.reducedMotion) return;
    const max = 4;
    this.vel = { x: clamp(vx, -max, max), y: clamp(vy, -max, max) };
    if (Math.hypot(vx, vy) > 0.05) this.loop();
  }

  /** Keyboard nudge: a short glide in screen space. */
  nudge(dx: number, dy: number) {
    this.flight = null;
    if (this.reducedMotion) {
      this.dragBy(-dx * 180, -dy * 180);
      return;
    }
    this.vel = { x: dx * 1.1, y: dy * 1.1 };
    this.loop();
  }

  /** Zoom by a factor around a screen point. Smooth unless reduced motion or `instant`. */
  zoomAt(factor: number, sx = this.vw / 2, sy = this.vh / 2, instant = false) {
    this.flight = null;
    const base = this.zoomGoal?.z ?? this.z;
    const goal = clamp(base * factor, this.zMin, Z_MAX);
    if (instant || this.reducedMotion) {
      this.zoomGoal = null;
      this.applyZoom(goal, sx, sy);
      this.clampCenter();
      this.apply();
      return;
    }
    this.zoomGoal = { z: goal, ax: sx, ay: sy };
    this.loop();
  }

  /** Fly along a smooth zoom-out/zoom-in arc. `offset` keeps the target off-center (screen px). */
  flyTo(target: View, opts: { offsetX?: number; offsetY?: number; duration?: number; minDuration?: number } = {}) {
    const z1 = clamp(target.z, this.zMin, Z_MAX);
    const x1 = target.x + (opts.offsetX ?? 0) / z1;
    const y1 = target.y + (opts.offsetY ?? 0) / z1;
    this.vel = { x: 0, y: 0 };
    this.zoomGoal = null;
    if (this.reducedMotion) {
      this.flight = null;
      this.x = x1;
      this.y = y1;
      this.z = z1;
      this.clampCenter();
      this.apply();
      return;
    }
    const { fn, duration } = interpolateZoom([this.x, this.y, this.vw / this.z], [x1, y1, this.vw / z1]);
    const dur = opts.duration ?? clamp(duration * 0.75, opts.minDuration ?? 450, 1800);
    this.flight = { fn, start: performance.now(), dur };
    this.loop();
  }

  private applyZoom(nz: number, ax: number, ay: number) {
    const before = this.screenToWorld(ax, ay);
    this.z = nz;
    this.x = before.x - (ax - this.vw / 2) / nz;
    this.y = before.y - (ay - this.vh / 2) / nz;
  }

  private clampCenter() {
    const hw = this.vw / (2 * this.z);
    const hh = this.vh / (2 * this.z);
    const { w, h } = this.world;
    const cx = w <= hw * 2 ? w / 2 : clamp(this.x, hw, w - hw);
    const cy = h <= hh * 2 ? h / 2 : clamp(this.y, hh, h - hh);
    if (cx !== this.x) this.vel.x = 0;
    if (cy !== this.y) this.vel.y = 0;
    this.x = cx;
    this.y = cy;
  }

  private loop() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    const dt = Math.min(48, Math.max(1, now - this.last));
    this.last = now;
    let active = false;

    if (this.flight) {
      const t = Math.min(1, (now - this.flight.start) / this.flight.dur);
      const [x, y, w] = this.flight.fn(easeInOutCubic(t));
      this.x = x;
      this.y = y;
      this.z = clamp(this.vw / w, this.zMin, Z_MAX);
      if (t >= 1) this.flight = null;
      else active = true;
    } else {
      if (this.zoomGoal) {
        const k = 1 - Math.exp(-dt / ZOOM_SMOOTH_MS);
        const lz = Math.log(this.z);
        const lg = Math.log(this.zoomGoal.z);
        const nz = Math.abs(lg - lz) < 0.002 ? this.zoomGoal.z : Math.exp(lz + (lg - lz) * k);
        this.applyZoom(nz, this.zoomGoal.ax, this.zoomGoal.ay);
        if (nz === this.zoomGoal.z) this.zoomGoal = null;
        else active = true;
      }
      if (this.vel.x !== 0 || this.vel.y !== 0) {
        this.x -= (this.vel.x * dt) / this.z;
        this.y -= (this.vel.y * dt) / this.z;
        const decay = Math.exp(-dt / FRICTION_MS);
        this.vel.x *= decay;
        this.vel.y *= decay;
        if (Math.hypot(this.vel.x, this.vel.y) < 0.012) this.vel = { x: 0, y: 0 };
        else active = true;
      }
    }

    this.clampCenter();
    this.apply();
    this.raf = active ? requestAnimationFrame(this.tick) : 0;
  };

  /** Write transforms. Called once per frame at most while moving. */
  apply() {
    const { x, y, z, vw, vh } = this;
    const W2 = this.world.w / 2;
    const H2 = this.world.h / 2;
    for (const { el, parallax } of this.layers) {
      const px = W2 + (x - W2) * parallax;
      const py = H2 + (y - H2) * parallax;
      el.style.transform = `translate3d(${(vw / 2 - px * z).toFixed(2)}px, ${(vh / 2 - py * z).toFixed(2)}px, 0) scale(${z.toFixed(4)})`;
    }

    if (this.causticsEl) {
      // Light on the sea floor: screen-space, a touch slower than the surface.
      const T = this.causticsTile;
      const ox = -(((x * z * 0.9) % T) + T) % T;
      const oy = -(((y * z * 0.9) % T) + T) % T;
      this.causticsEl.style.transform = `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, 0)`;
      this.causticsEl.style.opacity = clamp((z - 0.2) / 0.5, 0, 1).toFixed(2);
    }
    if (this.skyEl) {
      // Thicker clouds when you look from far away; they part as you come down.
      this.skyEl.style.opacity = (0.62 + 0.38 * clamp((0.75 - z) / 0.5, 0, 1)).toFixed(2);
    }

    if (this.worldEl) {
      const lod: Lod = z < LOD_FAR ? "far" : z < LOD_NEAR ? "mid" : "near";
      if (lod !== this.lod) {
        this.lod = lod;
        this.worldEl.dataset.lod = lod;
        this.onLod?.(lod);
      }
      // Labels keep a readable on-screen size and islands grow a little when seen from far away.
      // Quantized so panning never restyles them.
      const ls = clamp(0.92 / z, 1, 6);
      if (Math.abs(ls - this.labelScale) / ls > 0.03) {
        this.labelScale = ls;
        this.worldEl.style.setProperty("--ls", ls.toFixed(3));
        this.worldEl.style.setProperty("--is", clamp(0.36 / z, 1, 1.8).toFixed(3));
      }
    }
  }
}
