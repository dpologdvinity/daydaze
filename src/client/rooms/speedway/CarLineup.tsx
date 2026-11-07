// Car lineup for the Speedway:
// 1. With `?lineup=cars`, displays all roster cars for documentation screenshots.
// 2. In normal play, displays stock cars in the paddock that the player can click
//    to join the stock-car oval race.

import type { Group } from "three";
import type { CarMods } from "../../../game/city/drive.ts";
import { CARS } from "../../../game/driving/roster.ts";
import { driving } from "../../world/driving.ts";
import { CarMesh } from "./CarMesh.tsx";
import { StockCarMesh } from "./StockCarMesh.tsx";
import { STOCK_LIVERIES } from "./stockCarArt.ts";

const LINEUP_COLORS = [
  "#ffffff",
  "#ff4fb3",
  "#4fe3ff",
  "#ffd84f",
  "#b06bff",
  "#7dff6b",
  "#ff7a2e",
];

/** Mods for the documentation lineup: `?wrap=stripes&rims=gold&tint=smoke&glow=pink`. */
function lineupMods(params: URLSearchParams): CarMods {
  const mods: CarMods = {};
  const wrap = params.get("wrap");
  const rims = params.get("rims");
  const tint = params.get("tint");
  const glow = params.get("glow");
  if (wrap) mods.wrap = wrap;
  if (rims) mods.rims = rims;
  if (tint) mods.tint = tint;
  if (glow) mods.glow = glow;
  return mods;
}

export function CarLineup() {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const isDebug = params.get("lineup") === "cars";

  if (isDebug) {
    return (
      <group rotation-y={0.5}>
        {CARS.map((spec, i) => (
          <group
            key={spec.id}
            position={[(i - 3) * 3.4, 0, 0]}
            onClick={(e) => {
              if (e.delta > 6) return;
              e.stopPropagation();
              driving.request = "race-oval";
            }}
          >
            <CarMesh
              spec={spec}
              color={LINEUP_COLORS[i % LINEUP_COLORS.length]}
              mods={lineupMods(params)}
              ref={(g: Group | null) => {
                if (g) g.visible = true;
              }}
            />
          </group>
        ))}
      </group>
    );
  }

  // Stock car lineup in the Speedway paddock: clickable to join race
  return (
    <group position={[0, 0, -15]} rotation-y={0}>
      {STOCK_LIVERIES.slice(0, 4).map((liv, i) => (
        <group
          key={`lineup-stock-${i}`}
          position={[(i - 1.5) * 4.5, 0, 0]}
          onClick={(e) => {
            if (e.delta > 6) return;
            e.stopPropagation();
            driving.request = "race-oval";
          }}
        >
          <StockCarMesh index={i} livery={liv} visible={true} />
        </group>
      ))}
    </group>
  );
}
