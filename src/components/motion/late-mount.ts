/**
 * Tells first-paint content apart from content that appears later on the same screen, so a
 * celebration (a research stamp, a new hint) plays when something changes and not every time a
 * section opens. The game chrome marks the moment it mounts; anything that mounts well after
 * that moment is "late".
 */
let shellMountedAt = 0;

/** Called once by the game chrome when a section mounts. */
export function markShellMount() {
  shellMountedAt = typeof performance === "undefined" ? 0 : performance.now();
}

/** True when called (in a client effect or state initializer) long after the section opened. */
export function mountedLate(ms = 900) {
  if (typeof window === "undefined" || shellMountedAt === 0) return false;
  return performance.now() - shellMountedAt > ms;
}
