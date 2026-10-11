"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { useI18n } from "@/i18n/client";
import { renamePlayerAction } from "@/server/actions";

/** Inline rename (inside the "Change name" fold). Validates in the player's language, not with the browser bubble. */
export function RenameForm({ currentName }: { currentName: string }) {
  const { t } = useI18n();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const clean = name.trim().replace(/\s+/g, " ");
  const unchanged = clean === currentName;

  return (
    <form
      noValidate
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length < 3 || clean.length > 20) {
          setError(t({ en: "Your name needs 3 to 20 characters.", es: "Tu nombre tiene que tener entre 3 y 20 letras." }));
          return;
        }
        start(async () => {
          const result = await renamePlayerAction({ name: clean });
          if (result.ok) {
            setError(null);
            toast(result.message ?? t({ en: "Name updated.", es: "Nombre actualizado." }));
          } else setError(result.error);
        });
      }}
    >
      <label htmlFor="arconte-name" className="sr-only">
        {t({ en: "Your archon name", es: "Tu nombre de arconte" })}
      </label>
      <div className="flex gap-2">
        <input
          id="arconte-name"
          name="name"
          type="text"
          autoComplete="nickname"
          spellCheck={false}
          maxLength={20}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? "arconte-name-error" : "arconte-name-help"}
          className="h-10 w-full min-w-0 flex-1 rounded-lg border border-parchment-3 bg-marble px-3 text-[16px] text-ink shadow-inner outline-none transition placeholder:text-ink-soft/70 focus-visible:border-bronze focus-visible:ring-2 focus-visible:ring-gold/60 aria-[invalid=true]:border-danger"
        />
        <Button type="submit" disabled={pending || unchanged} aria-busy={pending} className="shrink-0">
          {pending ? t({ en: "Saving…", es: "Guardando…" }) : t({ en: "Save", es: "Guardar" })}
        </Button>
      </div>
      {error ? (
        <p id="arconte-name-error" role="alert" className="text-sm font-bold text-danger-soft">
          {error}
        </p>
      ) : (
        <p id="arconte-name-help" className="text-xs text-foam/70">
          {t({
            en: "How others see you on the rankings and the islands. 3 to 20 characters.",
            es: "Así te ven en el ranking y en las islas. Entre 3 y 20 letras.",
          })}
        </p>
      )}
    </form>
  );
}
