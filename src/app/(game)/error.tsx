"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";

export default function GameError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[thalassa]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="panel w-full px-6 py-8">
        <h1 className="font-display text-2xl font-bold">Se cortó el viento</h1>
        <p className="mt-2 text-ink-soft">Algo falló al cargar esta parte del Egeo. Tu polis está a salvo.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => retry()}>Probar de nuevo</Button>
          <Link href="/ciudad" className={buttonClass("secondary")}>
            Volver a mi polis
          </Link>
        </div>
      </div>
    </div>
  );
}
