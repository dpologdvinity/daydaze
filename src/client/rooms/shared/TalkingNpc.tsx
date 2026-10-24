// The standard talking NPC: a doll (or a cheap CrowdFigure) with an invisible
// tap cylinder, a speech bubble for six seconds, and lines from pickLine for
// its role. Remembers its recent lines so taps rarely repeat; greets once per
// mount.

import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { DanceMoveId } from "../../../game/dance/moves.ts";
import type { Look, Mood } from "../../../game/look.ts";
import {
  loadDialogue,
  pickLine,
  type RecentLines,
} from "../../../game/dialogue/pick.ts";
import type {
  DialogueContext,
  DialogueRole,
  DialogueSituation,
} from "../../../game/dialogue/types.ts";
import { Doll } from "../../avatar/Doll.tsx";
import { CrowdFigure } from "./CrowdFigure.tsx";

const BUBBLE_MS = 6000;

/**
 * A standing doll that speaks from its dialogue role. It says `situation`
 * when tapped, and `greet` once when the player arrives. `onTap` runs after
 * the line, so a venue can hang an action on the tap. `figure="crowd"` swaps
 * the full doll for a cheap CrowdFigure, for background people.
 */
export function TalkingNpc({
  name,
  role,
  look,
  mood,
  dance,
  hold,
  at,
  rot,
  seed,
  figure = "doll",
  situation = "tapped",
  greet = false,
  context,
  onTap,
}: {
  name: string;
  role: DialogueRole;
  look: Look;
  mood: Mood;
  /** The move a dancing NPC loops (a dance or an emote such as "bartending"). */
  dance?: DanceMoveId;
  /** A held pose (STILL_CLIPS id) for the pose and sit moods. */
  hold?: string;
  at: readonly [number, number, number];
  rot: number;
  seed: number;
  figure?: "doll" | "crowd";
  situation?: DialogueSituation;
  greet?: boolean;
  context: DialogueContext;
  onTap?: () => void;
}) {
  const [line, setLine] = useState<string | null>(null);
  // lines this NPC said lately, so taps rarely repeat
  const recent = useRef<RecentLines>([]);
  const timer = useRef(0);
  const say = (when: DialogueSituation) => {
    // the line banks load lazily; a failed load is retried on the next tap
    loadDialogue().then(() => {
      const picked = pickLine({
        role,
        situation: when,
        context,
        rng: Math.random,
        recent: recent.current,
      });
      recent.current = picked.recent;
      setLine(picked.text);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setLine(null), BUBBLE_MS);
    }, ignore);
  };
  // greet once per mount: a room arrival, not every render (the latest
  // `say` is read through a ref, so a re-render never greets again)
  const sayNow = useRef(say);
  useEffect(() => {
    sayNow.current = say;
  });
  const greets = useRef(greet);
  useEffect(() => {
    const pending = timer;
    if (greets.current) sayNow.current("greeting-first");
    return () => window.clearTimeout(pending.current);
  }, []);
  const tap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    say(situation);
    onTap?.();
  };
  return (
    <group position={[at[0], at[1], at[2]]} rotation-y={rot}>
      {figure === "doll" ? (
        <Doll look={look} mood={mood} dance={dance} hold={hold} seed={seed} />
      ) : (
        <CrowdFigure
          look={look}
          dance={mood === "dance"}
          move={dance}
          seed={seed}
        />
      )}
      {/* a see-through tap target around the doll */}
      <mesh position={[0, 0.95, 0]} onClick={tap}>
        <cylinderGeometry args={[0.5, 0.5, 1.9, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {line && (
        <Html position={[0, 2.25, 0]} center>
          <p className="bubble">
            <strong>{name}: </strong>
            {line}
          </p>
        </Html>
      )}
    </group>
  );
}

const ignore = () => {};
