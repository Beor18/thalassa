"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { address, type KeyPairSigner, type TransactionSigner } from "@solana/kit";
import { useWalletAccountTransactionSigner } from "@solana/react";
import { useConnect, type UiWallet, type UiWalletAccount } from "@wallet-standard/react";
import { celebrate } from "@/components/motion/celebrate";
import { Tilt } from "@/components/motion/tilt";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { ResIcon } from "@/components/ui/res";
import { toast } from "@/components/ui/toaster";
import { fmt, shortAddress } from "@/lib/format";
import { FriendlyError, friendlySolanaError, getRpc, getSolBalance, isUserRejection, sendInstructions } from "@/lib/solana/client";
import { FAUCET_URL, SOLANA_CHAIN, explorerTx, fmtSol } from "@/lib/solana/config";
import { getWalletKind, loadLocalWallet, localWalletAddressSync, requestDevnetSol } from "@/lib/solana/local-wallet";
import { buyAmbrosiaInstruction, fetchCitizen, fetchConfig, type CitizenAccount, type ThalassaConfig } from "@/lib/solana/program";
import { canSignDevnetTransactions, connectWallet, useSolanaWallets } from "@/lib/solana/wallet-standard";
import { claimFaucetAction, syncAmbrosiaAction } from "@/server/actions";
import { AddressChip, ExternalIcon } from "./address-chip";
import { HowItWorks } from "./section-ui";

const PACK_OPTIONS = [1, 5, 10] as const;
/** Rent for the 69-byte Citizen account, paid once on the first purchase: (128 + 69) * 3480 * 2 */
const CITIZEN_RENT_LAMPORTS = BigInt(1_371_120);
const FEE_LAMPORTS = BigInt(5_000);

type ChainState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; config: ThalassaConfig | null; citizen: CitizenAccount | null; balance: bigint };

