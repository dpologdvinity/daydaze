import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { pickLine, type RecentLines } from "../../../game/dialogue/pick.ts";
import type {
  DialogueRole,
  DialogueSituation,
} from "../../../game/dialogue/types.ts";
import type { Look, Mood } from "../../../game/look.ts";
import type { RaceSession } from "../../../game/speedway/session.ts";
import { Doll } from "../../avatar/Doll.tsx";
import { driving } from "../../world/driving.ts";

type Local = {
  look: Look;
  mood: Mood;
  at: [number, number, number];
  rot: number;
  role: DialogueRole;
};

const LOCALS: readonly Local[] = [
  {
    // pit crew, by the garage door
    look: {
      skin: "#e6b48e",
      hairStyle: "buns",
      hairColor: "#b77a3e",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-y2k-thin",
      outfit: "flares",
      outfitColor: "#ffb02e",
      shadow: "#3fe0d0",
    },
    mood: "idle",
    at: [-12.6, 0, -6.6],
    rot: Math.PI / 2,
    role: "pit-crew",
  },
  {
    // pit crew, with the air gun
    look: {
      skin: "#94603f",
      hairStyle: "waves",
      hairColor: "#1b1014",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "fur",
      outfitColor: "#141018",
      shadow: "#8a5a3c",
    },
    mood: "idle",
    at: [-10.6, 0, -7.4],
    rot: Math.PI / 2,
    role: "pit-crew",
  },
];

// Staff who talk but stay simple: a box figure costs two draw calls, a doll about 57.
const STAFF: readonly {
  at: [number, number, number];
  rot: number;
  color: string;
  role: DialogueRole;
}[] = [
  // ticket booth, by the way out to the city
  {
    at: [7.4, 0, 3.2],
    rot: -Math.PI / 2,
    color: "#ff4fb3",
    role: "ticket-cashier",
  },
  // ride operator, at the arena rail
  {
    at: [19.2, 0, -2],
    rot: Math.PI / 2,
    color: "#4fe3ff",
    role: "ride-operator",
  },
];

const BUBBLE_MS = 4500;
const RACE_CHECK_MS = 200;
// The first local is the pit crew, who speaks when a race finishes.
const PIT_CREW = 0;
const STAFF_BASE = LOCALS.length;

/** Speedway staff: tap one and they talk; a finished race gets a pit-crew line. */
export function Locals() {
  const [said, setSaid] = useState<{ index: number; text: string } | null>(
    null,
  );
  // lines said lately, so taps rarely repeat
  const recent = useRef<RecentLines>([]);
  // the race that already got its line, so each race is said once
  const announced = useRef<RaceSession | null>(null);

  const say = useCallback((index: number, situation: DialogueSituation) => {
    const role =
      index < LOCALS.length
        ? LOCALS[index].role
        : STAFF[index - STAFF_BASE].role;
    const picked = pickLine({
      role,
      situation,
      context: { venue: "speedway" },
      rng: Math.random,
      recent: recent.current,
    });
    recent.current = picked.recent;
    setSaid({ index, text: picked.text });
  }, []);

  useEffect(() => {
    if (said === null) return;
    const id = window.setTimeout(() => setSaid(null), BUBBLE_MS);
    return () => window.clearTimeout(id);
  }, [said]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = driving.session;
      if (!s || s.kind !== "race" || s.race.phase !== "finished") return;
      if (announced.current === s) return;
      announced.current = s;
      say(PIT_CREW, "event-ride-ended");
    }, RACE_CHECK_MS);
    return () => window.clearInterval(id);
  }, [say]);

  const talk = (index: number, e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    say(index, "tapped");
  };

  const bubble = (index: number, sitting: boolean) =>
    said?.index === index && (
      <Html
        position={[0, sitting ? 1.75 : 2.05, 0]}
        center
        zIndexRange={[20, 10]}
      >
        <p className="bubble npc-bubble">{said.text}</p>
      </Html>
    );

  return (
    <>
      {LOCALS.map((l, i) => (
        <group key={i} position={l.at} rotation-y={l.rot}>
          <Doll
            look={l.look}
            mood={l.mood}
            seed={i + 31}
            onClick={(e) => talk(i, e)}
          />
          {bubble(i, false)}
        </group>
      ))}
      {STAFF.map((f, k) => {
        const index = STAFF_BASE + k;
        return (
          <group
            key={index}
            position={f.at}
            rotation-y={f.rot}
            onClick={(e) => talk(index, e)}
          >
            <mesh position={[0, 0.7, 0]}>
              <boxGeometry args={[0.5, 1.0, 0.3]} />
              <meshStandardMaterial color={f.color} roughness={0.6} />
            </mesh>
            <mesh position={[0, 1.4, 0]}>
              <boxGeometry args={[0.3, 0.3, 0.3]} />
              <meshStandardMaterial color="#e6b48e" roughness={0.6} />
            </mesh>
            {bubble(index, false)}
          </group>
        );
      })}
    </>
  );
}
