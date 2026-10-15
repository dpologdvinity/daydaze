import type { ThreeElements } from "@react-three/fiber";
import { coupleSpots } from "../../game/dance/couple.ts";
import type { DanceMoveId } from "../../game/dance/moves.ts";
import type { Look } from "../../game/look.ts";
import { Doll } from "./Doll.tsx";

type CoupleProps = {
  /** Either partner: a player's look or an NPC's. */
  a: Look;
  b: Look;
  /** Ground point between the two partners. */
  centre: [number, number];
  /** Direction the pair faces, as a yaw in radians. */
  facing: number;
  /** Metres between the two partners. */
  gap?: number;
  move: DanceMoveId;
} & Omit<ThreeElements["group"], "children">;

/** Two dolls dancing a move together, facing each other with an offset pose. */
export function Couple({
  a,
  b,
  centre,
  facing,
  gap = 0.8,
  move,
  ...rest
}: CoupleProps) {
  const [lead, follow] = coupleSpots(centre, facing, gap);
  return (
    <group {...rest}>
      <Doll
        look={a}
        mood="dance"
        dance={move}
        couple="lead"
        seed={1}
        position={[lead.at[0], 0, lead.at[1]]}
        rotation-y={lead.yaw}
      />
      <Doll
        look={b}
        mood="dance"
        dance={move}
        couple="follow"
        seed={2}
        position={[follow.at[0], 0, follow.at[1]]}
        rotation-y={follow.yaw}
      />
    </group>
  );
}
