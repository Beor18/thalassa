import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="panel w-full px-6 py-8">
        <p className="font-display text-sm font-bold tracking-[0.3em] text-bronze-dark">404</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Esta isla no figura en las cartas</h1>
        <p className="mt-2 text-ink-soft">Puede que la ruta esté mal escrita o que la ciudad ya no exista.</p>
        <Link href="/ciudad" className={buttonClass("primary", "md", "mt-6")}>
          Volver a mi polis
        </Link>
      </div>
    </div>
  );
}
