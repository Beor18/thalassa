import { GameSkeleton } from "@/components/game/shell";
import { Toaster } from "@/components/ui/toaster";

/*
  While a section is redirecting (for example /ciudad on its way to /ciudad/{id}) the page slot
  renders nothing for a moment. Instead of empty sea, this skeleton shows through. It is hidden in
  the markup and only a CSS rule reveals it, when the stage has nothing on screen (see .game-stage
  in globals.css), so it can never sit under a finished page. It is not anchored for view
  transitions: the section's own header keeps that name.
*/
export default function GameLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="game-stage">{children}</div>
      <div className="game-stage-fallback hidden">
        <GameSkeleton anchored={false} />
      </div>
      <Toaster />
    </>
  );
}
