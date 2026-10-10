"use client";

import { useState } from "react";
import clsx from "clsx";
import { explorerAddress } from "@/lib/solana/config";
import { shortAddress } from "@/lib/format";

export function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={clsx("size-3.5 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h4v4M13 3 7.5 8.5M11 9.5V13H3V5h3.5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.5" />
    </svg>
  );
}

/** Short address with a copy button and a separate explorer link (devnet). */
export function AddressChip({ address, label = "dirección", tone = "light" }: { address: string; label?: string; tone?: "light" | "dark" }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the explorer link still exposes the full address.
    }
  }
  const dark = tone === "dark";
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
      <code title={address} className={clsx("rounded-md px-1.5 py-0.5 font-mono text-sm", dark ? "bg-foam/10 text-foam" : "bg-ink/8 text-ink")}>
        {shortAddress(address)}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copiar ${label}`}
        className={clsx(
          "inline-grid size-10 place-items-center rounded-lg transition",
          dark ? "text-foam/80 hover:bg-foam/10 hover:text-foam" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
        )}
      >
        {copied ? <span className="text-xs font-bold">Copiada</span> : <CopyIcon />}
      </button>
      <a
        href={explorerAddress(address)}
        target="_blank"
        rel="noreferrer"
        className={clsx(
          "inline-flex min-h-10 items-center gap-1 rounded-lg px-1.5 text-sm font-bold underline-offset-4 hover:underline",
          dark ? "text-sea-300" : "text-sea-700",
        )}
      >
        Explorador
        <ExternalIcon />
        <span className="sr-only"> (se abre en otra pestaña)</span>
      </a>
      <span aria-live="polite" className="sr-only">
        {copied ? "Dirección copiada" : ""}
      </span>
    </span>
  );
}
