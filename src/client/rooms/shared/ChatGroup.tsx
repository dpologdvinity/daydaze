// A standing conversation: two to four dolls in a small ring facing each
// other, one talking at a time with her hands, the others listening and now
// and then nodding, laughing or shaking their heads, each at a moment of her
// own (game/dance/conversation.ts). Pure scenery: no taps, no lines. A venue
// or a sidewalk drops one in with a spot, a seed and the people's looks.

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { beatAt, type Group } from "../../../game/dance/conversation.ts";
import { isDanceMoveId, type DanceMoveId } from "../../../game/dance/moves.ts";
import type { Look } from "../../../game/look.ts";
import { Doll } from "../../avatar/Doll.tsx";
import { useReducedMotion } from "../../motion.ts";

/** Meters from the middle to each person: closer for a pair, wider for more. */
const RING = [0, 0, 0.55, 0.65, 0.75] as const;

/** One member: re-reads her beat only when the last one has run out. */
function Member({
  look,
  group,
  member,
  still,
  seed,
}: {
  look: Look;
  group: Group;
  member: number;
  still: boolean;
  seed: number;
}) {
  const [move, setMove] = useState<DanceMoveId | undefined>(undefined);
  const until = useRef(-Infinity);
  useFrame(({ clock }) => {
    if (still) return;
    // each group is a few minutes into its talk when it comes into view
    const t = clock.elapsedTime + group.seed * 13.7;
    if (t < until.current) return;
    const beat = beatAt(group, member, t);
    until.current = beat.until;
    const next = beat.clip && isDanceMoveId(beat.clip) ? beat.clip : undefined;
    if (next !== move) setMove(next);
  });
  return (
    <Doll look={look} mood={move ? "dance" : "idle"} dance={move} seed={seed} />
  );
}

/**
 * A conversation of `looks.length` people (two to four) around the floor
 * point `at`, facing in, starting at ring angle `turn` (radians). `seed` fixes
 * the group's tone and turns.
 */
export function ChatGroup({
  at,
  y = 0,
  seed,
  looks,
  turn = 0,
}: {
  at: readonly [number, number];
  y?: number;
  seed: number;
  looks: readonly Look[];
  turn?: number;
}) {
  const reduced = useReducedMotion();
  const size = Math.min(4, Math.max(2, looks.length));
  const group: Group = { seed, size };
  const r = RING[size] ?? 0.65;
  return (
    <group position={[at[0], y, at[1]]}>
      {looks.slice(0, size).map((look, m) => {
        const a = turn + (m / size) * Math.PI * 2;
        const ox = Math.sin(a) * r;
        const oz = Math.cos(a) * r;
        return (
          <group
            key={m}
            position={[ox, 0, oz]}
            // she faces the middle of the ring
            rotation-y={Math.atan2(-ox, -oz)}
          >
            <Member
              look={look}
              group={group}
              member={m}
              still={reduced}
              seed={seed * 4 + m + 1}
            />
          </group>
        );
      })}
    </group>
  );
}