/** Live price, purchase record and SOL balance for the logged-in wallet. */
function useChainData(owner: string) {
  const [state, setState] = useState<ChainState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    const rpc = getRpc();
    Promise.all([fetchConfig(rpc), fetchCitizen(rpc, owner), getSolBalance(address(owner))]).then(
      ([config, citizen, balance]) => {
        if (!alive) return;
        setState({ status: "ready", config, citizen, balance });
        setRefreshing(false);
      },
      (err) => {
        if (!alive) return;
        console.warn("[thalassa] chain read failed", err);
        setState({ status: "error", message: friendlySolanaError(err) });
        setRefreshing(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [owner, version]);

  const reload = useCallback(() => {
    setRefreshing(true);
    setVersion((v) => v + 1);
  }, []);

  return { state, refreshing, reload };
}

type Mode =
  | { kind: "loading" }
  | { kind: "local"; signer: KeyPairSigner }
  | { kind: "extension"; walletName: string | null; lostLocalKey: boolean };

async function resolveMode(sessionWallet: string): Promise<Mode> {
  const localAddress = localWalletAddressSync();
  if (localAddress === sessionWallet) {
    const signer = await loadLocalWallet().catch(() => null);
    if (signer) return { kind: "local", signer };
  }
  const kind = getWalletKind();
  return {
    kind: "extension",
    walletName: kind && kind !== "local" ? kind : null,
    lostLocalKey: kind === "local",
  };
}

export function AmbrosiaShop({ sessionWallet, citizenPda }: { sessionWallet: string; citizenPda: string }) {
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const chain = useChainData(sessionWallet);

  useEffect(() => {
    let alive = true;
    void resolveMode(sessionWallet).then((m) => alive && setMode(m));
    return () => {
      alive = false;
    };
  }, [sessionWallet]);

  const body = (signer: TransactionSigner | null, walletLabel: string, blocker?: ReactNode) => (
    <ShopBody
      sessionWallet={sessionWallet}
      citizenPda={citizenPda}
      chain={chain}
      signer={signer}
      walletLabel={walletLabel}
      isLocal={mode.kind === "local"}
      blocker={blocker}
    />
  );

  return (
    <section aria-labelledby="shop-title" className="panel flex flex-col gap-3 p-3 sm:p-4">
      <h2 id="shop-title" className="font-display text-xl font-bold">
        Comprar néctar
      </h2>
      {mode.kind === "loading" && body(null, "Llave de juego", <p className="text-sm text-ink-soft">Buscando tu cuenta…</p>)}
      {mode.kind === "local" && body(mode.signer, "Llave de juego")}
      {mode.kind === "extension" && (
        <ExtensionGate mode={mode} sessionWallet={sessionWallet}>
          {(signer, label, blocker) => body(signer, label, blocker)}
        </ExtensionGate>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Extension wallets: find the connected account that matches the session
// ---------------------------------------------------------------------------

function ExtensionGate({
  mode,
  sessionWallet,
  children,
}: {
  mode: Extract<Mode, { kind: "extension" }>;
  sessionWallet: string;
  children: (signer: TransactionSigner | null, walletLabel: string, blocker?: ReactNode) => ReactNode;
}) {
  const wallets = useSolanaWallets();
  const candidates = useMemo(
    () => (mode.walletName ? wallets.filter((w) => w.name === mode.walletName) : wallets),
    [wallets, mode.walletName],
  );
  // Extensions register a moment after load: wait before saying a wallet is missing.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 900);
    return () => clearTimeout(t);
  }, []);
  const match = candidates
    .flatMap((w) => w.accounts.map((account) => ({ wallet: w, account })))
    .find((x) => x.account.address === sessionWallet);
  const [mismatch, setMismatch] = useState<{ wallet: string; address: string } | null>(null);

  // Reuse an existing authorization without opening a popup.
  const tried = useRef(new Set<string>());
  useEffect(() => {
    for (const w of candidates) {
      if (tried.current.has(w.name)) continue;
      tried.current.add(w.name);
      void connectWallet(w, true);
    }
  }, [candidates]);

  if (match) {
    if (!canSignDevnetTransactions(match.account)) {
      return children(
        null,
        match.wallet.name,
        <Notice tone="warn">{match.wallet.name} no acepta pagos con SOL de prueba. Probá con Phantom o Solflare.</Notice>,
      );
    }
    return <ExtensionSigner account={match.account} label={match.wallet.name} render={children} />;
  }

  const label = mode.walletName ?? "Tu cuenta";
  const blocker = (
    <div className="flex flex-col gap-2">
      {mode.lostLocalKey ? (
        <Notice tone="warn">Tu llave de juego está en otro navegador. Para comprar, abrí Thalassa donde empezaste a jugar.</Notice>
      ) : null}
      {candidates.length > 0 ? (
        <>
          <p className="text-sm text-ink-soft">Para comprar, conectá la cuenta con la que entraste ({shortAddress(sessionWallet)}).</p>
          <div className="flex flex-wrap gap-2">
            {candidates.map((w) => (
              <ConnectWalletButton
                key={w.name}
                wallet={w}
                onConnected={(accounts) => {
                  if (!accounts.some((a) => a.address === sessionWallet)) {
                    setMismatch({ wallet: w.name, address: accounts[0]?.address ?? "" });
                  } else setMismatch(null);
                }}
              />
            ))}
          </div>
        </>
      ) : !settled ? (
        <p className="text-sm text-ink-soft">Buscando tu cuenta…</p>
      ) : mode.walletName ? (
        <Notice tone="warn">
          No encontramos {mode.walletName} en este navegador. Abrí Thalassa donde la tengas instalada.
        </Notice>
      ) : !mode.lostLocalKey ? (
        <Notice tone="warn">
          No encontramos tu cuenta ({shortAddress(sessionWallet)}) en este navegador. Abrí Thalassa donde empezaste a jugar.
        </Notice>
      ) : null}
      {mismatch && (
        <Notice tone="warn">
          {mismatch.wallet} está conectada con otra cuenta{mismatch.address ? ` (${shortAddress(mismatch.address)})` : ""}. Cambiá a{" "}
          {shortAddress(sessionWallet)} en {mismatch.wallet} y volvé a conectar.
        </Notice>
      )}
    </div>
  );
  return children(null, label, blocker);
}

function ExtensionSigner({
  account,
  label,
  render,
}: {
  account: UiWalletAccount;
  label: string;
  render: (signer: TransactionSigner | null, walletLabel: string) => ReactNode;
}) {
  const signer = useWalletAccountTransactionSigner(account, SOLANA_CHAIN);
  return render(signer, label);
}

function ConnectWalletButton({ wallet, onConnected }: { wallet: UiWallet; onConnected: (accounts: readonly UiWalletAccount[]) => void }) {
  const [connecting, connect] = useConnect(wallet);
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="sea"
      disabled={connecting || pending}
      onClick={async () => {
        setPending(true);
        try {
          onConnected(await connect());
        } catch (err) {
          if (!isUserRejection(err)) toast(`No pudimos conectar ${wallet.name}.`, "error");
        } finally {
          setPending(false);
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- wallet icons are data URIs */}
      <img src={wallet.icon} alt="" width={20} height={20} className="size-5 rounded" />
      {connecting || pending ? "Conectando…" : `Conectar ${wallet.name}`}
    </Button>
  );
}


// ---------------------------------------------------------------------------
// Balance strip + packs + purchase
// ---------------------------------------------------------------------------

type Stage = "idle" | "preparing" | "signing" | "confirming" | "crediting";
const stageLabel = (stage: Exclude<Stage, "idle">, walletLabel: string) =>
  ({
    preparing: "Preparando la compra…",
    signing: `Confirmá en ${walletLabel}…`,
    confirming: "Confirmando la compra…",
    crediting: "Sumando tu néctar…",
  })[stage];

function ShopBody({
  sessionWallet,
  citizenPda,
  chain,
  signer,
  walletLabel,
  isLocal,
  blocker,
}: {
  sessionWallet: string;
  citizenPda: string;
  chain: ReturnType<typeof useChainData>;
  signer: TransactionSigner | null;
  walletLabel: string;
  isLocal: boolean;
  blocker?: ReactNode;
}) {
  const [packs, setPacks] = useState<number>(1);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ signature: string; packs: number; credited: number | null } | null>(null);
  const buyRef = useRef<HTMLButtonElement>(null);
  const { state, reload, refreshing } = chain;
  const ready = state.status === "ready" ? state : null;
  const config = ready?.config ?? null;

  const cost = config ? config.priceLamportsPerPack * BigInt(packs) : null;
  const needed = cost !== null ? cost + FEE_LAMPORTS + (ready?.citizen ? BigInt(0) : CITIZEN_RENT_LAMPORTS) : null;
  const short = ready && needed !== null && ready.balance < needed;
  const busy = stage !== "idle";

  async function buy() {
    if (!signer || !config) return;
    setError(null);
    setStage("preparing");
    try {
      const ix = await buyAmbrosiaInstruction(signer, packs);
      const signature = await sendInstructions(signer, [ix], (s) => setStage(s === "signing" && !isLocal ? "signing" : "confirming"));
      setStage("crediting");
      const credited = await creditWithRetry();
      setReceipt({ signature, packs, credited });
      celebrate(buyRef.current, { tone: "ambrosia", count: 24, spread: 140 });
      toast(credited && credited > 0 ? `Sumaste ${fmt(credited)} de néctar.` : "La compra se confirmó. Si no ves el néctar, tocá Sincronizar.");
      reload();
    } catch (err) {
      if (isUserRejection(err)) {
        toast("Cancelaste la compra. No se movió nada.");
      } else {
        console.warn("[thalassa] purchase failed", err);
        setError(friendlySolanaError(err));
      }
    } finally {
      setStage("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <BalanceStrip sessionWallet={sessionWallet} chain={chain} lowBalance={!!short} />

      <fieldset disabled={busy} className="flex flex-col">
        <legend className="sr-only">Elegí cuántos packs</legend>
        <div className="grid grid-cols-3 gap-2">
          {PACK_OPTIONS.map((n) => (
            <label key={n} className="group relative cursor-pointer">
              <input type="radio" name="packs" value={n} checked={packs === n} onChange={() => setPacks(n)} className="peer sr-only" />
              <Tilt
                className={clsx(
                  "rounded-xl border-2 transition-[border-color,background-color,box-shadow] duration-200",
                  "border-parchment-3 bg-marble/50 group-hover:border-bronze/60",
                  "peer-checked:border-ambrosia peer-checked:bg-marble peer-checked:shadow-[0_0_0_3px_rgb(155_93_229/0.2),0_10px_24px_-12px_rgb(111_54_184/0.7)]",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
                )}
              >
                <span className="flex h-full flex-col items-center gap-0.5 px-1 py-2.5 text-center">
                  <span className="text-xs font-extrabold tracking-wide whitespace-nowrap text-ink-soft uppercase">
                    {n} {n === 1 ? "pack" : "packs"}
                  </span>
                  {config ? (
                    <>
                      <span className="inline-flex items-center gap-1 font-display text-lg font-black whitespace-nowrap text-ambrosia-dark tabular sm:text-xl">
                        <ResIcon kind="ambrosia" size={20} />
                        {fmt(Number(config.ambrosiaPerPack) * n)}
                      </span>
                      <span className="text-xs whitespace-nowrap text-ink-soft tabular-nums lining-nums">
                        {fmtSol(config.priceLamportsPerPack * BigInt(n))} SOL
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="mt-1 h-5 w-14 animate-pulse rounded bg-ink/10" />
                      <span className="mt-1 h-3 w-10 animate-pulse rounded bg-ink/10" />
                    </>
                  )}
                </span>
              </Tilt>
            </label>
          ))}
        </div>
      </fieldset>

      {state.status === "error" && (
        <Notice tone="error">
          {state.message}{" "}
          <button type="button" onClick={reload} className="min-h-10 font-bold underline underline-offset-4">
            Reintentar
          </button>
        </Notice>
      )}
      {ready && !config && <Notice tone="warn">La tienda todavía no abrió. Volvé en un rato.</Notice>}

      {blocker ?? (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <Button
            ref={buyRef}
            variant="ambrosia"
            size="lg"
            onClick={buy}
            loading={busy}
            disabled={!signer || !config || !!short || refreshing}
            className="w-full sm:w-auto"
          >
            {busy ? stageLabel(stage as Exclude<Stage, "idle">, walletLabel) : `Comprar ${packs} ${packs === 1 ? "pack" : "packs"}`}
          </Button>
          {needed !== null && (
            <p className={clsx("text-sm tabular-nums lining-nums", short ? "font-bold text-danger" : "text-ink-soft")}>
              {short ? "Te falta SOL de prueba. Pedilo arriba." : `Total ≈ ${fmtSol(needed)} SOL de prueba`}
            </p>
          )}
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {receipt && (
        <div role="status" className="pop-in flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-olive/15 px-3 py-1.5 text-[15px] ring-1 ring-olive/30">
          <span className="font-bold text-success">
            Compra confirmada: {receipt.packs} {receipt.packs === 1 ? "pack" : "packs"}
            {receipt.credited ? ` · +${fmt(receipt.credited)} de néctar` : ""}
          </span>
          {!receipt.credited && (
            <ActionButton action={syncAmbrosiaAction} variant="secondary" size="sm" pendingLabel="Sincronizando…" className="h-10">
              Sincronizar
            </ActionButton>
          )}
          <a
            href={explorerTx(receipt.signature)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-sea-700 underline-offset-4 hover:underline"
          >
            Ver comprobante <ExternalIcon />
            <span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
        </div>
      )}

      <HowItWorks>
        <p>El néctar termina obras al instante y paga al mercader.</p>
        <p>
          Se compra con SOL de prueba, que no vale plata real. Si te falta, pedilo arriba: una vez cada 12 horas, alcanza para un
          pack.
        </p>
        {config && (
          <p className="tabular-nums lining-nums">
            Cada pack son {fmt(Number(config.ambrosiaPerPack))} de néctar por {fmtSol(config.priceLamportsPerPack)} SOL de prueba. Se
            suma el costo de red y, en tu primera compra, un depósito único de {fmtSol(CITIZEN_RENT_LAMPORTS)} para tu registro de
            compras.
          </p>
        )}
        <dl className="flex flex-col gap-1 border-t border-parchment-3 pt-2">
          <div className="flex flex-wrap items-center gap-x-2">
            <dt>{walletLabel}:</dt>
            <dd>
              <AddressChip address={sessionWallet} label="tu cuenta" />
            </dd>
          </div>
          <div className="flex flex-wrap items-center gap-x-2">
            <dt>Registro de compras:</dt>
            <dd>
              <AddressChip address={citizenPda} label="el registro de compras" />
            </dd>
          </div>
          {ready?.citizen && (
            <div className="tabular-nums lining-nums">
              <dt className="inline">Registradas: </dt>
              <dd className="inline">
                {fmt(Number(ready.citizen.ambrosiaTotal))} de néctar en {ready.citizen.purchases}{" "}
                {ready.citizen.purchases === 1 ? "compra" : "compras"}
              </dd>
            </div>
          )}
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-parchment-3 pt-2">
          <p>¿Compraste y no ves el néctar?</p>
          <ActionButton action={syncAmbrosiaAction} variant="secondary" size="sm" pendingLabel="Sincronizando…" className="h-10">
            Sincronizar compras
          </ActionButton>
        </div>
      </HowItWorks>
    </div>
  );
}

/** The server may read the chain a moment behind us: retry a few times before giving up. */
async function creditWithRetry(): Promise<number | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = await syncAmbrosiaAction();
    if (!result.ok) {
      toast(result.error, "error");
      return null;
    }
    const credited = result.data?.credited ?? 0;
    if (credited > 0) return credited;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return 0;
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={clsx("size-4", spinning && "animate-spin")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" />
    </svg>
  );
}

/** SOL de prueba balance and the faucet. When the balance is short, the faucet is the action. */
function BalanceStrip({
  sessionWallet,
  chain,
  lowBalance,
}: {
  sessionWallet: string;
  chain: ReturnType<typeof useChainData>;
  lowBalance: boolean;
}) {
  const { state, reload, refreshing } = chain;
  const [pending, setPending] = useState<"faucet" | "airdrop" | null>(null);
  const [faucetError, setFaucetError] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);

  /** The game faucet pays the logged-in account, so it works for the game key and for extensions. */
  async function claim() {
    setPending("faucet");
    setFaucetError(null);
    try {
      const result = await claimFaucetAction();
      if (result.ok) {
        toast(result.message ?? "Te mandamos SOL de prueba.");
        setLastSignature(result.data?.signature ?? null);
        reload();
      } else setFaucetError(result.error);
    } catch {
      setFaucetError("No pudimos pedir SOL de prueba. Probá de nuevo.");
    } finally {
      setPending(null);
    }
  }

  /** Fallback: the public test faucet (often rate limited). */
  async function publicAirdrop() {
    setPending("airdrop");
    try {
      const signature = await requestDevnetSol(address(sessionWallet));
      toast("Llegó 1 SOL de prueba de la canilla pública.");
      setLastSignature(signature);
      setFaucetError(null);
      reload();
    } catch (err) {
      setFaucetError(err instanceof FriendlyError ? err.message : "La canilla pública tampoco respondió.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-gradient-to-b from-sea-800 to-sea-900 px-3 py-2 text-foam ring-1 ring-sea-300/25">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex flex-1 items-center gap-1">
          <div className="leading-none whitespace-nowrap">
            <p className="text-[11px] font-bold tracking-wider text-sea-300 uppercase">Tu saldo</p>
            {state.status === "ready" ? (
              <p className={clsx("mt-1 font-display text-xl font-bold tabular-nums lining-nums", lowBalance ? "text-danger-soft" : "text-foam")}>
                {fmtSol(state.balance)} <span className="font-body text-sm font-normal text-foam/70">SOL de prueba</span>
              </p>
            ) : state.status === "loading" ? (
              <span className="mt-1 inline-block h-6 w-28 animate-pulse rounded bg-foam/15" />
            ) : (
              <p className="mt-1 text-sm text-foam/70">Sin datos</p>
            )}
          </div>
          <button
            type="button"
            onClick={reload}
            disabled={refreshing || state.status === "loading"}
            aria-label="Actualizar saldo"
            title="Actualizar saldo"
            className="grid size-10 shrink-0 place-items-center rounded-lg text-sea-300 transition hover:bg-foam/10 hover:text-foam disabled:opacity-50"
          >
            <RefreshIcon spinning={refreshing} />
          </button>
        </div>
        <Button
          variant={lowBalance ? "sea" : "ghost"}
          size={lowBalance ? "md" : "sm"}
          onClick={claim}
          disabled={!!pending}
          loading={pending === "faucet"}
          className={clsx(!lowBalance && "h-10 text-sea-300 hover:bg-foam/10 hover:text-foam")}
          title="Una vez cada 12 horas. Alcanza para un pack."
        >
          {pending === "faucet" ? "Pidiendo SOL…" : "Pedir SOL de prueba"}
        </Button>
      </div>
      {lastSignature && !faucetError && (
        <a
          href={explorerTx(lastSignature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center gap-1 self-start text-sm font-bold text-sea-300 underline-offset-4 hover:underline"
        >
          Ver comprobante del envío <ExternalIcon />
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      )}
      {faucetError && (
        <div role="alert" className="flex flex-col gap-1 border-t border-foam/15 pt-2 text-sm text-[#ffcfc4]">
          <p>{faucetError}</p>
          <p className="flex flex-wrap items-center gap-x-3">
            <button
              type="button"
              onClick={publicAirdrop}
              disabled={!!pending}
              className="min-h-10 font-bold text-foam underline underline-offset-4 disabled:opacity-50"
            >
              {pending === "airdrop" ? "Probando la canilla pública…" : "Probar la canilla pública"}
            </button>
            <a href={FAUCET_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 font-bold text-foam underline underline-offset-4">
              Otra canilla <ExternalIcon />
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

function Notice({ tone, children }: { tone: "warn" | "error"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-xl px-3 py-2 text-[15px]",
        tone === "error" ? "bg-danger text-marble" : "border border-bronze/40 bg-parchment-2 text-ink",
      )}
    >
      {children}
    </p>
  );
}
