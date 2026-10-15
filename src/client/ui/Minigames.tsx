import { lazy, Suspense } from "react";
import { hotspotsIn, type MinigameId } from "../../game/hotspots.ts";
import type { RoomId } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";

// The minigames are big and rarely opened, so their code loads on first play.
const Bassline = lazy(() =>
  import("../../minigames/bassline/Bassline.tsx").then((m) => ({
    default: m.Bassline,
  })),
);
const LastCall = lazy(() =>
  import("../../minigames/lastCall/LastCall.tsx").then((m) => ({
    default: m.LastCall,
  })),
);

/** The keyboard route to each hotspot in this room, as plain buttons. */
export function VenueGames({
  room,
  onPlay,
}: {
  room: RoomId;
  onPlay: (game: MinigameId) => void;
}) {
  const spots = hotspotsIn(room);
  if (spots.length === 0) return null;
  return (
    <nav className="venue-games" aria-label="Games in this room">
      {spots.map((spot) => (
        <button key={spot.id} type="button" onClick={() => onPlay(spot.game)}>
          {spot.label}
        </button>
      ))}
    </nav>
  );
}

/** The open minigame as a modal dialog over the world; closing it returns to the room. */
export function GameOverlay({
  game,
  onClose,
}: {
  game: MinigameId;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Suspense fallback={null}>
      {game === "bassline" ? (
        <Bassline onClose={onClose} reducedMotion={reducedMotion} />
      ) : (
        <LastCall onClose={onClose} reducedMotion={reducedMotion} />
      )}
    </Suspense>
  );
}
