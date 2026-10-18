import type { JSX, ReactNode } from "react";
import { useRef } from "react";
import { HdriLight } from "../shared/HdriLight.tsx";
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
import {
  FOOD_CHAIR_HEIGHT,
  FOOD_DINERS,
  FOOD_TABLES,
} from "../../../game/seats.ts";
import { Doll } from "../../avatar/Doll.tsx";
import { surface } from "../../city/worldTexture.ts";

/** Regulars at the tables; each room seats a different pair. */
const DINER_LOOKS: readonly Look[] = (
  [
    ["#f3d4c4", "mid-wavy", "#b77a3e", "blouse", "#e8e2ff"],
    ["#94603f", "braids", "#1b1014", "jeans", "#ff2f9a"],
    ["#c48d68", "sleek-bob", "#1b1014", "baby-tee-mini", "#3fe0d0"],
    ["#633c29", "curl-cloud", "#4a2a1c", "shorts", "#ffb02e"],
    ["#e6b48e", "shag", "#ff4fb3", "jeans", "#9b5cff"],
    ["#f3d4c4", "low-pony", "#f1d78f", "blouse", "#141018"],
  ] as const
).map(([skin, hairStyle, hairColor, outfit, outfitColor]) => ({
  skin,
  hairStyle,
  hairColor,
  outfit,
  outfitColor,
  lips: "lips-nude-pink-gloss",
  brows: "brows-feathered-honey",
  shadow: "#ffd1f0",
}));

/** Two regulars sitting at the tables, facing across them. */
function Diners({ room }: { room: RoomId }) {
  const base = [...room].reduce((h, c) => h + c.charCodeAt(0), 0);
  return (
    <>
      {FOOD_DINERS.map((d, i) => {
        const [x, z] = FOOD_TABLES[d.table];
        return (
          <group
            key={i}
            // a chair's height, less where a sitting doll's thighs come to
            position={[x + d.side * 0.75, FOOD_CHAIR_HEIGHT - 0.48, z]}
            rotation-y={(-d.side * Math.PI) / 2}
          >
            <Doll
              look={DINER_LOOKS[(base + i * 3) % DINER_LOOKS.length]}
              mood="sit"
              // facing across the table: one leans in, one talks
              hold={i % 2 ? "sit-chatting" : "sit-at-table"}
              seed={base + i}
            />
          </group>
        );
      })}
    </>
  );
}

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
  // painted plaster walls; a counter front of glazed tiles in its color
  const wall = surface("painted_plaster_wall", {
    scale: 0.6,
    color: palette.wall,
  });
  const counter = surface("rounded_square_tiled_wall", {
    scale: 1.5,
    color: palette.counter,
    roughness: 0.4,
  });
  const next = useRef(0);
  // The staff hands over the next menu item each time; the doll holds one at a time.
  const order = () => {
    holdItem(venue.menu[next.current % venue.menu.length]);
    next.current += 1;
  };
  return (
    <>
      <color attach="background" args={[palette.background]} />
      <HdriLight file="anniversary_lounge" intensity={0.4} />
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
      <mesh position={[0, 2, -2.2]} material={wall}>
        <boxGeometry args={[8.4, 4, 0.2]} />
      </mesh>
      <mesh position={[-4.2, 2, 2.4]} material={wall}>
        <boxGeometry args={[0.2, 4, 6.4]} />
      </mesh>
      <mesh position={[4.2, 2, 2.4]} material={wall}>
        <boxGeometry args={[0.2, 4, 6.4]} />
      </mesh>
      <mesh position={[0, 0.55, -0.85]} material={counter}>
        <boxGeometry args={[6, 1.1, 0.6]} />
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
      <Diners room={palette.room} />
      {children}
    </>
  );
}
