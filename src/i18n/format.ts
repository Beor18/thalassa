import type { Locale } from "./config";

const INTL: Record<Locale, string> = { en: "en-US", es: "es-AR" };

export type Format = ReturnType<typeof build>;

function build(lang: Locale) {
  const tag = INTL[lang];
  const nf = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat(tag, { maximumFractionDigits: 1 });
  const dates = new Map<string, Intl.DateTimeFormat>();
  return {
    /** Whole number with the language's grouping: 1,000 (en) or 1.000 (es). */
    fmt: (n: number) => nf.format(Math.floor(n)),
    /** Up to one decimal: 29.3 (en) or 29,3 (es). */
    fmt1: (n: number) => nf1.format(n),
    /** Rounded with an explicit sign: +12, −8. */
    fmtSigned: (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + nf.format(Math.abs(Math.round(n))),
    /** Any number with a fixed decimal budget, e.g. SOL amounts. */
    fmtDecimal: (n: number, maxDecimals: number) => new Intl.NumberFormat(tag, { maximumFractionDigits: maxDecimals }).format(n),
    /** "1 h 05 min", "4 min 12 s", "38 s" in both languages (the units read the same). */
    fmtDuration: (ms: number) => {
      const s = Math.max(0, Math.ceil(ms / 1000));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
      if (m > 0) return `${m} min ${String(sec).padStart(2, "0")} s`;
      return `${sec} s`;
    },
    /** Dates in the language's style; options as in Intl.DateTimeFormat. */
    fmtDate: (date: Date | number, options: Intl.DateTimeFormatOptions) => {
      const key = JSON.stringify(options);
      let df = dates.get(key);
      if (!df) dates.set(key, (df = new Intl.DateTimeFormat(tag, options)));
      return df.format(date);
    },
  };
}

const cache = new Map<Locale, Format>();

/** Formatters for one language (pure and cached, safe on server and client). */
export function getFormat(lang: Locale): Format {
  let f = cache.get(lang);
  if (!f) cache.set(lang, (f = build(lang)));
  return f;
}
