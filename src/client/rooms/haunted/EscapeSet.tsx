// The haunted escape, walked: while a run is on, the front hall of the house
// is dressed as the run's current room (hauntedSets.ts: parlor, nursery,
// library and so on, each its own colors and furniture), with three doors
// in the wall ahead. The doll walks to the door you pick; the right one
// swings open and the hall fades into the next room; a wrong one plays a
// scare right there (a doll's head turns, the candles go out, a sheet
// slides off a chair, a rocking chair rocks, a portrait's eyes light, a
// music box opens) with a stinger. Reduced motion softens every scare. The
// session (escapeSession.ts) keeps the run.

import { claimSeat, releaseSeat } from "../shared/game3d/seatClaim.ts";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { playCreak, playStinger } from "../../../audio/worldSounds.ts";
import { roomSet, type RoomSet } from "../../../game/hauntedSets.ts";
import type { Vec3 } from "../../../game/motion/ball.ts";
import { useReducedMotion } from "../../motion.ts";
import type { Player } from "../../world/PlayerController.tsx";
import { useGameShot } from "../shared/game3d/useGameShot.ts";
import { hdr } from "../shared/materials.ts";
import { escape, SCARE, THROUGH, WALK } from "./escapeSession.ts";

/** The wall the doors are in, the doors' x, and where she stands. */
const WALL_Z = 1.22;
const DOOR_X = [-1.6, 0.8, 3.2] as const;
const CENTER: Vec3 = [0.8, 0, 3.6];
const DOOR_W = 1;
const DOOR_H = 2.1;

/** Each set's palette (rug, drapes, accent) and furniture. */
const SETS: Record<
  RoomSet,
  { rug: string; drape: string; accent: string; props: readonly Prop[] }
> = {
  parlor: {
    rug: "#5a1a2a",
    drape: "#3a0a1a",
    accent: "#c9a26a",
    props: ["sofa", "table", "clock"],
  },
  nursery: {
    rug: "#3a4a5a",
    drape: "#5a4a6a",
    accent: "#e8c8d8",
    props: ["crib", "horse", "shelf"],
  },
  library: {
    rug: "#2a1a10",
    drape: "#1a2a1a",
    accent: "#c9a26a",
    props: ["shelf", "shelf2", "table"],
  },
  dining: {
    rug: "#3a1a10",
    drape: "#2a0a0a",
    accent: "#e8e0d0",
    props: ["longtable", "clock"],
  },
  bedroom: {
    rug: "#2a2a3a",
    drape: "#4a2a4a",
    accent: "#e8e0f0",
    props: ["bed", "wardrobe"],
  },
  attic: {
    rug: "#4a3a2a",
    drape: "#3a3020",
    accent: "#a08060",
    props: ["crates", "trunk", "horse"],
  },
  chapel: {
    rug: "#2a0a1a",
    drape: "#1a1030",
    accent: "#ffd8a0",
    props: ["pews", "altar"],
  },
  conservatory: {
    rug: "#1a2a1a",
    drape: "#203a20",
    accent: "#9fd08a",
    props: ["plants", "table"],
  },
};
type Prop =
  | "sofa"
  | "table"
  | "clock"
  | "crib"
  | "horse"
  | "shelf"
  | "shelf2"
  | "longtable"
  | "bed"
  | "wardrobe"
  | "crates"
  | "trunk"
  | "pews"
  | "altar"
  | "plants";

/** Where each piece stands in the hall: [x, z, w, h, d]. */
const PLACES: Record<Prop, [number, number, number, number, number]> = {
  sofa: [-4.8, 3.2, 0.9, 0.8, 2],
  table: [5.2, 3.6, 1, 0.75, 1],
  clock: [6.4, 1.8, 0.5, 2, 0.4],
  crib: [-4.8, 3.4, 1.4, 0.9, 0.8],
  horse: [5.2, 4.2, 0.9, 0.9, 0.35],
  shelf: [-6.6, 3, 0.4, 2.2, 2],
  shelf2: [6.6, 3, 0.4, 2.2, 2],
  longtable: [-4.6, 3.6, 1.2, 0.75, 3],
  bed: [-4.8, 3.6, 1.6, 0.6, 2.1],
  wardrobe: [6.2, 2.4, 0.7, 2.2, 1.3],
  crates: [-5.2, 4, 1, 0.8, 1],
  trunk: [5, 2.4, 1.1, 0.6, 0.6],
  pews: [-4.6, 3.4, 2.6, 0.9, 0.5],
  altar: [6, 2.2, 0.8, 1.1, 1.8],
  plants: [-5.6, 3.6, 0.8, 1.6, 0.8],
};

