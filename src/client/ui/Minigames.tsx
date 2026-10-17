import { lazy, Suspense } from "react";
import { hotspotsIn, type MinigameId } from "../../game/hotspots.ts";
import type { RoomId } from "../../game/rooms.ts";
import type { PayGrade } from "../../game/wallet.ts";
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

const Midway = lazy(() =>
  import("../../minigames/midway/Midway.tsx").then((m) => ({
    default: m.Midway,
  })),
);

const GemGlam = lazy(() =>
  import("../../minigames/gemGlam/GemGlam.tsx").then((m) => ({
    default: m.GemGlam,
  })),
);

const StarSiege = lazy(() =>
  import("../../minigames/starSiege/StarSiege.tsx").then((m) => ({
    default: m.StarSiege,
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
  /** Receives the finished round's grade, or null when the player quit. */
  onClose: (grade: PayGrade | null) => void;
}) {
  const reducedMotion = useReducedMotion();
  const done = (result: { grade: PayGrade } | null) =>
    onClose(result?.grade ?? null);
  return (
    <Suspense fallback={null}>
      {game === "bassline" ? (
        <Bassline onClose={done} reducedMotion={reducedMotion} />
      ) : game === "midway" ? (
        <Midway onClose={done} reducedMotion={reducedMotion} />
      ) : game === "gem-glam" ? (
        <GemGlam onClose={done} reducedMotion={reducedMotion} />
      ) : game === "star-siege" ? (
        <StarSiege onClose={done} reducedMotion={reducedMotion} />
      ) : (
        <LastCall onClose={done} reducedMotion={reducedMotion} />
      )}
    </Suspense>
  );
}
