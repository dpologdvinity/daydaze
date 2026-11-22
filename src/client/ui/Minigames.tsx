// Mounts the open minigame. Each one is lazy-loaded, since they are big and
// rarely opened.
import { lazy, Suspense, useState } from "react";
import { hotspotsIn, type MinigameId } from "../../game/hotspots.ts";
import type { RoomId } from "../../game/rooms.ts";
import { hostedTrivia } from "../../game/triviaNight.ts";
import type { PayGrade } from "../../game/wallet.ts";
import type { PrizeGame } from "../../game/prizes.ts";
import type { BoothId } from "../../minigames/midway/engine.ts";
import { award } from "./prizeDesk.ts";
import { useReducedMotion } from "../motion.ts";
import { nightClock } from "../city/eventClocks.ts";
import { useNight } from "../rooms/useNight.ts";

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

const Trivia = lazy(() =>
  import("../../minigames/trivia/Trivia.tsx").then((m) => ({
    default: m.Trivia,
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
  // a night's games show while it is on (the hook re-draws as it starts)
  useNight(room);
  const spots = hotspotsIn(room, nightClock());
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

// Cabinets whose best round goes to the prize desk (bests, daily challenges).
const PRIZES: Partial<Record<MinigameId, PrizeGame>> = {
  "gem-glam": "gem-glam",
  "star-siege": "star-siege",
  trivia: "trivia",
};

/** The open minigame as a modal dialog over the world; closing it returns to the room. */
export function GameOverlay({
  game,
  room,
  onClose,
}: {
  game: MinigameId;
  /** Where the game was opened: a trivia night there hosts the trivia. */
  room: RoomId;
  /** Receives the finished round's grade to pay, or null when the player
   * quit or the prize desk paid instead. */
  onClose: (grade: PayGrade | null) => void;
}) {
  const reducedMotion = useReducedMotion();
  // fixed as the game opens, so a night ending mid-round doesn't change it
  const [hosted] = useState(() => hostedTrivia(room, nightClock()));
  const done = (
    result: { grade: PayGrade; score?: number; booth?: BoothId } | null,
  ) => {
    const prize = result?.booth
      ? (`midway-${result.booth}` as const)
      : PRIZES[game];
    if (prize && result?.score !== undefined) {
      award(prize, result.score);
      onClose(null);
    } else onClose(result?.grade ?? null);
  };
  return (
    <Suspense fallback={null}>
      {game === "bassline" ? (
        <Bassline onClose={done} reducedMotion={reducedMotion} />
      ) : game === "midway" ? (
        <Midway onClose={done} reducedMotion={reducedMotion} />
      ) : game === "gem-glam" ? (
        <GemGlam onClose={done} reducedMotion={reducedMotion} />
      ) : game === "trivia" ? (
        <Trivia onClose={done} reducedMotion={reducedMotion} hosted={hosted} />
      ) : game === "star-siege" ? (
        <StarSiege onClose={done} reducedMotion={reducedMotion} />
      ) : (
        <LastCall onClose={done} reducedMotion={reducedMotion} />
      )}
    </Suspense>
  );
}
