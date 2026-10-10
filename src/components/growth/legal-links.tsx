import Link from "next/link";
import clsx from "clsx";

/** Footer links to the legal pages. Light text, for dark (sea) backgrounds. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Legales" className={clsx("flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-foam/80", className)}>
      <span className="[text-shadow:0_1px_6px_rgb(6_26_48/0.9)]">Thalassa · estrategia clásica por navegador</span>
      <Link href="/terminos" className="underline-offset-4 hover:text-gold hover:underline">
        Términos
      </Link>
      <Link href="/privacidad" className="underline-offset-4 hover:text-gold hover:underline">
        Privacidad
      </Link>
    </nav>
  );
}
