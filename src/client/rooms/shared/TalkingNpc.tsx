// The standard talking NPC: a doll (or a cheap CrowdFigure) with an invisible
// tap cylinder, a speech bubble for six seconds, and lines from pickLine for
// its role. Remembers its recent lines so taps rarely repeat; greets once per
// mount, as a stranger, a regular or someone back from afar by what it
// remembers of the player (game/npcMemory.ts), and uses their name once it
// knows them.

import { stateSituation } from "../../../game/effects/buzz.ts";
import { eventSituation } from "../../../game/events.ts";
import { PRIDE_CLUBS, prideNightOn } from "../../../game/prideNight.ts";
import { isRoomId, type RoomId } from "../../../game/rooms.ts";
import { dayOf } from "../../../game/challenges.ts";
import { greetingFor, nameFor, npcKey } from "../../../game/npcMemory.ts";
import { metNpc, npcDesk } from "../../ui/npcDesk.ts";
import { nightClock, prideClock } from "../../city/eventClocks.ts";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { isDanceMoveId, type DanceMoveId } from "../../../game/dance/moves.ts";
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
import { talkClipFor } from "../../../game/dance/idlePlan.ts";
import { getBuzz } from "../../effects/drunk.ts";
import { getMeters } from "../../effects/high.ts";
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
  floor,
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
  dance?: DanceMoveId | undefined;
  /** The venue whose floor a dancing crowd figure follows when she has no `dance` of her own. */
  floor?: RoomId | undefined;
  /** A held pose (STILL_CLIPS id) for the pose and sit moods. */
  hold?: string | undefined;
  at: readonly [number, number, number];
  rot: number;
  seed: number;
  figure?: "doll" | "crowd" | undefined;
  situation?: DialogueSituation | undefined;
  greet?: boolean | undefined;
  context: DialogueContext;
  onTap?: (() => void) | undefined;
}) {
  const [line, setLine] = useState<string | null>(null);
  // lines she has said, which moves her on to another way of talking
  const [said, setSaid] = useState(0);
  // lines this NPC said lately, so taps rarely repeat
  const recent = useRef<RecentLines>([]);
  const timer = useRef(0);
  const key = npcKey(context.venue, name);
  const say = (when: DialogueSituation) => {
    // an NPC that knows the player by now calls them by name
    const { memories, player } = npcDesk.get();
    const known = nameFor(memories[key], dayOf(Date.now()), player);
    const spoken = known ? { name: known, ...context } : context;
    // the line banks load lazily; a failed load is retried on the next tap
    loadDialogue().then(() => {
      const picked = pickLine({
        role,
        situation: when,
        context: spoken,
        rng: Math.random,
        recent: recent.current,
      });
      recent.current = picked.recent;
      setSaid((n) => n + 1);
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
  // the NPC's memory key as of the mount: the greeting is a once-per-mount thing
  const mountKey = useRef(key);
  useEffect(() => {
    const pending = timer;
    if (greets.current) {
      const memory = npcDesk.get().memories[mountKey.current];
      sayNow.current(greetingFor(memory, dayOf(Date.now())));
      metNpc(mountKey.current);
    }
    return () => window.clearTimeout(pending.current);
  }, []);
  const tap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // on a club night (or Pride night) here, people mostly talk about it; a
    // role with nothing to say about it falls back to its tapped lines
    const venue = context.venue;
    const event =
      venue && isRoomId(venue)
        ? eventSituation(
            venue,
            nightClock(),
            PRIDE_CLUBS.has(venue) && prideNightOn(prideClock()),
          )
        : null;
    // a player who is drunk, high or tripping gets the line for it first; the
    // meters stay 0 at 13+, so only 18+ players ever hear these
    const state = stateSituation(getMeters(), getBuzz());
    say(state ?? (event && Math.random() < 0.7 ? event : situation));
    onTap?.();
  };
  // a standing NPC gestures while her line is up (the social clip pack)
  const speaking = line !== null && mood === "idle" && figure === "doll";
  return (
    <group position={[at[0], at[1], at[2]]} rotation-y={rot}>
      {figure === "doll" ? (
        <Doll
          look={look}
          mood={speaking ? "dance" : mood}
          dance={speaking ? isTalkClip(talkClipFor(seed, said)) : dance}
          hold={hold}
          seed={seed}
        />
      ) : (
        <CrowdFigure
          look={look}
          dance={mood === "dance"}
          move={dance}
          floor={floor}
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

/** A talking clip id as the dance move the doll plays (undefined if unknown). */
function isTalkClip(id: string): DanceMoveId | undefined {
  return isDanceMoveId(id) ? id : undefined;
}
