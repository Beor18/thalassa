import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { buttonClass } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t({ en: "Page not found", es: "Página no encontrada" }), robots: { index: false } };
}

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="panel rise-in w-full overflow-hidden px-6 py-8">
        {/* A trireme circling over uncharted water */}
        <div
          aria-hidden
          className="relative mx-auto mb-4 grid size-28 place-items-center rounded-full border-2 border-dashed border-parchment-3 bg-[radial-gradient(circle,rgb(31_111_178/0.18),transparent_70%)]"
        >
          <div className="absolute inset-0 motion-safe:animate-[spin_14s_linear_infinite]">
            <Image
              src="/assets/fx/trireme-top.webp"
              alt=""
              width={48}
              height={48}
              loading="eager"
              className="absolute -top-5 left-1/2 size-10 -translate-x-1/2 rotate-90"
            />
          </div>
          <span className="font-display text-2xl font-black text-bronze-dark">404</span>
        </div>
        <h1 className="font-display text-2xl font-bold">
          {t({ en: "This island isn't on the charts", es: "Esta isla no figura en las cartas" })}
        </h1>
        <p className="mt-2 text-ink-soft">
          {t({
            en: "The link may be mistyped, or that city no longer exists.",
            es: "La ruta está mal escrita o esa ciudad ya no existe.",
          })}
        </p>
        <Link href="/ciudad" className={buttonClass("primary", "md", "mt-6")}>
          {t({ en: "Back to my polis", es: "Volver a mi polis" })}
        </Link>
      </div>
    </div>
  );
}
