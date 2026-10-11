import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GameSkeleton } from "@/components/game/shell";
import { getGame } from "@/server/game-context";

export const metadata: Metadata = { title: "Ciudad" };

/** /ciudad opens the city in focus (remembered one or the capital). */
export default function CityIndexPage() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <GoToCity />
    </Suspense>
  );
}

async function GoToCity() {
  const { city } = await getGame();
  return redirect(`/ciudad/${city.id}`);
}
