import Link from "next/link";
import type { ReactNode } from "react";
import { LegalLinks } from "./legal-links";

/** Shared frame for Términos and Privacidad: one parchment column, readable line length. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6">
        <Link href="/" className="font-display text-lg font-black tracking-[0.22em] text-gold drop-shadow">
          THALASSA
        </Link>
        <Link href="/" className="text-sm font-bold text-foam/85 underline-offset-4 hover:text-gold hover:underline">
          Volver al inicio
        </Link>
      </header>
      <article className="panel mx-auto mt-6 mb-8 w-[calc(100%-2rem)] max-w-3xl p-5 sm:p-8 [&_a]:font-bold [&_a]:text-bronze-dark [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-7 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="!mt-1 text-sm text-ink-soft">Última actualización: {updated}</p>
        <p className="text-[17px] leading-relaxed">{intro}</p>
        <div className="text-[16px] leading-relaxed">{children}</div>
      </article>
      <footer className="mx-auto mt-auto w-full max-w-3xl px-4 pb-8 sm:px-6">
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