/** The scare props, the same in every set. */
const DOLL: Vec3 = [-0.4, 1.25, WALL_Z + 0.25];
const CANDLES: readonly Vec3[] = [
  [-2.5, 1.6, WALL_Z + 0.15],
  [2, 1.5, WALL_Z + 0.15],
  [4.1, 1.6, WALL_Z + 0.15],
];
const SHEET_CHAIR: Vec3 = [-2.6, 0, 2.6];
const ROCKER: Vec3 = [4.1, 0, 2.7];
const PORTRAIT: Vec3 = [2, 2.45, WALL_Z + 0.03];
const MUSIC_BOX: Vec3 = [-0.4, 0.72, 1.75];
/** Where a set's furniture stands, in view: [x, z] for its 1st..3rd piece. */
const SLOTS: readonly [number, number][] = [
  [-3.2, 1.75],
  [4.7, 1.8],
];

const FLAME = hdr("#ffb24a", 2.6);
const EYES = hdr("#ff3f5a", 3);
const DIM = new THREE.Color("#2a2028");

/** 0..1 through a scare of `kind` that's playing; -1 when another is. */
function scareProgress(kind: string, now: number): number {
  const s = escape.get();
  if (s.phase !== "scare" || s.scare?.kind !== kind) return -1;
  return Math.min(1, (now - s.since) / 1000 / SCARE);
}

/** The three doors: frames with a dim glow, slabs that swing open. */
function Doors() {
  const slabs = useRef<(THREE.Group | null)[]>([]);
  const calm = useReducedMotion();
  useFrame(() => {
    const s = escape.get();
    const t = (performance.now() - s.since) / 1000;
    DOOR_X.forEach((_, i) => {
      const g = slabs.current[i];
      if (!g) return;
      const chosen = i === s.door;
      // the chosen door swings open as she arrives, and stays open
      // through a scare or the fade
      const open =
        chosen && s.phase === "walk"
          ? Math.max(0, (t - WALK * 0.6) / (WALK * 0.4))
          : chosen && (s.phase === "scare" || s.phase === "through")
            ? 1
            : 0;
      g.rotation.y = -Math.min(1, open) * (calm ? 0.9 : 1.6);
    });
  });
  return (
    <>
      {DOOR_X.map((x, i) => (
        <group key={x} position={[x, 0, WALL_Z + 0.05]}>
          {/* the frame: two posts and a lintel, faintly lit */}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[(side * (DOOR_W + 0.12)) / 2, DOOR_H / 2, 0]}
            >
              <boxGeometry args={[0.1, DOOR_H + 0.1, 0.12]} />
              <meshStandardMaterial
                color="#3a2618"
                emissive="#ff7a3d"
                emissiveIntensity={0.08}
              />
            </mesh>
          ))}
          <mesh position={[0, DOOR_H + 0.05, 0]}>
            <boxGeometry args={[DOOR_W + 0.22, 0.12, 0.12]} />
            <meshStandardMaterial color="#3a2618" />
          </mesh>
          {/* the dark beyond, and the slab hinged at its left edge */}
          <mesh position={[0, DOOR_H / 2, -0.04]}>
            <planeGeometry args={[DOOR_W, DOOR_H]} />
            <meshBasicMaterial color="#05030a" />
          </mesh>
          <group
            ref={(g) => {
              slabs.current[i] = g;
            }}
            position={[-DOOR_W / 2, 0, 0.02]}
          >
            <mesh position={[DOOR_W / 2, DOOR_H / 2, 0]}>
              <boxGeometry args={[DOOR_W, DOOR_H, 0.05]} />
              <meshStandardMaterial color="#4a2e1c" roughness={0.8} />
            </mesh>
            <mesh position={[DOOR_W - 0.12, DOOR_H / 2, 0.05]}>
              <sphereGeometry args={[0.04, 8, 6]} />
              <meshStandardMaterial
                color="#c9a26a"
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}

