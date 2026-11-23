// Trivia night's quiz host and floor pad: while the night is on in a club
// that runs it, a host stands in the room (tap for a line from the night's
// host bank) with a glowing pad in front that opens the hosted round. The
// layout is in src/game/triviaNight.ts.

import { hotspotsIn, type MinigameId } from "../../../game/hotspots.ts";
import type { Look } from "../../../game/look.ts";
import type { RoomId } from "../../../game/rooms.ts";
import { TRIVIA_HOSTS } from "../../../game/triviaNight.ts";
import { nightClock } from "../../city/eventClocks.ts";
import { useNight } from "../useNight.ts";
import { GamePad } from "./GamePad.tsx";
import { TalkingNpc } from "./TalkingNpc.tsx";

const HOST_LOOK: Look = {
  skin: "#c48d68",
  hairStyle: "waves",
  hairColor: "#2a1a14",
  lips: "lips-burgundy-cherry",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#2f6fd0",
  shadow: "#8a5a3c",
};

/** The quiz host and pad for `room`, or nothing when trivia night is off. */
export function TriviaHost({
  room,
  onGame,
}: {
  room: RoomId;
  onGame: (game: MinigameId) => void;
}) {
  const night = useNight(room);
  const host = TRIVIA_HOSTS[room];
  if (!host || night?.id !== "trivia-night") return null;
  return (
    <>
      <TalkingNpc
        name="Quiz host"
        role="dj"
        look={HOST_LOOK}
        mood="idle"
        at={[host.at[0], 0, host.at[1]]}
        rot={host.rot}
        seed={701}
        context={{ venue: room }}
      />
      {hotspotsIn(room, nightClock()).map((spot) => (
        <GamePad key={spot.id} spot={spot} onGame={onGame} />
      ))}
    </>
  );
}
