"use client";

import { useRef, useState, useTransition } from "react";
import { reportResult } from "@/components/ui/action-button";
import { buttonClass } from "@/components/ui/button";
import { renameCityAction } from "@/server/actions";
import { IconPencil } from "./icons";

/**
 * Light naming moment on the city plaque while the capital still has its automatic name.
 * A small invitation that opens an inline field; it never blocks play and disappears once named.
 */
export function NameCityPrompt({ cityId, name }: { cityId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const clean = value.trim().replace(/\s+/g, " ");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-full bg-gold/15 px-2.5 text-xs font-bold text-gold-light ring-1 ring-gold/50 transition-colors duration-100 hover:bg-gold/25 max-md:min-h-10"
      >
        <IconPencil size={13} />
        Ponele nombre a tu ciudad
      </button>
    );
  }

  return (
    <form
      noValidate
      className="mt-1.5 flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length < 3 || clean.length > 24) {
          setError("Entre 3 y 24 letras.");
          return;
        }
        setError(null);
        start(async () => {
          const result = await renameCityAction({ cityId, name: clean });
          if (!result.ok) setError(result.error);
          reportResult(result);
        });
      }}
    >
      <div className="flex items-center gap-1.5">
        <label htmlFor="plaque-city-name" className="sr-only">
          Nombre de la ciudad
        </label>
        <input
          ref={inputRef}
          id="plaque-city-name"
          type="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={24}
          placeholder={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Escape folds the field back (and doesn't close a panel underneath).
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "plaque-city-name-error" : undefined}
          className="h-10 w-44 min-w-0 rounded-lg border border-sea-300/40 bg-sea-950/70 px-2.5 text-[15px] text-foam placeholder:text-foam/40 focus-visible:border-gold sm:w-52"
        />
        <button type="submit" disabled={pending || clean.length === 0} aria-busy={pending} className={buttonClass("primary", "md", "px-3")}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Ahora no"
          className="grid size-10 shrink-0 place-items-center rounded-full text-xl leading-none text-foam/70 hover:bg-foam/10 hover:text-foam"
        >
          <span aria-hidden>×</span>
        </button>
      </div>
      {error && (
        <p id="plaque-city-name-error" className="text-xs font-bold text-danger-soft">
          {error}
        </p>
      )}
    </form>
  );
}
