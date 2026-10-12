import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { TransferReceive } from "@/components/profile/transfer-receive";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t({ en: "Open your account", es: "Abrí tu cuenta" }), robots: { index: false } };
}

/**
 * Where the transfer link lands on the new device (/llevar#<code>, made in the profile).
 * The page is static; the code only ever lives in the browser. No language switch here: it reloads
 * the page, and the code is wiped from the address as soon as it's read.
 */
export default function TransferPage() {
  return (
    <main className="relative isolate flex flex-1 flex-col">
      <Image src="/assets/scene-city.webp" alt="" fill preload sizes="100vw" className="-z-20 object-cover object-center opacity-60" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-sea-950/85 via-sea-950/70 to-sea-950" />
      <header className="mx-auto flex w-full max-w-5xl items-center px-4 pt-3 sm:px-6 sm:pt-5">
        <Link
          href="/"
          className="-mx-2 inline-flex min-h-11 items-center rounded-lg px-2 font-display text-lg font-black tracking-[0.22em] text-gold [text-shadow:0_1px_0_var(--color-bronze-deep),0_2px_10px_rgb(6_26_48/0.9)]"
        >
          THALASSA
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
        <TransferReceive />
      </div>
    </main>
  );
}
