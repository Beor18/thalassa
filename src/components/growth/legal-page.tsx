import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { getI18n } from "@/i18n/server";
import { LegalLinks } from "./legal-links";

/** Shared frame for Terms and Privacy: one parchment column, readable line length. `updated` is a UTC date ("2026-10-10"). */
export async function LegalPage({ title, updated, intro, children }: { title: string; updated: Date; intro: string; children: ReactNode }) {
  const { t, fmtDate } = await getI18n();
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pt-3 sm:px-6 sm:pt-5">
        <Link
          href="/"
          className="-mx-2 inline-flex min-h-11 items-center rounded-lg px-2 font-display text-lg font-black tracking-[0.22em] text-gold [text-shadow:0_1px_0_var(--color-bronze-deep),0_2px_10px_rgb(6_26_48/0.9)]"
        >
          THALASSA
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/" className="inline-flex min-h-10 items-center rounded-lg px-1 text-sm font-bold text-foam/85 underline-offset-4 hover:text-gold hover:underline">
            {t({ en: "Back to Thalassa", es: "Volver al inicio" })}
          </Link>
          <LanguageSwitch tone="dark" />
        </div>
      </header>
      <article className="panel mx-auto mt-4 mb-6 w-[calc(100%-2rem)] max-w-3xl p-5 sm:mt-6 sm:p-8 [&_a]:font-bold [&_a]:text-bronze-dark [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="!mt-1 text-sm text-ink-soft">
          {t({ en: "Last updated:", es: "Última actualización:" })} {fmtDate(updated, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
        </p>
        <p className="text-[17px] leading-snug">{intro}</p>
        <div className="text-[16px] leading-relaxed">{children}</div>
      </article>
      <footer className="mx-auto mt-auto w-full max-w-3xl px-4 pb-6 sm:px-6">
        <LegalLinks />
      </footer>
    </main>
  );
}

/** Contact line, shown only when NEXT_PUBLIC_CONTACT_EMAIL is set. */
export function ContactLine({ children }: { children: ReactNode }) {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  if (!email) return null;
  return (
    <p>
      {children} <a href={`mailto:${email}`}>{email}</a>.
    </p>
  );
}
