"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import clsx from "clsx";
import type { WorldIsland } from "@/server/queries";
import { SHIP_IMAGE } from "@/game/layout";
import { fmtDuration } from "@/lib/format";
import { Camera, type View } from "./camera";
import { clamp, curvePath, layoutWorld, pointOnCurve, routeCurve, type Curve } from "./geometry";
import { IslandMarker, type MapIsland } from "./island-marker";
import { FleetTracks, Fleets, fleetRoutes } from "./fleets";
import { CARD_WIDTH, IslandCard, SHEET_HEIGHT } from "./island-card";
import { IslandSearch, MapControls, MapDock } from "./hud";
import { CausticsLayers, CloudShadows, Clouds, Compass, Gulls, cloudField } from "./sea-fx";
import type { FleetKind, FleetView, MyCity, WorldFx } from "./types";
import { s } from "./styles";

const DESKTOP_QUERY = "(min-width: 768px)";
const SKY_PARALLAX = 1.14;

function subscribeDesktop(cb: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const isDesktopNow = () => window.matchMedia(DESKTOP_QUERY).matches;

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduce(cb: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const prefersReduce = () => window.matchMedia(REDUCE_QUERY).matches;

/** Space taken below the stage by its ancestors (padding, borders, following siblings). */
function spaceBelow(el: HTMLElement) {
  let sum = 0;
  let node: HTMLElement = el;
  while (node.parentElement && node !== document.body) {
    for (let sib = node.nextElementSibling; sib; sib = sib.nextElementSibling) {
      const cs = getComputedStyle(sib);
      if (cs.position === "absolute" || cs.position === "fixed" || cs.display === "none") continue;
      sum += sib.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
    }
    const parent = node.parentElement;
    const ps = getComputedStyle(parent);
    sum += parseFloat(ps.paddingBottom) + parseFloat(ps.borderBottomWidth);
    node = parent;
  }
  return sum;
}

/** The stage takes exactly the viewport height left under the game header, so the page never scrolls. */
function fitStage(el: HTMLElement) {
  const top = el.getBoundingClientRect().top + window.scrollY;
  // Phones have a tall header: a smaller floor there keeps the page from scrolling.
  const min = window.innerWidth < 640 ? 360 : 500;
  const h = Math.max(min, Math.floor(window.innerHeight - top - spaceBelow(el)));
  if (Math.abs(h - el.offsetHeight) > 1) el.style.height = `${h}px`;
}

export function WorldMap({
  islands,
  currentIslandId,
  originName,
  travel,
  fleets,
  myCities,
  serverNow,
  fx,
}: {
  islands: WorldIsland[];
  currentIslandId: number;
  originName: string;
  /** seconds from the active city to each island */
  travel: Record<number, number>;
  fleets: FleetView[];
  myCities: MyCity[];
  serverNow: number;
  fx: WorldFx;
}) {
  const layout = useMemo(() => layoutWorld(islands), [islands]);
  const routes = useMemo(() => fleetRoutes(fleets, layout.byId), [fleets, layout]);
  const clouds = useMemo(() => cloudField(layout.extent, fx.clouds), [layout.extent, fx.clouds]);

  const stageRef = useRef<HTMLElement>(null);
  const seaRef = useRef<HTMLDivElement>(null);
  const causticsRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const layoutRef = useRef(layout);
  const homeRef = useRef(currentIslandId);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hint, setHint] = useState(true);
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktopNow, () => true);
  const reducedMotion = useSyncExternalStore(subscribeReduce, prefersReduce, () => false);
  const helpId = useId();
  const maskId = `route-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useLayoutEffect(() => {
    layoutRef.current = layout;
    homeRef.current = currentIslandId;
  });

  const homeView = useCallback((): View | null => {
    const cam = cameraRef.current;
    const home = layoutRef.current.byId.get(homeRef.current);
    if (!cam || !home) return null;
    return { x: home.px, y: home.py, z: cam.vw < 640 ? 0.6 : 0.78 };
  }, []);

  /** Fly to an island, framing the whole voyage from your island when it fits, clear of the card. */
  const focusIsland = useCallback((id: number) => {
    const cam = cameraRef.current;
    const L = layoutRef.current;
    const isl = L.byId.get(id);
    if (!cam || !isl) return;
    const desk = isDesktopNow();
    const top = 72; // search bar
    const cardW = desk ? CARD_WIDTH + 32 : 0;
    // Desktop keeps the legend and zoom buttons at the bottom; phones get the sheet instead.
    const bottom = desk ? 120 : Math.min(SHEET_HEIGHT, cam.vh * 0.6);
    const availW = cam.vw - cardW;
    const availH = cam.vh - top - bottom;
    // On short phones the island must fit in the strip left above the sheet.
    const zIsland = desk ? 0.8 : clamp((availH * 0.85) / isl.size, 0.4, 0.8);
    let view: View = { x: isl.px, y: isl.py, z: clamp(Math.max(desk ? cam.z : 0, zIsland), cam.zMin, cam.zMax) };
    const home = L.byId.get(homeRef.current);
    if (home && home.id !== isl.id) {
      const m = 150;
      const zFit = Math.min(availW / (Math.abs(home.px - isl.px) + 2 * m), availH / (Math.abs(home.py - isl.py) + 2 * m + 60));
      if (zFit >= 0.36) view = { x: (home.px + isl.px) / 2, y: (home.py + isl.py) / 2 + 20, z: Math.min(zFit, 0.85) };
    }
    cam.flyTo(view, { offsetX: cardW / 2, offsetY: bottom / 2 - top / 2 });
  }, []);

  /** Pick an island. From the keyboard, focus jumps to the card's main action. */
  const select = useCallback(
    (id: number, via: "pointer" | "keyboard" = "pointer") => {
      setSelectedId(id);
      setHint(false);
      focusIsland(id);
      if (via === "keyboard") {
        window.setTimeout(() => stageRef.current?.querySelector<HTMLElement>("[data-card-primary]")?.focus({ preventScroll: true }), 80);
      }
    },
    [focusIsland],
  );

  /** Close the card; if focus was inside it, hand it back to the island. */
  const closeCard = useCallback(() => {
    const stage = stageRef.current;
    const hadFocus = !!stage?.querySelector("[data-card]")?.contains(document.activeElement);
    if (hadFocus && selectedId !== null) {
      window.setTimeout(() => stage?.querySelector<HTMLElement>(`[data-island="${selectedId}"] button`)?.focus({ preventScroll: true }), 0);
    }
    setSelectedId(null);
  }, [selectedId]);

  const goHome = useCallback(() => {
    setSelectedId(null);
    const v = homeView();
    if (v) cameraRef.current?.flyTo(v);
  }, [homeView]);

  // Camera, input and the opening flight. Runs once; reads fresh data through refs.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const sea = seaRef.current;
    const world = worldRef.current;
    const sky = skyRef.current;
    if (!stage || !sea || !world || !sky) return;
    const L = layoutRef.current;
    const cam = new Camera({ w: L.width, h: L.height }, L.extent);
    cameraRef.current = cam;
    const motionQuery = window.matchMedia(REDUCE_QUERY);
    cam.reducedMotion = motionQuery.matches;
    const onMotionPref = () => {
      cam.reducedMotion = motionQuery.matches;
    };
    motionQuery.addEventListener("change", onMotionPref);

    cam.attach({
      layers: [
        { el: sea, parallax: 1 },
        { el: world, parallax: 1 },
        { el: sky, parallax: SKY_PARALLAX },
      ],
      world,
      caustics: causticsRef.current,
      sky,
    });

    fitStage(stage);
    cam.resize(stage.clientWidth, stage.clientHeight);

    // Opening shot: the whole Aegean from above the clouds, then down to your island.
    const home = homeView();
    let intro = 0;
    if (home && !cam.reducedMotion) {
      cam.setView(cam.overview());
      intro = window.setTimeout(() => cam.flyTo(home, { duration: 2600 }), 450);
    } else if (home) {
      cam.setView(home);
    } else {
      cam.setView(cam.overview());
    }
    stage.dataset.ready = "";

    const ro = new ResizeObserver(() => cam.resize(stage.clientWidth, stage.clientHeight));
    ro.observe(stage);
    const bodyRo = new ResizeObserver(() => fitStage(stage));
    bodyRo.observe(document.body);
    const onWinResize = () => fitStage(stage);
    window.addEventListener("resize", onWinResize);

    // ----- pointer: drag with inertia, pinch, click vs drag -----
    const pointers = new Map<number, { x: number; y: number }>();
    let rect = stage.getBoundingClientRect();
    let moved = false;
    let dragged = false;
    let start = { x: 0, y: 0 };
    let pinch = { d: 1, x: 0, y: 0 };
    let samples: { t: number; x: number; y: number }[] = [];
    const local = (e: { clientX: number; clientY: number }) => ({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    const inHud = (t: EventTarget | null) => t instanceof Element && !!t.closest("[data-hud]");
    const pinchOf = () => {
      const [a, b] = [...pointers.values()];
      return { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (inHud(e.target)) return;
      window.clearTimeout(intro);
      rect = stage.getBoundingClientRect();
      const p = local(e);
      pointers.set(e.pointerId, p);
      cam.stop();
      if (pointers.size === 1) {
        moved = false;
        dragged = false;
        start = p;
        samples = [{ t: e.timeStamp, ...p }];
      } else if (pointers.size === 2) {
        pinch = pinchOf();
        moved = dragged = true;
        for (const id of pointers.keys()) {
          try {
            stage.setPointerCapture(id);
          } catch {}
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pointers.size === 1) {
        if (!moved) {
          if (Math.hypot(p.x - start.x, p.y - start.y) < (e.pointerType === "mouse" ? 4 : 9)) return;
          moved = dragged = true;
          try {
            stage.setPointerCapture(e.pointerId);
          } catch {}
          stage.dataset.dragging = "";
        }
        cam.dragBy(p.x - prev.x, p.y - prev.y);
        samples.push({ t: e.timeStamp, ...p });
        while (samples.length > 2 && e.timeStamp - samples[0].t > 90) samples.shift();
      } else if (pointers.size === 2) {
        const next = pinchOf();
        cam.zoomAt(next.d / pinch.d, next.x, next.y, true);
        cam.dragBy(next.x - pinch.x, next.y - pinch.y);
        pinch = next;
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      if (pointers.size === 1) {
        const [p] = [...pointers.values()];
        samples = [{ t: e.timeStamp, ...p }];
        return;
      }
      if (pointers.size > 0) return;
      delete stage.dataset.dragging;
      if (!moved || e.type !== "pointerup") return;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = last.t - first.t;
      if (samples.length >= 2 && dt > 0 && e.timeStamp - last.t < 60) cam.release((last.x - first.x) / dt, (last.y - first.y) / dt);
    };

    // A drag must not end as a click on the island under the pointer.
    const onClickCapture = (e: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      e.stopPropagation();
      e.preventDefault();
    };
    // Tap on open sea closes the island card.
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest("button, a, input, [data-hud]")) return;
      setSelectedId(null);
    };

    const onWheel = (e: WheelEvent) => {
      if (inHud(e.target)) return;
      e.preventDefault();
      window.clearTimeout(intro);
      rect = stage.getBoundingClientRect();
      const { x, y } = local(e);
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      // Mouse wheels and trackpad pinches zoom; two-finger trackpad scrolls pan.
      const zoom = e.ctrlKey || e.deltaMode !== 0 || (dx === 0 && Math.abs(dy) >= 50 && Number.isInteger(dy));
      if (zoom) cam.zoomAt(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0022)), x, y, e.ctrlKey);
      else {
        cam.stop();
        cam.dragBy(-dx, -dy);
      }
    };

    const onDblClick = (e: MouseEvent) => {
      if (inHud(e.target) || (e.target as Element).closest("button")) return;
      rect = stage.getBoundingClientRect();
      const { x, y } = local(e);
      cam.zoomAt(2, x, y);
    };

    // Keyboard focus on an island that is off screen: bring it into view.
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (!t.matches?.(":focus-visible")) return;
      const el = t.closest<HTMLElement>("[data-island]");
      if (!el) return;
      const isl = layoutRef.current.byId.get(Number(el.dataset.island));
      if (!isl) return;
      const p = cam.worldToScreen(isl.px, isl.py);
      const m = 90;
      if (p.x < m || p.y < m || p.x > cam.vw - m || p.y > cam.vh - m) cam.flyTo({ x: isl.px, y: isl.py, z: cam.z }, { minDuration: 350 });
    };

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("lostpointercapture", onUp);
    stage.addEventListener("click", onClickCapture, true);
    stage.addEventListener("click", onClick);
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("dblclick", onDblClick);
    stage.addEventListener("focusin", onFocusIn);

    return () => {
      window.clearTimeout(intro);
      motionQuery.removeEventListener("change", onMotionPref);
      ro.disconnect();
      bodyRo.disconnect();
      window.removeEventListener("resize", onWinResize);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("lostpointercapture", onUp);
      stage.removeEventListener("click", onClickCapture, true);
      stage.removeEventListener("click", onClick);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("dblclick", onDblClick);
      stage.removeEventListener("focusin", onFocusIn);
      cam.detach();
      cameraRef.current = null;
    };
  }, [homeView]);

  // The "how to" hint fades away on its own.
  useEffect(() => {
    const t = window.setTimeout(() => setHint(false), 10000);
    return () => window.clearTimeout(t);
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    const cam = cameraRef.current;
    if (!cam) return;
    if (e.key === "Escape") {
      if (selectedId !== null) {
        e.preventDefault();
        closeCard();
      }
      return;
    }
    const t = e.target as HTMLElement;
    if (t.closest("input, textarea, select") || e.altKey || e.metaKey || e.ctrlKey) return;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => cam.nudge(1, 0),
      ArrowRight: () => cam.nudge(-1, 0),
      ArrowUp: () => cam.nudge(0, 1),
      ArrowDown: () => cam.nudge(0, -1),
      "+": () => cam.zoomAt(1.5),
      "=": () => cam.zoomAt(1.5),
      "-": () => cam.zoomAt(1 / 1.5),
      _: () => cam.zoomAt(1 / 1.5),
      "0": goHome,
    };
    const fn = keys[e.key];
    if (!fn) return;
    e.preventDefault();
    fn();
  };

  const current = layout.byId.get(currentIslandId) ?? null;
  const selected = selectedId !== null ? (layout.byId.get(selectedId) ?? null) : null;
  const route: Curve | null =
    selected && current && selected.id !== current.id
      ? routeCurve({ x: current.px, y: current.py, id: current.id }, { x: selected.px, y: selected.py, id: selected.id }, current.size * 0.42, selected.size * 0.46)
      : null;
  const routeMid = route ? pointOnCurve(route, 0.5) : null;

  // Fleets sailing to the selected island; ships coming home count apart from new missions.
  const incomingCounts = new Map<FleetKind | "return", number>();
  for (const f of selected ? fleets : []) {
    const back = f.status === "returning";
    const to = back ? f.homeIslandId : f.targetIslandId;
    const key = back ? "return" : f.kind;
    if (to === selected?.id) incomingCounts.set(key, (incomingCounts.get(key) ?? 0) + 1);
  }
  const incoming = [...incomingCounts].map(([kind, count]) => ({ kind, count }));

  const mineCount = islands.filter((i) => i.mine).length;
  const fleetsAtSea = useMemo(() => routes.map((r) => r.fleet), [routes]);

  if (islands.length === 0) {
    return (
      <section className={clsx(s.stage, "-mx-4 grid h-[calc(100dvh-16rem)] min-h-[360px] sm:min-h-[500px] place-items-center sm:mx-0 sm:rounded-2xl")} style={{ backgroundImage: `url(${fx.sea})`, backgroundSize: 800 }}>
        <div className="panel max-w-sm p-6 text-center">
          <h1 className="font-display text-xl font-bold">El mar está vacío</h1>
          <p className="mt-1 text-ink-soft">Todavía no hay islas en el mundo. Volvé en un rato.</p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={stageRef}
      tabIndex={0}
      aria-label="Mapa del Egeo"
      aria-roledescription="mapa"
      aria-describedby={helpId}
      onKeyDown={onKeyDown}
      className={clsx(s.stage, "-mx-4 h-[calc(100dvh-16rem)] min-h-[360px] sm:min-h-[500px] shrink-0 sm:mx-0 sm:rounded-2xl")}
      style={{ backgroundImage: `url(${fx.sea})`, backgroundSize: 800 }}
    >
      <p id={helpId} className="sr-only">
        Arrastrá o usá las flechas para moverte. Más y menos acercan o alejan. Cero vuelve a tu isla. Escape cierra la isla elegida.
      </p>

      {/* HUD: title and island search come first in tab order */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start gap-2 p-3 sm:gap-3 sm:p-4">
        {/* Phones: the nav already says where you are, so the search gets the whole row. */}
        <div data-hud className="pointer-events-auto shrink-0 rounded-xl border border-foam/15 bg-sea-950/70 px-4 py-1.5 text-foam shadow-[0_8px_24px_-8px_rgb(4_18_38/0.8)] backdrop-blur-md max-sm:sr-only">
          <h1 className="font-display text-2xl leading-tight font-bold">El Egeo</h1>
          <p className="tabular text-sm text-foam/80">
            {islands.length} islas · {mineCount === 1 ? "1 tuya" : `${mineCount} tuyas`}
          </p>
        </div>
        <div className="pointer-events-auto ml-auto min-w-0 flex-1 sm:flex-none">
          <IslandSearch islands={layout.islands} travel={travel} currentIslandId={currentIslandId} onPick={select} />
        </div>
      </div>

      {/* Sea surface */}
      <div
        ref={seaRef}
        className={clsx(s.layer, s.sea)}
        style={{ width: layout.width, height: layout.height, backgroundImage: `url(${fx.sea})`, backgroundSize: `${fx.seaSize}px ${fx.seaSize}px` }}
      >
        <div className={s.depth} />
      </div>

      {/* Light on the sea floor (screen space, slight parallax) */}
      <div ref={causticsRef} className={s.caustics} style={{ opacity: 0 }} aria-hidden>
        <CausticsLayers src={fx.caustics} />
      </div>

      {/* Islands, routes, fleets and cloud shadows */}
      <div ref={worldRef} className={clsx(s.layer, s.world)} style={{ width: layout.width, height: layout.height }} data-lod="near">
        <svg className={s.routes} width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden>
          <FleetTracks routes={routes} />
          {route && (
            <g key={selected?.id}>
              <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={layout.width} height={layout.height}>
                <path d={curvePath(route)} pathLength={1} className={s.routeDraw} />
              </mask>
              <g mask={`url(#${maskId})`}>
                <path d={curvePath(route)} className={s.routeUnder} />
                <path d={curvePath(route)} className={s.routeGlow} />
                <path d={curvePath(route)} className={s.routeDash} />
              </g>
              <circle cx={route.s.x} cy={route.s.y} r={7} className={s.routeEnd} />
              <circle cx={route.e.x} cy={route.e.y} r={11} className={s.routeEnd} />
            </g>
          )}
        </svg>

        {layout.islands.map((i) => (
          <IslandMarker
            key={i.id}
            island={i}
            isCurrent={i.id === currentIslandId}
            isSelected={i.id === selectedId}
            seconds={travel[i.id] ?? 0}
            sparkle={fx.sparkle}
            onSelect={select}
          />
        ))}

        {route && routeMid && selected && (
          <div key={`chip-${selected.id}`} className={s.routeChip} style={{ left: routeMid.x, top: routeMid.y }} aria-hidden>
            <span className={s.routeChipInner}>{fmtDuration((travel[selected.id] ?? 0) * 1000)}</span>
          </div>
        )}

        <Fleets routes={routes} fx={fx} serverNow={serverNow} reducedMotion={reducedMotion} onSelectIsland={select} />

        <CloudShadows clouds={clouds} />
      </div>

      {/* Sky: clouds float closer to the camera */}
      <div ref={skyRef} className={clsx(s.layer, s.sky)} style={{ width: layout.width, height: layout.height }} aria-hidden>
        <Clouds clouds={clouds} />
      </div>

      <Gulls src={fx.gull} />
      <div className={s.vignette} aria-hidden />

      <div className={clsx("pointer-events-none absolute bottom-3 left-3 z-20 flex items-end gap-3 sm:bottom-4 sm:left-4", selected && !desktop && "invisible")}>
        <Compass src={fx.compass} className="relative hidden size-20 shrink-0 sm:block lg:size-24" />
        <div className="pointer-events-auto">
          <MapDock fleets={fleetsAtSea} originName={originName} serverNow={serverNow} shipIcon={SHIP_IMAGE} onPick={(id) => select(id)} />
        </div>
      </div>

      <div className={clsx("absolute right-3 bottom-3 z-20 sm:right-4 sm:bottom-4", selected && !desktop && "invisible")}>
        <MapControls
          onZoomIn={() => cameraRef.current?.zoomAt(1.5)}
          onZoomOut={() => cameraRef.current?.zoomAt(1 / 1.5)}
          onHome={goHome}
        />
      </div>

      {hint && !selected && (
        <p
          aria-hidden
          className={clsx(
            s.hint,
            "pointer-events-none absolute top-[4.75rem] left-1/2 z-10 w-max max-w-[calc(100%-2rem)] rounded-2xl border border-foam/15 bg-sea-950/75 px-4 py-2 text-center text-sm font-bold text-balance text-foam shadow-lg backdrop-blur-md lg:top-auto lg:bottom-6",
          )}
        >
          Tocá una isla para ver el viaje
        </p>
      )}

      <IslandCard
        island={selected as MapIsland | null}
        isCurrent={selected?.id === currentIslandId}
        seconds={selected ? (travel[selected.id] ?? 0) : 0}
        originName={originName}
        myCities={selected ? myCities.filter((c) => c.islandId === selected.id) : []}
        incoming={incoming}
        desktop={desktop}
        reducedMotion={reducedMotion}
        onClose={closeCard}
      />

      <p className="sr-only" aria-live="polite">
        {selected ? `${selected.name}. ${selected.id === currentIslandId ? "Estás acá." : `Viaje de ${fmtDuration((travel[selected.id] ?? 0) * 1000)}.`}` : ""}
      </p>
    </section>
  );
}
