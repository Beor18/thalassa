"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reportResult } from "@/components/ui/action-button";
import { useI18n } from "@/i18n/client";
import { renameCityAction } from "@/server/actions";

export function RenameCityForm({ cityId, name }: { cityId: string; name: string }) {
  const { t } = useI18n();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const clean = value.trim().replace(/\s+/g, " ");
  const unchanged = clean === name;

  return (
    <form
      noValidate
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length < 3 || clean.length > 24) {
          setError(t({ en: "The name must be 3 to 24 letters long.", es: "El nombre tiene que tener entre 3 y 24 letras." }));
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
      <label htmlFor="city-name" className="sr-only">
        {t({ en: "City name", es: "Nombre de la ciudad" })}
      </label>
      <div className="flex gap-2">
        <input
          id="city-name"
          name="name"
          type="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={24}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "city-name-error" : "city-name-hint"}
          className="h-10 min-w-0 flex-1 rounded-lg border border-parchment-3 bg-marble px-3 text-[15px] text-ink shadow-inner focus-visible:border-bronze"
        />
        <Button type="submit" variant="secondary" disabled={pending || unchanged} aria-busy={pending}>
          {pending ? t({ en: "Saving…", es: "Guardando…" }) : t({ en: "Save name", es: "Guardar nombre" })}
        </Button>
      </div>
      {error ? (
        <p id="city-name-error" className="text-sm font-bold text-danger">
          {error}
        </p>
      ) : (
        <p id="city-name-hint" className="text-xs text-ink-soft">
          {t({ en: "3 to 24 letters. Everyone on the island sees it.", es: "De 3 a 24 letras. Lo ven todos en la isla." })}
        </p>
      )}
    </form>
  );
}
