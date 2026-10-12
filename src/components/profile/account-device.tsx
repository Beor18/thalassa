"use client";

import { useState, useSyncExternalStore, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

// Same key as WALLET_KIND_KEY (src/lib/solana/local-wallet.ts); not imported to keep the Solana
// client out of this page's bundle until the player asks for the transfer link.
const WALLET_KIND_KEY = "thalassa:wallet:kind";

const noopSubscribe = () => () => {};
const readKind = () => {
  try {
    return window.localStorage.getItem(WALLET_KIND_KEY) ?? "local";
  } catch {
    return "local";
  }
};

type Qr = ComponentType<{ value: string; label: string; className?: string }>;

/** How this browser gets into the account, and (for the game key) the link that takes it to another device. */
export function AccountDevice() {
  const { t, lang } = useI18n();
  const kind = useSyncExternalStore(noopSubscribe, readKind, () => null);
  const [transfer, setTransfer] = useState<{ link: string; Qr: Qr } | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  if (kind === null) return <p className="min-h-10 text-sm text-ink-soft" />;
  if (kind !== "local") {
    return (
      <p className="text-sm leading-snug text-ink-soft">
        {t({
          en: `You sign in with ${kind}. Open the game with it on any device and you'll find your polis.`,
          es: `Entrás con ${kind}. Abrí el juego con esa billetera en cualquier dispositivo y vas a encontrar tu polis.`,
        })}
      </p>
    );
  }

  async function reveal() {
    setNote(null);
    try {
      const [{ exportLocalWalletCode }, { QrCode }] = await Promise.all([import("@/lib/solana/local-wallet"), import("./qr-code")]);
      const code = exportLocalWalletCode();
      if (!code) throw new Error("no key");
      // The language goes in the path (the proxy saves it on the new device); the key in the fragment.
      setTransfer({ link: `${location.origin}/${lang}/llevar#${code}`, Qr: QrCode });
    } catch {
      setNote({
        ok: false,
        text: t({ en: "We couldn't read your key in this browser.", es: "No pudimos leer tu llave en este navegador." }),
      });
    }
  }

  async function copy() {
    if (!transfer) return;
    try {
      await navigator.clipboard.writeText(transfer.link);
      setNote({ ok: true, text: t({ en: "Link copied.", es: "Link copiado." }) });
    } catch {
      setNote({
        ok: false,
        text: t({ en: "Couldn't copy it. Scan the code instead.", es: "No pudimos copiarlo. Escaneá el código." }),
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm leading-snug text-ink-soft">
        {t({
          en: "Your account lives in this browser: no email, no password. To play on another device, or to keep a backup in case you clear this browser, take your link.",
          es: "Tu cuenta vive en este navegador: sin mail ni contraseña. Para jugar en otro dispositivo, o tener un respaldo por si borrás este navegador, llevate tu link.",
        })}
      </p>
      {transfer ? (
        <div className="flex flex-col gap-3 rounded-xl border border-parchment-3 bg-marble/70 p-3 sm:flex-row">
          <transfer.Qr
            value={transfer.link}
            label={t({ en: "Code to open your account on another device", es: "Código para abrir tu cuenta en otro dispositivo" })}
            className="size-44 shrink-0 self-center rounded-lg border border-parchment-3"
          />
          <div className="flex min-w-0 flex-col gap-2 text-sm leading-snug text-ink">
            <p>
              {t({
                en: "Scan it with the other device's camera, or copy the link and open it there.",
                es: "Escanealo con la cámara del otro dispositivo, o copiá el link y abrilo allá.",
              })}
            </p>
            <p className="font-bold text-danger">
              {t({
                en: "Whoever has this link gets into your account. Don't share it.",
                es: "Quien tenga este link entra a tu cuenta. No lo compartas.",
              })}
            </p>
            <p className="text-ink-soft">
              {t({
                en: "Keep it somewhere safe as a backup: with it you get your polis back even if you clear this browser.",
                es: "Guardalo en un lugar seguro como respaldo: con él recuperás tu polis aunque borres este navegador.",
              })}
            </p>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button size="md" onClick={copy}>
                {t({ en: "Copy link", es: "Copiar link" })}
              </Button>
              <Button
                size="md"
                variant="ghost"
                onClick={() => {
                  setTransfer(null);
                  setNote(null);
                }}
              >
                {t({ en: "Hide", es: "Ocultar" })}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button size="md" variant="secondary" onClick={reveal} className="self-start">
          {t({ en: "Move to another device", es: "Pasar a otro dispositivo" })}
        </Button>
      )}
      {note && (
        <p role="status" className={note.ok ? "text-sm font-bold text-success" : "text-sm font-bold text-danger"}>
          {note.text}
        </p>
      )}
    </div>
  );
}
