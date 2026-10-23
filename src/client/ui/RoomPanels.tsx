import { lazy, Suspense, useState, type ComponentType } from "react";
import type { RoomId } from "../../game/rooms.ts";

const panel = <K extends string>(
  load: () => Promise<Record<K, ComponentType>>,
  name: K,
) => lazy(() => load().then((m) => ({ default: m[name] })));

/** A room with more than one game: a row of tabs picks whose controls show
 * (a game left running keeps going in its own store). */
const games = (...list: [label: string, Panel: ComponentType][]) =>
  function Games() {
    const [pick, setPick] = useState(0);
    const Panel = list[pick]?.[1];
    return (
      <>
        <div className="game-tabs" role="group" aria-label="Games here">
          {list.map(([label], i) => (
            <button
              key={label}
              type="button"
              aria-pressed={i === pick}
              onClick={() => setPick(i)}
            >
              {label}
            </button>
          ))}
        </div>
        {Panel && <Panel />}
      </>
    );
  };

/** Each game room's controls, loaded with the room rather than up front. */
const PANELS: Partial<Record<RoomId, ComponentType>> = {
  "water-park": panel(
    () => import("../rooms/waterpark/DivePanel.tsx"),
    "DivePanel",
  ),
  "back-room": panel(
    () => import("../rooms/backroom/CardsPanel.tsx"),
    "CardsPanel",
  ),
  city: panel(() => import("../city/CityDrivePanel.tsx"), "CityDrivePanel"),
  bowling: panel(
    () => import("../rooms/bowling/BowlingPanel.tsx"),
    "BowlingPanel",
  ),
  "mini-golf": panel(
    () => import("../rooms/minigolf/GolfPanel.tsx"),
    "GolfPanel",
  ),
  dome: panel(() => import("../rooms/dome/HoopsPanel.tsx"), "HoopsPanel"),
  skatepark: panel(
    () => import("../rooms/skatepark/SkatePanel.tsx"),
    "SkatePanel",
  ),
  gridiron: panel(
    () => import("../rooms/gridiron/FieldGoalPanel.tsx"),
    "FieldGoalPanel",
  ),
  "driving-range": panel(
    () => import("../rooms/range/RangePanel.tsx"),
    "RangePanel",
  ),
  museum: panel(
    () => import("../rooms/museum/ExhibitsPanel.tsx"),
    "ExhibitsPanel",
  ),
  aquarium: games(
    [
      "Seal show",
      panel(() => import("../rooms/aquarium/SealPanel.tsx"), "SealPanel"),
    ],
    [
      "Reef Spotter",
      panel(() => import("../rooms/aquarium/ReefPanel.tsx"), "ReefPanel"),
    ],
  ),
  "ice-rink": games(
    [
      "Ice show",
      panel(() => import("../rooms/icerink/ShowPanel.tsx"), "ShowPanel"),
    ],
    [
      "Curling",
      panel(() => import("../rooms/icerink/CurlingPanel.tsx"), "CurlingPanel"),
    ],
  ),
  "mermaid-cove": panel(
    () => import("../rooms/cove/SirenPanel.tsx"),
    "SirenPanel",
  ),
  catwalk: panel(
    () => import("../rooms/catwalk/RunwayPanel.tsx"),
    "RunwayPanel",
  ),
  courtside: panel(
    () => import("../rooms/courtside/TennisPanel.tsx"),
    "TennisPanel",
  ),
  marina: games(
    [
      "Fishing",
      panel(() => import("../rooms/marina/FishingPanel.tsx"), "FishingPanel"),
    ],
    [
      "Jet-ski race",
      panel(() => import("../rooms/marina/JetSkiPanel.tsx"), "JetSkiPanel"),
    ],
  ),
  gym: panel(() => import("../rooms/gym/RoutinePanel.tsx"), "RoutinePanel"),
  stadium: panel(
    () => import("../rooms/stadium/PenaltyPanel.tsx"),
    "PenaltyPanel",
  ),
  "music-studio": panel(
    () => import("../rooms/studio/StudioPanel.tsx"),
    "StudioPanel",
  ),
  paintball: panel(
    () => import("../rooms/lasertag/LaserTagPanel.tsx"),
    "PaintballPanel",
  ),
  zoo: games(
    [
      "Photo hunt",
      panel(() => import("../rooms/zoo/SafariPanel.tsx"), "SafariPanel"),
    ],
    [
      "Feeding time",
      panel(() => import("../rooms/zoo/FeedingPanel.tsx"), "FeedingPanel"),
    ],
  ),
  "sushi-bar": panel(
    () => import("../rooms/sushi/SushiPanel.tsx"),
    "SushiPanel",
  ),
  "ramen-shop": panel(
    () => import("../rooms/food/RamenPanel.tsx"),
    "RamenPanel",
  ),
  "kamayan-hall": panel(
    () => import("../rooms/food/CookOffPanel.tsx"),
    "CookOffPanel",
  ),
  "halo-halo-cafe": panel(
    () => import("../rooms/food/HaloHaloPanel.tsx"),
    "HaloHaloPanel",
  ),
  "boba-matcha": panel(
    () => import("../rooms/food/BobaPanel.tsx"),
    "BobaPanel",
  ),
  salon: panel(() => import("../rooms/salon/NailPanel.tsx"), "NailPanel"),
  "wine-bar": panel(() => import("../rooms/cellar/PourPanel.tsx"), "PourPanel"),
  "boardwalk-arcade": panel(
    () => import("../rooms/boardwalk/SkeePanel.tsx"),
    "SkeePanel",
  ),
  "surf-shack": panel(() => import("../rooms/surf/SurfPanel.tsx"), "SurfPanel"),
  gallery: panel(() => import("../rooms/gallery/PaintPanel.tsx"), "PaintPanel"),
  patisserie: panel(
    () => import("../rooms/patisserie/TowerPanel.tsx"),
    "TowerPanel",
  ),
  "espresso-lab": panel(
    () => import("../rooms/espresso/BaristaPanel.tsx"),
    "BaristaPanel",
  ),
  "laser-tag": games(
    [
      "Laser tag",
      panel(
        () => import("../rooms/lasertag/LaserTagPanel.tsx"),
        "LaserTagPanel",
      ),
    ],
    [
      "Target range",
      panel(() => import("../rooms/lasertag/RangePanel.tsx"), "RangePanel"),
    ],
  ),
  speedway: panel(
    () => import("../rooms/speedway/SpeedwayPanels.tsx"),
    "SpeedwayPanels",
  ),
};

export function RoomPanel({ room }: { room: RoomId }) {
  const Panel = PANELS[room];
  return Panel ? (
    <Suspense fallback={null}>
      <Panel />
    </Suspense>
  ) : null;
}
