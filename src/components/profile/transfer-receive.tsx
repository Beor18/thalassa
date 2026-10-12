"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import type { Text } from "@/i18n/config";
import { FriendlyError, friendlySolanaText } from "@/lib/solana/client";
import {
  importLocalWallet,
  loadLocalWallet,
  localWalletAddressSync,
  setWalletKind,
  signMessageWithLocal,
  transferCodeAddress,
} from "@/lib/solana/local-wallet";
import { requestLoginMessage, verifyLogin } from "@/lib/solana/login";

/*
  The code arrives in the fragment (/llevar#<code>). It's read once, kept in memory and wiped from
  the address bar right away, so it stays out of the history and of anything the page shares.
*/
let taken: string | null | undefined;
function takeCode(): string | null {
  if (taken !== undefined) return taken;
  const raw = window.location.hash.slice(1);
  taken = raw ? decodeURIComponent(raw) : null;
  if (raw) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  return taken;
}
const noopSubscribe = () => () => {};

type Check = { ok: true; address: string } | { ok: false; error: Text };

function check(code: string | null): Check {
  if (!code) {
    return {
      ok: false,
      error: {
        en: "This link doesn't carry an account. Open the full link from your other device's profile.",
        es: "Este link no trae ninguna cuenta. Abrí el link completo desde el perfil de tu otro dispositivo.",
      },
    };
  }
  try {
    return { ok: true, address: transferCodeAddress(code) };
  } catch (err) {
    return { ok: false, error: friendlySolanaText(err) };
  }
}

/** Confirms and opens the account from a transfer link on this device. */
export function TransferReceive() {
  const { t } = useI18n();
  const router = useRouter();
  const code = useSyncExternalStore(noopSubscribe, takeCode, () => undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navigating, startNavigation] = useTransition();

  if (code === undefined) return <div className="panel h-56 animate-pulse" />;

  const result = check(code);
  if (!result.ok) {
    return (
      <section className="panel flex flex-col gap-3 p-4 sm:p-5">
        <h1 className="font-display text-xl font-bold">{t({ en: "We can't open this link", es: "No podemos abrir este link" })}</h1>
        <p className="text-ink-soft">{t(result.error)}</p>
        <Link href="/" className="self-start font-bold text-bronze-dark underline underline-offset-4">
          {t({ en: "Go to the home page", es: "Ir al inicio" })}
        </Link>
      </section>
    );
  }

  const current = localWalletAddressSync();
  const same = current === result.address;
  const replaces = !!current && !same;

  async function open() {
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      const signer = same ? await loadLocalWallet() : await importLocalWallet(code);
      if (!signer) throw new Error("no key");
      const message = await requestLoginMessage(signer.address);
      const signature = await signMessageWithLocal(signer, message);
      const { redirect } = await verifyLogin(signer.address, message, signature);
      setWalletKind("local");
      startNavigation(() => router.push(redirect));
    } catch (err) {
      console.error("[thalassa] transfer failed", err);
      setBusy(false);
      setError(
        t(
          err instanceof FriendlyError
            ? friendlySolanaText(err)
            : { en: "We couldn't open your account. Try again.", es: "No pudimos abrir tu cuenta. Probá de nuevo." },
        ),
      );
    }
  }

  return (
    <section className="panel flex flex-col gap-3 p-4 sm:p-5">
      <h1 className="font-display text-xl leading-tight font-bold">
        {t({ en: "Open your polis on this device", es: "Abrí tu polis en este dispositivo" })}
      </h1>
      <p className="text-ink-soft">
        {same
          ? t({ en: "This browser already has this account.", es: "Este navegador ya tiene esta cuenta." })
          : t({
              en: "This link carries your account. From now on you can play here too, with the same polis.",
              es: "Este link trae tu cuenta. Desde ahora también podés jugar acá, con la misma polis.",
            })}
      </p>
      {replaces && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-bold text-danger">
          {t({
            en: "This browser already has another account. If you go on, it gets replaced: you'll only get back to it with its own link.",
            es: "Este navegador ya tiene otra cuenta. Si seguís, la reemplazás: solo vas a poder volver a ella con su propio link.",
          })}
        </p>
      )}
      <Button size="lg" variant={replaces ? "danger" : "primary"} onClick={open} loading={busy || navigating}>
        {replaces
          ? t({ en: "Use the account from the link", es: "Usar la cuenta del link" })
          : t({ en: "Open my polis", es: "Abrir mi polis" })}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
