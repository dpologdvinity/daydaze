// A debug lineup of every roster car side by side, for the docs screenshot.
// Renders nothing unless the URL has `?lineup=cars`.

import type { Group } from "three";
import { CARS } from "../../../game/driving/roster.ts";
import { CarMesh } from "./CarMesh.tsx";

const LINEUP_COLORS = [
  "#ffffff",
  "#ff4fb3",
  "#4fe3ff",
  "#ffd84f",
  "#b06bff",
  "#7dff6b",
  "#ff7a2e",
];

/**
 * Every roster car side by side, for the screenshot in docs/screenshots.
 * Only mounts with `?lineup=cars`, so it never shows in play.
 */
export function CarLineup() {
  if (new URLSearchParams(window.location.search).get("lineup") !== "cars") {
    return null;
  }
  return (
    <group rotation-y={0.5}>
      {CARS.map((spec, i) => (
        <group key={spec.id} position={[(i - 3) * 3.4, 0, 0]}>
          <CarMesh
            spec={spec}
            color={LINEUP_COLORS[i % LINEUP_COLORS.length]}
            ref={(g: Group | null) => {
              if (g) g.visible = true;
            }}
          />
        </group>
      ))}
    </group>
  );
}