/** The set's rug, drapes and furniture, in its palette. */
function Dressing({ set }: { set: RoomSet }) {
  const look = SETS[set];
  return (
    <>
      <mesh position={[0.8, 0.012, 2.6]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[8.4, 2.6]} />
        <meshStandardMaterial color={look.rug} roughness={0.95} />
      </mesh>
      {/* curtains in the set's color, flanking the doors */}
      {[-2.75, 4.35].map((x) => (
        <mesh key={x} position={[x, 1.35, WALL_Z + 0.08]}>
          <boxGeometry args={[0.8, 2.7, 0.06]} />
          <meshStandardMaterial color={look.drape} roughness={1} />
        </mesh>
      ))}
      {look.props.map((p, i) => {
        const [, , w0, h0, d0] = PLACES[p];
        const slot = SLOTS[i];
        if (!slot) return null;
        const [x, z] = slot;
        // squeezed to fit its slot by the wall
        const w = Math.min(w0, 1.1);
        const h = Math.min(h0, 1.8);
        const d = Math.min(d0, 0.6);
        return (
          <mesh key={p} position={[x, h / 2, z]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial
              color={
                p.startsWith("shelf") || p === "wardrobe" || p === "clock"
                  ? "#3a2618"
                  : look.accent
              }
              roughness={0.8}
            />
          </mesh>
        );
      })}
    </>
  );
}

/** The scare props and what each does when its scare plays. */
function Scares() {
  const calm = useReducedMotion();
  const head = useRef<THREE.Group>(null);
  const flames = useRef<(THREE.Mesh | null)[]>([]);
  const sheet = useRef<THREE.Mesh>(null);
  const sheetMat = useRef<THREE.MeshStandardMaterial>(null);
  const rocker = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.MeshBasicMaterial>(null);
  const lid = useRef<THREE.Mesh>(null);
  const stung = useRef(0);
  useFrame(({ clock }) => {
    const now = performance.now();
    const s = escape.get();
    // a stinger as each scare starts
    if (s.phase === "scare" && stung.current !== s.since) {
      stung.current = s.since;
      playStinger();
    }
    // the doll's head swivels round to face you (slowly, under reduced motion)
    const d = scareProgress("doll-head", now);
    if (head.current)
      head.current.rotation.y =
        d < 0 ? Math.PI : Math.PI * (1 - Math.min(1, d * (calm ? 1.2 : 6)));
    // the candles gutter out (dim gradually, under reduced motion)
    const c = scareProgress("candles-out", now);
    flames.current.forEach((f, i) => {
      if (!f) return;
      const out = c < 0 ? 0 : calm ? Math.min(1, c * 2) : c > i * 0.05 ? 1 : 0;
      f.scale.setScalar(1 - out * 0.95);
    });
    // the sheet slides off the chair (fades away, under reduced motion)
    const sh = scareProgress("sheet-slide", now);
    if (sheet.current && sheetMat.current) {
      const k = sh < 0 ? 0 : Math.min(1, sh * 2.5);
      sheet.current.position.x = SHEET_CHAIR[0] + (calm ? 0 : k * 0.8);
      sheet.current.position.y = 0.75 - (calm ? 0 : k * 0.7);
      sheetMat.current.opacity = calm ? 1 - k : 1;
    }
    // the rocking chair rocks by itself
    const r = scareProgress("rocking-chair", now);
    if (rocker.current)
      rocker.current.rotation.x =
        r < 0
          ? 0
          : Math.sin(clock.elapsedTime * 3) * (calm ? 0.06 : 0.22) * (1 - r);
    // the portrait's eyes light up
    const p = scareProgress("portrait-eyes", now);
    eyes.current?.color.copy(p < 0 ? DIM : EYES);
    // the music box lid lifts
    const m = scareProgress("music-box", now);
    if (lid.current)
      lid.current.rotation.x = m < 0 ? 0 : -Math.min(1, m * 4) * 1.2;
  });
  return (
    <>
      {/* a porcelain doll on a little shelf, its head facing the wall */}
      <mesh position={[DOLL[0], DOLL[1] - 0.12, DOLL[2]]}>
        <boxGeometry args={[0.5, 0.04, 0.25]} />
        <meshStandardMaterial color="#3a2618" />
      </mesh>
      <mesh position={[DOLL[0], DOLL[1] + 0.05, DOLL[2]]}>
        <coneGeometry args={[0.1, 0.3, 10]} />
        <meshStandardMaterial color="#e8c8d8" />
      </mesh>
      <group
        ref={head}
        position={[DOLL[0], DOLL[1] + 0.28, DOLL[2]]}
        rotation-y={Math.PI}
      >
        <mesh>
          <sphereGeometry args={[0.08, 12, 10]} />
          <meshStandardMaterial color="#f6eee8" roughness={0.3} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.03, 0.015, 0.072]}>
            <sphereGeometry args={[0.013, 6, 4]} />
            <meshBasicMaterial color="#1a1020" />
          </mesh>
        ))}
      </group>
      {/* candles on wall sconces */}
      {CANDLES.map((at, i) => (
        <group key={i} position={at}>
          <mesh position-y={-0.1}>
            <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
            <meshStandardMaterial color="#f4ecd8" />
          </mesh>
          <mesh
            ref={(m) => {
              flames.current[i] = m;
            }}
            position-y={0.03}
          >
            <coneGeometry args={[0.025, 0.07, 8]} />
            <meshBasicMaterial color={FLAME} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* a chair under a dust sheet */}
      <mesh position={[SHEET_CHAIR[0], 0.25, SHEET_CHAIR[2]]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#3a2618" />
      </mesh>
      <mesh ref={sheet} position={[SHEET_CHAIR[0], 0.75, SHEET_CHAIR[2]]}>
        <boxGeometry args={[0.62, 0.55, 0.62]} />
        <meshStandardMaterial
          ref={sheetMat}
          color="#ecebe6"
          roughness={1}
          transparent
        />
      </mesh>
      {/* a rocking chair, rockers and all */}
      <group ref={rocker} position={ROCKER}>
        <mesh position-y={0.45}>
          <boxGeometry args={[0.55, 0.06, 0.5]} />
          <meshStandardMaterial color="#5a3a24" />
        </mesh>
        <mesh position={[0, 0.85, -0.22]}>
          <boxGeometry args={[0.55, 0.8, 0.05]} />
          <meshStandardMaterial color="#5a3a24" />
        </mesh>
        {[-0.25, 0.25].map((x) => (
          <mesh key={x} position={[x, 0.1, 0]} rotation-y={Math.PI / 2}>
            <torusGeometry args={[0.45, 0.025, 4, 16, Math.PI / 3]} />
            <meshStandardMaterial color="#5a3a24" />
          </mesh>
        ))}
      </group>
      {/* a portrait whose eyes can light */}
      <group position={PORTRAIT}>
        <mesh>
          <boxGeometry args={[0.8, 1, 0.05]} />
          <meshStandardMaterial color="#5a3a24" />
        </mesh>
        <mesh position-z={0.03}>
          <planeGeometry args={[0.62, 0.82]} />
          <meshStandardMaterial color="#2a2030" />
        </mesh>
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 0.12, 0.035]}>
            <circleGeometry args={[0.025, 10]} />
            <meshBasicMaterial
              ref={x < 0 ? eyes : undefined}
              color={DIM}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      {/* a music box on a little stand under the doll */}
      <mesh position={[MUSIC_BOX[0], (MUSIC_BOX[1] - 0.02) / 2, MUSIC_BOX[2]]}>
        <boxGeometry args={[0.5, MUSIC_BOX[1] - 0.02, 0.4]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.8} />
      </mesh>
      <group position={MUSIC_BOX}>
        <mesh position-y={0.06}>
          <boxGeometry args={[0.24, 0.12, 0.16]} />
          <meshStandardMaterial color="#c9a26a" />
        </mesh>
        <mesh ref={lid} position={[0, 0.12, -0.08]}>
          <boxGeometry args={[0.24, 0.02, 0.16]} />
          <meshStandardMaterial color="#e8c8d8" />
        </mesh>
      </group>
    </>
  );
}

