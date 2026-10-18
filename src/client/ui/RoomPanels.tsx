import { lazy, Suspense, type ComponentType } from "react";
import type { RoomId } from "../../game/rooms.ts";

const panel = <K extends string>(
  load: () => Promise<Record<K, ComponentType>>,
  name: K,
) => lazy(() => load().then((m) => ({ default: m[name] })));

/** Each game room's controls, loaded with the room rather than up front. */
const PANELS: Partial<Record<RoomId, ComponentType>> = {
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
  aquarium: panel(() => import("../rooms/aquarium/SealPanel.tsx"), "SealPanel"),
  "ice-rink": panel(
    () => import("../rooms/icerink/ShowPanel.tsx"),
    "ShowPanel",
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
  marina: panel(
    () => import("../rooms/marina/FishingPanel.tsx"),
    "FishingPanel",
  ),
  gym: panel(() => import("../rooms/gym/RoutinePanel.tsx"), "RoutinePanel"),
  stadium: panel(
    () => import("../rooms/stadium/PenaltyPanel.tsx"),
    "PenaltyPanel",
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
