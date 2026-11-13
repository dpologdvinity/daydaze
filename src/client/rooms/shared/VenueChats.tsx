// The standing conversations of a venue (game/chatSpots.ts): each spot a
// ChatGroup of street-looking people, borrowed from the sidewalk walkers.

import { CHAT_SPOTS } from "../../../game/chatSpots.ts";
import { PEDESTRIANS } from "../../../game/city/pedestrians.ts";
import { mix } from "../../../game/dance/idlePlan.ts";
import type { Look } from "../../../game/look.ts";
import type { RoomId } from "../../../game/rooms.ts";
import { ChatGroup } from "./ChatGroup.tsx";

export function VenueChats({ room }: { room: RoomId }) {
  return (
    <>
      {(CHAT_SPOTS[room] ?? []).map((spot) => (
        <ChatGroup
          key={`${spot.at}`}
          at={spot.at}
          seed={spot.seed}
          looks={Array.from(
            { length: spot.size },
            (_, m) =>
              PEDESTRIANS[mix(spot.seed, 40 + m) % PEDESTRIANS.length]
                ?.look as Look,
          )}
          turn={(spot.seed % 7) * 0.9}
        />
      ))}
    </>
  );
}
