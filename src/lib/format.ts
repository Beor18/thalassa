const nf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

export const fmt = (n: number) => nf.format(Math.floor(n));
export const fmt1 = (n: number) => nf1.format(n);
export const fmtSigned = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + nf.format(Math.abs(Math.round(n)));

/** "1 h 05 min", "4 min 12 s", "38 s" */
export function fmtDuration(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m > 0) return `${m} min ${String(sec).padStart(2, "0")} s`;
  return `${sec} s`;
}

export const shortAddress = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
