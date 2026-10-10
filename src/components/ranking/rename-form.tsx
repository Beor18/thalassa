"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { renamePlayerAction } from "@/server/actions";

export function RenameForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const clean = name.trim().replace(/\s+/g, " ");
  const unchanged = clean === currentName;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length < 3 || clean.length > 20) {
          setError("Tu nombre tiene que tener entre 3 y 20 letras.");
          return;
        }
        start(async () => {
          const result = await renamePlayerAction({ name: clean });
          if (result.ok) {
            setError(null);
            toast(result.message ?? "Nombre actualizado.");
          } else setError(result.error);
        });
      }}
    >
      <label htmlFor="arconte-name" className="font-display text-base font-bold">
        Tu nombre de arconte
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="arconte-name"
          name="name"
          type="text"
          autoComplete="nickname"
          spellCheck={false}
          minLength={3}
          maxLength={20}
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? "arconte-name-error" : "arconte-name-help"}
          className="h-10 w-full min-w-0 rounded-lg sm:flex-1 border border-parchment-3 bg-marble px-3 text-[16px] text-ink shadow-inner outline-none transition placeholder:text-ink-soft/70 focus-visible:border-bronze focus-visible:ring-2 focus-visible:ring-gold/60 aria-[invalid=true]:border-danger sm:max-w-xs"
        />
        <Button type="submit" disabled={pending || unchanged} aria-busy={pending}>
          {pending ? "Guardando…" : "Cambiar nombre"}
        </Button>
      </div>
      {error ? (
        <p id="arconte-name-error" role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      ) : (
        <p id="arconte-name-help" className="text-sm text-ink-soft">
          Así te ven los demás en el ranking y en las islas. Entre 3 y 20 letras.
        </p>
      )}
    </form>
  );
}
