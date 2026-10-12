"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/client";

// Same key as WALLET_KIND_KEY (src/lib/solana/local-wallet.ts); not imported to keep the Solana
// client out of this page's bundle.
const WALLET_KIND_KEY = "thalassa:wallet:kind";

const noopSubscribe = () => () => {};
const readKind = () => {
  try {
    return window.localStorage.getItem(WALLET_KIND_KEY) ?? "local";
  } catch {
    return "local";
  }
};

/** How this browser gets into the account: the game key kept here, or the player's own wallet. */
export function AccountDevice() {
  const { t } = useI18n();
  const kind = useSyncExternalStore(noopSubscribe, readKind, () => null);
  if (kind === null) return <p className="min-h-10 text-sm text-ink-soft" />;
  if (kind === "local") {
    return (
      <p className="text-sm leading-snug text-ink-soft">
        {t({
          en: "Your account lives in this browser: no email, no password. If you clear this browser's data, you won't be able to get back in.",
          es: "Tu cuenta vive en este navegador: sin mail ni contraseña. Si borrás los datos del navegador, no vas a poder volver a entrar.",
        })}
      </p>
    );
  }
  return (
    <p className="text-sm leading-snug text-ink-soft">
      {t({
        en: `You sign in with ${kind}. Open the game with it on any device and you'll find your polis.`,
        es: `Entrás con ${kind}. Abrí el juego con esa billetera en cualquier dispositivo y vas a encontrar tu polis.`,
      })}
    </p>
  );
}
