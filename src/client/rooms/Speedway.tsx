import { ROOMS } from "../../game/rooms.ts";
import type { PickHandler } from "./shared/Floor.tsx";
import { Floor } from "./shared/Floor.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

/** The Speedway: a night pit apron in front of the track. */
export function Speedway({ onPick }: { onPick: PickHandler }) {
  return (
    <>
      <color attach="background" args={["#05030d"]} />
      <ambientLight intensity={0.5} />
      <Floor
        width={20}
        depth={13}
        center={[0, 0.5]}
        color="#1b1830"
        onPick={onPick}
      />
      <PortalPads room={ROOMS.speedway} color="#ff4fb3" />
    </>
  );
}
