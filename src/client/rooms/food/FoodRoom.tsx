import type { JSX, ReactNode } from "react";
import { useRef } from "react";
import type { Look } from "../../../game/look.ts";
import type { DialogueRole } from "../../../game/dialogue/types.ts";
import { ROOMS, type RoomId } from "../../../game/rooms.ts";
import type { FoodVenue } from "../../../game/food/venues.ts";
import { holdItem } from "../../food/store.ts";
import { Floor, type PickHandler } from "../shared/Floor.tsx";
import { MARQUEE, NeonText } from "../shared/Neon.tsx";
import { PortalPads } from "../shared/PortalPads.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";
import { Fitout } from "./Fitout.tsx";

export type FoodPalette = {
  room: RoomId;
  background: string;
  fog: string;
  sky: string;
  ground: string;
  light: string;
  floor: string;
  wall: string;
  counter: string;
  accent: string;
};

export type CounterStaff = {
  name: string;
  role: DialogueRole;
  look: Look;
  seed: number;
};

/**
 * A counter-service food room: walls, floor, a neon sign and a counter with
 * one staff member. Tapping the staff hands the doll the next item on the menu.
 * Each venue dresses the room with its own children.
 */
export function FoodRoom({
  venue,
  palette,
  staff,
  onPick,
  children,
}: {
  venue: FoodVenue;
  palette: FoodPalette;
  staff: CounterStaff;
  onPick: PickHandler;
  children?: ReactNode;
}): JSX.Element {
  const next = useRef(0);
  // The staff hands over the next menu item each time; the doll holds one at a time.
  const order = () => {
    holdItem(venue.menu[next.current % venue.menu.length]);
    next.current += 1;
  };
  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.fog, 9, 26]} />
      <hemisphereLight args={[palette.sky, palette.ground, 0.7]} />
      <pointLight
        position={[0, 3.2, 1.5]}
        color={palette.light}
        intensity={4}
        distance={9}
      />
      <Floor
        width={8}
        depth={6}
        center={[0, 2.4]}
        color={palette.floor}
        onPick={onPick}
      />
      <PortalPads room={ROOMS[palette.room]} color={palette.accent} />
      <mesh position={[0, 2, -2.2]}>
        <boxGeometry args={[8.4, 4, 0.2]} />
        <meshStandardMaterial color={palette.wall} />
      </mesh>
      <mesh position={[-4.2, 2, 2.4]}>
        <boxGeometry args={[0.2, 4, 6.4]} />
        <meshStandardMaterial color={palette.wall} />
      </mesh>
      <mesh position={[4.2, 2, 2.4]}>
        <boxGeometry args={[0.2, 4, 6.4]} />
        <meshStandardMaterial color={palette.wall} />
      </mesh>
      <mesh position={[0, 0.55, -0.85]}>
        <boxGeometry args={[6, 1.1, 0.6]} />
        <meshStandardMaterial color={palette.counter} />
      </mesh>
      <mesh position={[0, 1.13, -0.85]}>
        <boxGeometry args={[6.2, 0.08, 0.7]} />
        <meshStandardMaterial
          color={palette.accent}
          emissive={palette.accent}
          emissiveIntensity={0.4}
        />
      </mesh>
      <NeonText
        text={venue.name.toUpperCase()}
        color={palette.accent}
        font={MARQUEE}
        width={5.6}
        position={[0, 3.2, -2.05]}
      />
      <TalkingNpc
        name={staff.name}
        role={staff.role}
        look={staff.look}
        mood="idle"
        at={[0, 0, -1.7]}
        rot={0}
        seed={staff.seed}
        situation="action-ordering"
        greet
        context={{ venue: palette.room }}
        onTap={order}
      />
      <Fitout palette={palette} />
      {children}
    </>
  );
}
