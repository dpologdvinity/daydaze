// What a weekly night does to its room while it's on (src/game/events.ts):
// the room's light takes on the night's color, and its decor fills the air:
// glow sticks bobbing, confetti and petals falling, hearts and balloons
// rising, stars twinkling overhead, lanterns, embers and fog drifting, a row
// of bunting across the ceiling, searchlights swinging. One draw call per
// kind of decor (a point cloud of little sprites, or a few additive beams),
// no real lights beyond one tinted hemisphere fill. The room checks the clock
// each half minute, so a night starting while you are in the room shows up.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  nightsAt,
  type ClubNight,
  type NightDecor as Decor,
} from "../../game/events.ts";
import { ROOMS, type RoomId } from "../../game/rooms.ts";
import { NIGHT_LOOKS } from "../../game/nightLook.ts";
import { nightClock } from "../city/eventClocks.ts";
import { useReducedMotion } from "../motion.ts";
import { useQuality } from "../world/quality.ts";
import { hdr } from "./shared/materials.ts";
import { Cannons, Lasers, NightGrade, type Hall } from "./NightSignature.tsx";
import { rand, shapeTexture, type Shape } from "./shared/nightSprites.ts";

/** How one kind of decor looks and moves. Speeds are meters a second, `y` is
 * the band it lives in as fractions of the room's air above the floor. */
type Look = {
  shape: Shape;
  colors: readonly string[];
  count: number;
  size: number;
  /** Rise (+) or fall (-). */
  vy: number;
  /** Sideways wander, meters. */
  drift: number;
  y: readonly [number, number];
  /** Brightness of the sprite (>1 blooms). */
  glow: number;
  opacity: number;
  /** A twinkle: how much the size pulses (0 none). */
  twinkle: number;
};

const NEON = ["#ff4fd8", "#4fe3ff", "#c3ff3d", "#ffd84f", "#9b5cff"];
const LOOKS: Record<Exclude<Decor, "spotlights" | "bunting">, Look> = {
  glowsticks: {
    shape: "bar",
    colors: NEON,
    count: 70,
    size: 0.34,
    vy: 0.05,
    drift: 0.5,
    y: [0.1, 0.6],
    glow: 2.6,
    opacity: 1,
    twinkle: 0.15,
  },
  uv: {
    shape: "dot",
    colors: ["#c3ff3d", "#ff4fd8", "#7a5cff", "#4fe3ff"],
    count: 90,
    size: 0.26,
    vy: 0.08,
    drift: 0.7,
    y: [0.05, 0.8],
    glow: 2.4,
    opacity: 0.9,
    twinkle: 0.4,
  },
  halos: {
    shape: "ring",
    colors: ["#7affff", "#ff7ad9", "#ffd84f"],
    count: 40,
    size: 0.5,
    vy: 0.12,
    drift: 0.9,
    y: [0.2, 0.9],
    glow: 2.2,
    opacity: 0.9,
    twinkle: 0.2,
  },
  confetti: {
    shape: "square",
    colors: NEON.concat(["#ffffff"]),
    count: 120,
    size: 0.14,
    vy: -0.45,
    drift: 0.8,
    y: [0.1, 1],
    glow: 1.2,
    opacity: 1,
    twinkle: 0,
  },
  hearts: {
    shape: "heart",
    colors: ["#ff7fb8", "#ff4f8b", "#ffb3d1", "#ffffff"],
    count: 50,
    size: 0.3,
    vy: 0.3,
    drift: 0.6,
    y: [0.05, 0.95],
    glow: 1.6,
    opacity: 0.95,
    twinkle: 0.1,
  },
  petals: {
    shape: "petal",
    colors: ["#ffb3d1", "#ffd0e0", "#ff94bd"],
    count: 100,
    size: 0.17,
    vy: -0.3,
    drift: 1.1,
    y: [0.1, 1],
    glow: 1.3,
    opacity: 1,
    twinkle: 0,
  },
  streamers: {
    shape: "bar",
    colors: ["#ff6b3d", "#ffd84f", "#ff4fa3", "#3fe0d0"],
    count: 90,
    size: 0.5,
    vy: -0.25,
    drift: 0.9,
    y: [0.1, 1],
    glow: 1.3,
    opacity: 1,
    twinkle: 0,
  },
  fireflies: {
    shape: "dot",
    colors: ["#ffe9a0", "#c9a3ff", "#fff6cc"],
    count: 60,
    size: 0.2,
    vy: 0.04,
    drift: 1.2,
    y: [0.1, 0.7],
    glow: 2.6,
    opacity: 1,
    twinkle: 0.7,
  },
  stars: {
    shape: "star",
    colors: ["#ffffff", "#bcd2ff", "#fff1c9"],
    count: 110,
    size: 0.3,
    vy: 0,
    drift: 0,
    y: [0.55, 1],
    glow: 2.4,
    opacity: 1,
    twinkle: 0.6,
  },
  fog: {
    shape: "dot",
    colors: ["#9dffb8", "#cbffe0"],
    count: 36,
    size: 3.2,
    vy: 0.02,
    drift: 1.4,
    y: [0, 0.14],
    glow: 0.7,
    opacity: 0.18,
    twinkle: 0,
  },
  balloons: {
    shape: "dot",
    colors: ["#ff8fb8", "#8fd8ff", "#ffe08f", "#c9a3ff", "#9dffc8"],
    count: 36,
    size: 0.55,
    vy: 0.2,
    drift: 0.5,
    y: [0.05, 0.9],
    glow: 1.3,
    opacity: 1,
    twinkle: 0,
  },
  lanterns: {
    shape: "dot",
    colors: ["#ff9a3d", "#ffc15f", "#ff6b3d"],
    count: 46,
    size: 0.5,
    vy: 0.06,
    drift: 0.7,
    y: [0.45, 0.95],
    glow: 2.2,
    opacity: 0.95,
    twinkle: 0.12,
  },
  embers: {
    shape: "dot",
    colors: ["#ff8a3d", "#ffd84f", "#ff5a2d"],
    count: 70,
    size: 0.14,
    vy: 0.55,
    drift: 0.5,
    y: [0, 0.8],
    glow: 3,
    opacity: 1,
    twinkle: 0.5,
  },
};

