// The park's wandering animals (game/city/parkWildlife.ts), reusing the zoo's
// WanderingCreature. They exist only while the player is near the park, so
// the city's draw budget elsewhere is untouched; the textured doe is skipped
// on the low tier.

import { useFrame } from "@react-three/fiber";
import { useEffect, useState, type JSX } from "react";
import {
  wildlifeFor,
  WILDLIFE_Y,
  wildlifeNear,
} from "../../game/city/parkWildlife.ts";
import { WanderingCreature } from "../creatures/Wanderer.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { useQuality } from "../world/quality.ts";

export function ParkWildlife({
  player,
}: {
  player: Player;
}): JSX.Element | null {
  const tier = useQuality();
  const [near, setNear] = useState(false);
  useFrame(() => {
    const now = wildlifeNear(player.pos.x, player.pos.z);
    if (now !== near) setNear(now);
  });
  const shown = near ? wildlifeFor(tier) : [];
  // how many animals are drawn, for the browser tests
  useEffect(() => {
    const dom = document.querySelector("canvas")?.dataset;
    if (dom) dom.wildlife = String(shown.length);
  }, [shown.length]);
  if (!near) return null;
  return (
    <>
      {shown.map((w, i) => (
        <WanderingCreature
          key={i}
          kind={w.kind}
          pen={w.pen}
          speed={w.speed}
          phase={w.phase}
          dir={w.dir}
          y={WILDLIFE_Y}
          player={player}
        />
      ))}
    </>
  );
}
