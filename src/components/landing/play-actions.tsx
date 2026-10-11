"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { UiWallet } from "@wallet-standard/react";
import { Button } from "@/components/ui/button";
import "./landing.css";
import { FriendlyError, isUserRejection } from "@/lib/solana/client";
import { hasLocalWallet, loadOrCreateLocalWallet, setWalletKind, signMessageWithLocal } from "@/lib/solana/local-wallet";
import { requestLoginMessage, verifyLogin } from "@/lib/solana/login";
import { INSTALL_WALLET_URL, connectAndSignMessage, useSolanaWallets } from "@/lib/solana/wallet-standard";

type Phase = "idle" | "key" | "founding" | "returning";

const PHASE_LABEL: Record<Exclude<Phase, "idle">, string> = {
  key: "Preparando tu llave…",
  founding: "Fundando tu polis…",
  returning: "Volviendo a tu polis…",
};

const noopSubscribe = () => () => {};

function errorText(err: unknown, fallback: string) {
  return err instanceof FriendlyError ? err.message : fallback;
}

/**
 * "Jugar ahora" with the in-browser game key, plus the wallet chooser.
 * `where` tags the funnel events (hero or closing call to action).
 */
export function PlayActions({ where = "hero" }: { where?: "hero" | "final" }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [navigating, startNavigation] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasKey = useSyncExternalStore(noopSubscribe, hasLocalWallet, () => false);
  const busy = phase !== "idle" || navigating;

  async function play() {
    setError(null);
    setPhase("key");
    try {
      const { signer, created } = await loadOrCreateLocalWallet();
      setPhase(created ? "founding" : "returning");
      const message = await requestLoginMessage(signer.address);
      const signature = await signMessageWithLocal(signer, message);
      const { redirect } = await verifyLogin(signer.address, message, signature);
      setWalletKind("local");
      startNavigation(() => router.push(redirect));
    } catch (err) {
      console.error("[thalassa] play failed", err);
      setPhase("idle");
      setError(errorText(err, "No pudimos abrir tu polis. Probá de nuevo."));
    }
  }

  return (
    <div className="flex flex-col items-start gap-2.5">
      <span className="ld-cta-glow relative inline-flex rounded-xl">
        <Button
          size="lg"
          onClick={play}
          loading={busy}
          data-track="play_click"
          data-track-prop-where={where}
          className="h-14 min-w-60 px-8 text-lg"
        >
          {phase !== "idle" ? PHASE_LABEL[phase] : navigating ? "Zarpando…" : "Jugar ahora"}
        </Button>
      </span>
      {/* Hidden (not removed) while busy: the key appears mid-flow and the hint would flip under the spinner. */}
      <p aria-hidden={busy} className={clsx("max-w-sm text-[15px] text-foam/90 [text-shadow:0_1px_6px_rgb(6_26_48/0.9)]", busy && "invisible")}>
        {hasKey ? "Seguís con tu polis de este navegador." : "Gratis. Sin mail ni contraseña."}
      </p>
      {error && (
        <p role="alert" className="max-w-md rounded-lg bg-danger px-3 py-2 text-sm font-bold text-marble">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        disabled={busy}
        data-track="wallet_choose"
        data-track-prop-where={where}
        className="-mx-1 -mt-1 min-h-10 rounded px-1 text-[15px] font-bold text-foam/90 underline decoration-gold/70 underline-offset-4 transition-colors hover:text-gold disabled:opacity-50"
      >
        Entrar con mi billetera
      </button>
      <WalletDialog
        dialogRef={dialogRef}
        onEnter={(redirect) => startNavigation(() => router.push(redirect))}
        onPlay={() => {
          dialogRef.current?.close();
          void play();
        }}
      />
    </div>
  );
}

type Step = "connecting" | "signing" | "entering";
const STEP_LABEL: Record<Step, string> = {
  connecting: "Conectando…",
  signing: "Firmá en tu billetera…",
  entering: "Entrando…",
};

function WalletDialog({
  dialogRef,
  onEnter,
  onPlay,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  onEnter: (redirect: string) => void;
  /** No wallet here: close and play with the in-browser key instead. */
  onPlay: () => void;
}) {
  const wallets = useSolanaWallets();
  const [busy, setBusy] = useState<{ name: string; step: Step } | null>(null);
  const [note, setNote] = useState<{ text: string; kind: "info" | "error" } | null>(null);

  async function signIn(wallet: UiWallet) {
    setNote(null);
    setBusy({ name: wallet.name, step: "connecting" });
    try {
      const signed = await connectAndSignMessage(wallet, async (addr) => {
        setBusy({ name: wallet.name, step: "signing" });
        return requestLoginMessage(addr);
      });
      setBusy({ name: wallet.name, step: "entering" });
      const { redirect } = await verifyLogin(signed.address, signed.message, signed.signature);
      setWalletKind(wallet.name);
      onEnter(redirect);
    } catch (err) {
      setBusy(null);
      if (isUserRejection(err)) {
        setNote({ text: "Cancelaste en la billetera. Podés intentar de nuevo cuando quieras.", kind: "info" });
      } else {
        console.error("[thalassa] wallet sign-in failed", err);
        setNote({ text: errorText(err, `No pudimos entrar con ${wallet.name}. Probá de nuevo.`), kind: "error" });
      }
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="wallet-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) e.currentTarget.close();
      }}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      className="m-auto w-[min(100%-2rem,28rem)] bg-transparent p-0 text-ink backdrop:bg-sea-950/75 backdrop:backdrop-blur-sm open:animate-rise"
    >
      <div className="panel p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="wallet-dialog-title" className="font-display text-xl font-bold">
            Entrar con tu billetera
          </h2>
          <form method="dialog">
            <button
              type="submit"
              aria-label="Cerrar"
              disabled={!!busy}
              className="-mt-2 -mr-2 grid size-10 place-items-center rounded-lg text-2xl leading-none text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-40"
            >
              <span aria-hidden>×</span>
            </button>
          </form>
        </div>
        {wallets.length > 0 && (
          <p className="mt-1 text-[15px] text-ink-soft">Firmás un mensaje que prueba que la cuenta es tuya. No cuesta nada ni mueve fondos.</p>
        )}

        {wallets.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-2">
            {wallets.map((wallet) => {
              const mine = busy?.name === wallet.name;
              return (
                <li key={wallet.name}>
                  <button
                    type="button"
                    onClick={() => signIn(wallet)}
                    disabled={!!busy}
                    aria-busy={mine}
                    className={clsx(
                      "flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-[background-color,border-color,transform,opacity] duration-150 active:translate-y-px",
                      mine
                        ? "border-bronze bg-parchment-2"
                        : "border-parchment-3 bg-marble/60 hover:border-bronze hover:bg-marble disabled:opacity-50",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- wallet icons are data URIs */}
                    <img src={wallet.icon} alt="" width={32} height={32} className="size-8 shrink-0 rounded-lg" />
                    <span className="flex-1 font-bold">{wallet.name}</span>
                    <span className="text-sm font-bold text-bronze-dark">{mine ? STEP_LABEL[busy.step] : "Elegir"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-2 flex flex-col items-start gap-3">
            <p className="text-[15px] text-ink-soft">No encontramos una billetera en este navegador. No hace falta: podés jugar sin ella.</p>
            <Button size="lg" onClick={onPlay} data-track="play_click" data-track-prop-where="wallet_dialog" className="w-full">
              Jugar sin billetera
            </Button>
            <a
              href={INSTALL_WALLET_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center text-[15px] font-bold text-bronze-dark underline underline-offset-4 hover:text-ink"
            >
              Instalar Phantom
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </div>
        )}

        {note && (
          <p
            role={note.kind === "error" ? "alert" : "status"}
            className={clsx(
              "mt-3 rounded-lg px-3 py-2 text-sm font-bold",
              note.kind === "error" ? "bg-danger text-marble" : "bg-parchment-2 text-ink",
            )}
          >
            {note.text}
          </p>
        )}
      </div>
    </dialog>
  );
}