type Box = { x0: number; x1: number; z0: number; z1: number; air: number };

/** The room's floor extents and how much air it has above it. */
function boxOf(room: RoomId): Box {
  const xs = ROOMS[room].walkable.map(([x]) => x);
  const zs = ROOMS[room].walkable.map(([, z]) => z);
  return {
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    z0: Math.min(...zs),
    z1: Math.max(...zs),
    air: 4.2,
  };
}

/** A cloud of little sprites floating through the room. */
function Cloud({ look, box, low }: { look: Look; box: Box; low: boolean }) {
  const calm = useReducedMotion();
  const count = low ? Math.ceil(look.count / 2) : look.count;
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      c.set(look.colors[i % look.colors.length] ?? "#ffffff").multiplyScalar(
        look.glow,
      );
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [look, count]);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: shapeTexture(look.shape),
        size: look.size * 1.6,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: look.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [look],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (calm ? 0.25 : 1);
    const pos = geometry.getAttribute("position");
    const w = box.x1 - box.x0;
    const d = box.z1 - box.z0;
    const band = (look.y[1] - look.y[0]) * box.air;
    for (let i = 0; i < count; i++) {
      // rise or fall through the band, wrapping round
      const u =
        (((rand(i, 3) + (t * look.vy) / Math.max(band, 0.5)) % 1) + 1) % 1;
      const wob = look.drift * Math.sin(t * (0.4 + rand(i, 4) * 0.6) + i);
      pos.setXYZ(
        i,
        box.x0 + rand(i, 1) * w + wob,
        look.y[0] * box.air + u * band,
        box.z0 + rand(i, 2) * d + wob * 0.6,
      );
    }
    pos.needsUpdate = true;
    // twinkle: the whole cloud's size breathes
    if (look.twinkle > 0)
      material.size = look.size * 1.6 * (1 + look.twinkle * Math.sin(t * 3.1));
  });
  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  );
}

