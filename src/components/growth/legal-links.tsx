import Link from "next/link";
import clsx from "clsx";
import { getI18n } from "@/i18n/server";

const LINK = "inline-flex min-h-10 items-center underline-offset-4 hover:text-gold hover:underline";

/** Footer: who makes it and the legal pages. Light text, for dark (sea) backgrounds. */
export async function LegalLinks({ className }: { className?: string }) {
  const { t } = await getI18n();
  return (
    <nav
      aria-label={t({ en: "Legal", es: "Legales" })}
      className={clsx("flex flex-wrap items-center gap-x-4 text-sm font-bold text-foam/80 [text-shadow:0_1px_6px_rgb(6_26_48/0.9)]", className)}
    >
      <span className="w-full py-1 sm:w-auto">
        {t({ en: "Made in Argentina by an old-school player.", es: "Hecho en Argentina por un jugador de los de antes." })}
      </span>
      <Link href="/terminos" className={LINK}>
        {t({ en: "Terms", es: "Términos" })}
      </Link>
      <Link href="/privacidad" className={LINK}>
        {t({ en: "Privacy", es: "Privacidad" })}
      </Link>
    </nav>
  );
}
