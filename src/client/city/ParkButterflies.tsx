// The park's butterflies: the shared flocks (world/Butterflies.tsx) over the
// park's lawns, out only by day and only while the player is near a flock.

import type { JSX } from "react";
import { PARK_FLOCKS } from "../../game/butterflies.ts";
import { Butterflies } from "../world/Butterflies.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { useDaylight } from "./daylight.ts";

export function ParkButterflies({ player }: { player: Player }): JSX.Element {
  const { sun } = useDaylight();
  return <Butterflies flocks={PARK_FLOCKS} player={player} sun={sun} />;
}