/** Searchlight beams that swing over the room. */
function Beams({ color, box }: { color: string; box: Box }) {
  const calm = useReducedMotion();
  const group = useRef<THREE.Group>(null);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: hdr(color, 1.4),
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [color],
  );
  const cone = useMemo(
    () => new THREE.ConeGeometry(1.1, box.air + 1, 18, 1, true),
    [box],
  );
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime * (calm ? 0.25 : 1);
    g.children.forEach((m, i) => {
      m.rotation.z = Math.sin(t * 0.7 + i * 1.7) * 0.5;
      m.rotation.x = Math.cos(t * 0.5 + i * 2.3) * 0.4;
    });
  });
  const mid = [(box.x0 + box.x1) / 2, (box.z0 + box.z1) / 2] as const;
  return (
    <group ref={group} position={[mid[0], box.air + 0.4, mid[1]]}>
      {[-0.35, -0.12, 0.12, 0.35].map((k, i) => (
        <mesh
          key={i}
          geometry={cone}
          material={material}
          position={[k * (box.x1 - box.x0), -(box.air + 1) / 2, 0]}
          rotation-x={Math.PI}
        />
      ))}
    </group>
  );
}

/** Rows of triangle flags strung across the room. */
function Bunting({ box }: { box: Box }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const flags = 44;
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const colors = ["#ff4f5e", "#ffd84f", "#3fe0d0", "#ff7ad9", "#9b5cff"];
    const strings = 3;
    const per = Math.floor(flags / strings);
    for (let s = 0; s < strings; s++)
      for (let k = 0; k < per; k++) {
        const u = (k + 0.5) / per;
        const z = box.z0 + ((s + 0.5) / strings) * (box.z1 - box.z0);
        o.position.set(
          box.x0 + u * (box.x1 - box.x0),
          box.air - 0.2 - Math.sin(u * Math.PI) * 0.6,
          z,
        );
        o.rotation.set(Math.PI, 0, Math.sin(u * 40) * 0.1);
        o.updateMatrix();
        m.setMatrixAt(s * per + k, o.matrix);
        m.setColorAt(
          s * per + k,
          c.set(colors[(k + s) % colors.length] ?? "#fff"),
        );
      }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [box]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, flags - (flags % 3)]}>
      <coneGeometry args={[0.2, 0.42, 3]} />
      <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/** The night on in `room` right now, or null; re-checked every half minute. */
function useNight(room: RoomId): ClubNight | null {
  const [night, setNight] = useState<ClubNight | null>(
    () => nightsAt(room, nightClock())[0] ?? null,
  );
  useEffect(() => {
    const check = () => setNight(nightsAt(room, nightClock())[0] ?? null);
    check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, [room]);
  return night;
}

/** How high each room's ceiling is, for the effects that hang from it. */
const CEILINGS: Partial<Record<RoomId, number>> = {
  galleria: 9,
  "sugar-rush": 4.2,
};

/** The decor of the night on in a room, and the tint it gives the light. */
export function NightDecor({ room }: { room: RoomId }) {
  const night = useNight(room);
  const low = useQuality() === "low";
  const box = useMemo(() => boxOf(room), [room]);
  const hall = useMemo<Hall>(
    () => ({ ...box, ceiling: CEILINGS[room] ?? box.air }),
    [box, room],
  );
  if (!night?.decor) return null;
  const kind = night.decor;
  const look = NIGHT_LOOKS[night.id];
  return (
    <>
      <hemisphereLight
        args={[look?.tintColor ?? night.color, "#000000", look?.tint ?? 0.85]}
        userData={{ nightKeep: true }}
      />
      {look && <NightGrade look={look} />}
      {look?.signature === "lasers" && (
        <>
          <Lasers hall={hall} />
          <Cannons hall={hall} low={low} />
        </>
      )}
      {kind === "spotlights" ? (
        <Beams color={night.color} box={box} />
      ) : kind === "bunting" ? (
        <Bunting box={box} />
      ) : (
        <Cloud look={LOOKS[kind]} box={box} low={low} />
      )}
    </>
  );
}