/** A black veil between the camera and the hall while it changes rooms. */
function Fade({ eye }: { eye: Vec3 }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const s = escape.get();
    const t = (performance.now() - s.since) / 1000 / THROUGH;
    if (!mat.current) return;
    // out to black going through, back in as the next room's choice begins
    mat.current.opacity =
      s.phase === "through"
        ? Math.min(1, t * 2)
        : s.phase === "choose"
          ? Math.max(0, 1 - t * 2)
          : 0;
  });
  return (
    <mesh position={[eye[0], eye[1], eye[2] - 0.6]}>
      <planeGeometry args={[4, 3]} />
      <meshBasicMaterial
        ref={mat}
        color="#000000"
        transparent
        opacity={0}
        depthTest={false}
      />
    </mesh>
  );
}

/** The escape set in the house's front hall, while a run is on. */
export function EscapeSet({ player }: { player: Player }) {
  const s = escape.use();
  const on = s.phase !== "off";
  // the set changes under the black, as the next room's choice begins
  const depth = s.phase === "through" ? s.run.depth - 1 : s.run.depth;
  const set = roomSet(s.run.seed, Math.max(0, depth));
  const eye = useMemo<Vec3>(() => [0.8, 2.6, 5.85], []);
  const target = useMemo<Vec3>(() => [0.8, 1.15, 1.2], []);
  useGameShot("haunted", on, eye, target);
  // her walk: to the chosen door, then back to the middle
  const took = useRef<GameSeat | null>(null);
  useEffect(
    () => () => {
      if (took.current) releaseSeat(player, took.current);
    },
    [player],
  );
  const creaked = useRef(0);
  useFrame((_, dt) => {
    const st = escape.get();
    if (st.phase === "off") {
      if (took.current) {
        releaseSeat(player, took.current);
        took.current = null;
      }
      return;
    }
    if (!took.current) {
      const mine: GameSeat = {
        position: new THREE.Vector3(...CENTER),
        yaw: Math.PI,
        stride: false,
      };
      if (!claimSeat(player, mine)) return;
      took.current = mine;
    }
    const seat = took.current;
    if (!seat || player.seat !== seat) return;
    const gx = st.phase === "walk" ? (DOOR_X[st.door] ?? 0) : CENTER[0];
    const gz = st.phase === "walk" ? WALL_Z + 0.7 : CENTER[2];
    if (
      st.phase === "walk" &&
      creaked.current !== st.since &&
      performance.now() - st.since > WALK * 600
    ) {
      creaked.current = st.since;
      playCreak();
    }
    const dx = gx - seat.position.x;
    const dz = gz - seat.position.z;
    const d = Math.hypot(dx, dz);
    const step = 2.2 * dt;
    // through a door: she's back in the middle of the next room at once
    if (st.phase === "through") {
      seat.position.set(CENTER[0], 0, CENTER[2]);
      seat.yaw = Math.PI;
      seat.stride = false;
      return;
    }
    seat.stride = d > 0.05;
    if (d > step) {
      seat.position.x += (dx / d) * step;
      seat.position.z += (dz / d) * step;
      seat.yaw = Math.atan2(dx, dz);
    } else {
      seat.position.x = gx;
      seat.position.z = gz;
      seat.yaw = Math.PI;
    }
  });
  const canvas = useThree((st) => st.gl.domElement);
  useEffect(() => {
    canvas.dataset.hauntedSet = on ? set : "none";
    canvas.dataset.hauntedScare =
      s.phase === "scare" ? (s.scare?.kind ?? "") : "none";
  }, [canvas, on, set, s.phase, s.scare]);
  if (!on) return null;
  return (
    <>
      <Dressing set={set} />
      <Doors />
      <Scares />
      <Fade eye={eye} />
    </>
  );
}

/** The seat a game puts the player on. */
type GameSeat = NonNullable<Player["seat"]>;
