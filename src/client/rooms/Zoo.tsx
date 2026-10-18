import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ROOMS } from "../../game/rooms.ts";
import {
  BOUNDS,
  HABITATS,
  loopAt,
  type Habitat,
  type Rect,
} from "../../game/zoo.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import { Batch } from "./shared/batch.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

const { x0, x1, z0, z1 } = BOUNDS;
const W = x1 - x0;
const D = z1 - z0;

// Every animal shares one vertex-colored material: the pattern (spots,
// stripes, a white belly) is painted into the vertices.
const SKIN = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
});

type Paint = (p: THREE.Vector3) => string;
const solid =
  (hex: string): Paint =>
  () =>
    hex;

/** A part of an animal: a geometry, posed, painted per vertex. */
function part(
  g: THREE.BufferGeometry,
  paint: Paint,
  at: [number, number, number] = [0, 0, 0],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...at),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...scale),
  );
  const out = (g.index ? g.toNonIndexed() : g).applyMatrix4(m);
  out.deleteAttribute("uv");
  const pos = out.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.set(paint(v.fromBufferAttribute(pos, i)));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  out.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return out;
}

const merge = (parts: THREE.BufferGeometry[]) => {
  const g = mergeGeometries(parts);
  if (!g) throw new Error("animal parts failed to merge");
  return g;
};

const cap = (r: number, len: number) =>
  new THREE.CapsuleGeometry(r, len, 4, 10);
const cyl = (r0: number, r1: number, h: number) =>
  new THREE.CylinderGeometry(r0, r1, h, 10);
const ball = (r: number) => new THREE.SphereGeometry(r, 14, 10);
/** A leg hanging from its hip at the origin, `len` long. */
const leg = (r: number, len: number, paint: Paint) =>
  part(cyl(r, r * 0.8, len), paint, [0, -len / 2, 0]);

type Body = {
  body: THREE.BufferGeometry;
  /** One diagonal pair of legs, and the other: they swing in turn. */
  legsA: THREE.BufferGeometry;
  legsB: THREE.BufferGeometry;
  hip: number;
};

/** Four legs at the hips' corners, as two diagonal pairs. */
function legs(
  r: number,
  len: number,
  hx: number,
  hz: number,
  paint: Paint,
): Pick<Body, "legsA" | "legsB"> {
  const one = leg(r, len, paint);
  const at = (x: number, z: number) => one.clone().translate(x, 0, z);
  return {
    legsA: merge([at(hx, hz), at(-hx, -hz)]),
    legsB: merge([at(-hx, hz), at(hx, -hz)]),
  };
}

const giraffePaint: Paint = (p) =>
  Math.sin(p.x * 9) * Math.sin(p.y * 7) * Math.sin(p.z * 8) > 0.15
    ? "#7a4a1a"
    : "#e8b04a";
function giraffe(): Body {
  return {
    body: merge([
      part(cap(0.42, 0.9), giraffePaint, [0, 0.4, 0], [Math.PI / 2, 0, 0]),
      part(cyl(0.11, 0.17, 1.9), giraffePaint, [0, 1.3, 0.65], [0.38, 0, 0]),
      part(
        cap(0.14, 0.32),
        solid("#e8b04a"),
        [0, 2.25, 1.2],
        [Math.PI / 2.4, 0, 0],
      ),
      part(cyl(0.02, 0.025, 0.16), solid("#5a3a1a"), [0.07, 2.42, 1.08]),
      part(cyl(0.02, 0.025, 0.16), solid("#5a3a1a"), [-0.07, 2.42, 1.08]),
      part(
        cyl(0.02, 0.03, 0.7),
        solid("#7a4a1a"),
        [0, 0.1, -0.85],
        [-0.4, 0, 0],
      ),
    ]),
    ...legs(0.07, 1.9, 0.22, 0.42, giraffePaint),
    hip: 1.9,
  };
}

const zebraPaint: Paint = (p) =>
  Math.sin((p.x * 0.4 + p.y + p.z * 0.3) * 18) > 0 ? "#141018" : "#f4f2ee";
function zebra(): Body {
  return {
    body: merge([
      part(cap(0.36, 0.75), zebraPaint, [0, 0.3, 0], [Math.PI / 2, 0, 0]),
      part(cyl(0.12, 0.18, 0.7), zebraPaint, [0, 0.65, 0.6], [0.7, 0, 0]),
      part(cap(0.12, 0.4), zebraPaint, [0, 0.82, 0.95], [Math.PI / 2.2, 0, 0]),
      part(
        new THREE.BoxGeometry(0.05, 0.12, 0.6),
        solid("#141018"),
        [0, 0.86, 0.55],
        [0.7, 0, 0],
      ),
      part(
        cyl(0.02, 0.04, 0.55),
        solid("#141018"),
        [0, 0.1, -0.7],
        [-0.3, 0, 0],
      ),
    ]),
    ...legs(0.06, 0.95, 0.2, 0.36, zebraPaint),
    hip: 0.95,
  };
}

const elephantPaint: Paint = (p) => (p.y < -0.6 ? "#6a6a72" : "#8a8a94");
function elephant(): Body {
  const trunk = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.75, 1.65),
      new THREE.Vector3(0, 0.3, 1.95),
      new THREE.Vector3(0, -0.4, 2.0),
      new THREE.Vector3(0, -0.85, 2.15),
    ]),
    12,
    0.12,
    8,
  );
  return {
    body: merge([
      part(ball(1), elephantPaint, [0, 0.45, 0], [0, 0, 0], [1.05, 0.95, 1.45]),
      part(ball(0.62), solid("#8a8a94"), [0, 0.95, 1.4]),
      part(trunk, solid("#7a7a84")),
      part(
        ball(0.5),
        solid("#9a8a94"),
        [0.62, 1.0, 1.15],
        [0, 0, 0],
        [0.25, 1, 0.9],
      ),
      part(
        ball(0.5),
        solid("#9a8a94"),
        [-0.62, 1.0, 1.15],
        [0, 0, 0],
        [0.25, 1, 0.9],
      ),
      part(
        new THREE.ConeGeometry(0.06, 0.6, 8),
        solid("#f4ecd8"),
        [0.25, 0.55, 1.95],
        [1.9, 0, 0],
      ),
      part(
        new THREE.ConeGeometry(0.06, 0.6, 8),
        solid("#f4ecd8"),
        [-0.25, 0.55, 1.95],
        [1.9, 0, 0],
      ),
      part(
        cyl(0.03, 0.05, 0.8),
        solid("#6a6a72"),
        [0, 0.1, -1.4],
        [-0.5, 0, 0],
      ),
    ]),
    ...legs(0.28, 1.4, 0.55, 0.85, solid("#7a7a84")),
    hip: 1.4,
  };
}

function lion(): Body {
  const fur = solid("#d8a050");
  return {
    body: merge([
      part(cap(0.34, 0.8), fur, [0, 0.25, 0], [Math.PI / 2, 0, 0]),
      part(
        ball(0.42),
        solid("#8a4a1a"),
        [0, 0.5, 0.62],
        [0, 0, 0],
        [1, 1, 0.8],
      ),
      part(ball(0.27), fur, [0, 0.5, 0.82]),
      part(ball(0.09), solid("#3a2a1a"), [0, 0.45, 1.08]),
      part(cyl(0.03, 0.04, 0.8), fur, [0, 0.25, -0.85], [-1.0, 0, 0]),
      part(ball(0.08), solid("#5a3a1a"), [0, 0.6, -1.15]),
    ]),
    ...legs(0.09, 0.75, 0.2, 0.38, fur),
    hip: 0.75,
  };
}

/** A penguin: black back, white front, orange beak and feet, one mesh. */
function penguin() {
  const coat: Paint = (p) => (p.z > 0.06 && p.y < 0.7 ? "#f4f4f8" : "#141018");
  return merge([
    part(ball(0.3), coat, [0, 0.4, 0], [0, 0, 0], [1, 1.45, 0.9]),
    part(ball(0.19), solid("#141018"), [0, 0.9, 0.02]),
    part(
      new THREE.ConeGeometry(0.05, 0.16, 8),
      solid("#ff8a3d"),
      [0, 0.88, 0.24],
      [Math.PI / 2, 0, 0],
    ),
    part(
      new THREE.BoxGeometry(0.12, 0.03, 0.18),
      solid("#ff8a3d"),
      [0.1, 0.02, 0.08],
    ),
    part(
      new THREE.BoxGeometry(0.12, 0.03, 0.18),
      solid("#ff8a3d"),
      [-0.1, 0.02, 0.08],
    ),
  ]);
}

/** A flamingo on one leg, its neck in an S. */
function flamingo() {
  const pink = solid("#ff7ab8");
  const neck = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.0, 0.25),
      new THREE.Vector3(0, 1.25, 0.15),
      new THREE.Vector3(0, 1.45, 0.35),
      new THREE.Vector3(0, 1.6, 0.25),
    ]),
    10,
    0.035,
    6,
  );
  return merge([
    part(ball(0.28), pink, [0, 0.95, 0], [0, 0, 0], [0.85, 0.7, 1.3]),
    part(neck, pink),
    part(ball(0.07), pink, [0, 1.63, 0.27]),
    part(
      new THREE.ConeGeometry(0.03, 0.14, 6),
      solid("#141018"),
      [0, 1.58, 0.38],
      [2.2, 0, 0],
    ),
    part(cyl(0.015, 0.015, 0.75), solid("#ff9ac8"), [0, 0.38, 0]),
  ]);
}

type Walker = {
  kind: "giraffe" | "zebra" | "elephant" | "lion";
  home: Habitat;
  speed: number;
  phase: number;
};
const WALKERS: readonly Walker[] = [
  { kind: "giraffe", home: "savanna", speed: 0.7, phase: 0 },
  { kind: "giraffe", home: "savanna", speed: 0.7, phase: 2.2 },
  { kind: "zebra", home: "savanna", speed: 1.1, phase: 1 },
  { kind: "zebra", home: "savanna", speed: 1.1, phase: 3.4 },
  { kind: "zebra", home: "savanna", speed: 1.1, phase: 4.8 },
  { kind: "elephant", home: "elephants", speed: 0.5, phase: 0 },
  { kind: "elephant", home: "elephants", speed: 0.5, phase: 3.1 },
  { kind: "lion", home: "lions", speed: 0.6, phase: 0.5 },
  { kind: "lion", home: "lions", speed: 0.6, phase: 3.6 },
];

/** The four-legged animals, each walking its habitat's loop. */
function Walkers() {
  const calm = useReducedMotion();
  const bodies = useMemo(
    () => ({
      giraffe: giraffe(),
      zebra: zebra(),
      elephant: elephant(),
      lion: lion(),
    }),
    [],
  );
  const groups = useRef<(THREE.Group | null)[]>([]);
  const legA = useRef<(THREE.Mesh | null)[]>([]);
  const legB = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = calm ? 0 : clock.elapsedTime;
    WALKERS.forEach((w, i) => {
      const g = groups.current[i];
      if (!g) return;
      const { at, yaw } = loopAt(HABITATS[w.home], t, w.speed, w.phase);
      g.position.set(at[0], 0, at[1]);
      g.rotation.y = yaw;
      const swing = Math.sin(t * w.speed * 5 + w.phase) * 0.35;
      legA.current[i]?.rotation.set(swing, 0, 0);
      legB.current[i]?.rotation.set(-swing, 0, 0);
    });
  });
  return (
    <>
      {WALKERS.map((w, i) => {
        const b = bodies[w.kind];
        return (
          <group
            key={i}
            ref={(g) => {
              groups.current[i] = g;
            }}
          >
            <group position-y={b.hip}>
              <mesh geometry={b.body} material={SKIN} />
              <mesh
                ref={(m) => {
                  legA.current[i] = m;
                }}
                geometry={b.legsA}
                material={SKIN}
              />
              <mesh
                ref={(m) => {
                  legB.current[i] = m;
                }}
                geometry={b.legsB}
                material={SKIN}
              />
            </group>
          </group>
        );
      })}
    </>
  );
}

/** Penguins waddling round their pool's edge, flamingos dipping in theirs. */
function Birds() {
  const calm = useReducedMotion();
  const geo = useMemo(() => ({ penguin: penguin(), flamingo: flamingo() }), []);
  const penguins = useRef<THREE.InstancedMesh>(null);
  const flamingos = useRef<THREE.InstancedMesh>(null);
  const PENGUINS = 6;
  const FLAMINGOS = 6;
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const t = calm ? 0 : clock.elapsedTime;
    const p = penguins.current;
    if (p) {
      for (let i = 0; i < PENGUINS; i++) {
        const { at, yaw } = loopAt(
          HABITATS.penguins,
          t,
          0.5,
          (i / PENGUINS) * Math.PI * 2,
        );
        o.position.set(at[0], 0.15, at[1]);
        o.rotation.set(0, yaw, Math.sin(t * 6 + i) * 0.12);
        o.updateMatrix();
        p.setMatrixAt(i, o.matrix);
      }
      p.instanceMatrix.needsUpdate = true;
    }
    const f = flamingos.current;
    if (f) {
      const h = HABITATS.flamingos;
      for (let i = 0; i < FLAMINGOS; i++) {
        o.position.set(
          h.x0 + 1 + (i % 3) * ((h.x1 - h.x0 - 2) / 2),
          0.05,
          h.z0 + 1.6 + Math.floor(i / 3) * 2.6,
        );
        // now and then one dips its head to feed
        const dip = Math.max(0, Math.sin(t * 0.6 + i * 1.7)) * 0.5;
        o.rotation.set(dip, i * 1.1, 0);
        o.updateMatrix();
        f.setMatrixAt(i, o.matrix);
      }
      f.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      <instancedMesh
        ref={penguins}
        args={[geo.penguin, SKIN, PENGUINS]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={flamingos}
        args={[geo.flamingo, SKIN, FLAMINGOS]}
        frustumCulled={false}
      />
    </>
  );
}

const SAND = surface("park_sand", { scale: 0.4, color: "#e8c890" });
const ROCK = surface("rock_face", { scale: 0.5, color: "#a09080" });
const WOOD = surface("wood_veneer", { scale: 1, color: "#8a6a4a" });
const WATER = new THREE.MeshStandardMaterial({
  color: "#3a9ac8",
  emissive: "#0a4a6a",
  emissiveIntensity: 0.4,
  roughness: 0.1,
  metalness: 0.2,
});
const LEAVES = new THREE.MeshStandardMaterial({
  color: "#3f8f3a",
  roughness: 0.8,
});
const BARK = surface("palm_bark", { scale: 1, color: "#8a6a4a" });

const SIGN_NAMES: Record<Habitat, string> = {
  savanna: "SAVANNA",
  elephants: "ELEPHANTS",
  lions: "PRIDE ROCK",
  penguins: "PENGUIN POOL",
  flamingos: "FLAMINGO POND",
};

/** A painted board for each habitat. */
function signTex() {
  const names = Object.values(SIGN_NAMES);
  return canvasTex(512, 64 * names.length, (ctx) => {
    names.forEach((n, i) => {
      ctx.fillStyle = "#2d6a4f";
      ctx.fillRect(0, i * 64, 512, 64);
      ctx.fillStyle = "#fff4d6";
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(n, 256, i * 64 + 46);
    });
  });
}

/** Habitat grounds, water, rocks, fences, trees and signs. */
function useGrounds(signs: THREE.Texture) {
  return useMemo(() => {
    const b = new Batch();
    const names = Object.keys(SIGN_NAMES);
    const board = new THREE.MeshBasicMaterial({ map: signs });
    const rect = (h: Rect, y: number, mat: THREE.Material) =>
      b.add(new THREE.BoxGeometry(h.x1 - h.x0, 0.04, h.z1 - h.z0), mat, {
        position: [(h.x0 + h.x1) / 2, y, (h.z0 + h.z1) / 2],
      });
    rect(HABITATS.savanna, 0.02, SAND);
    rect(HABITATS.lions, 0.02, SAND);
    rect(HABITATS.elephants, 0.02, SAND);
    rect(HABITATS.penguins, 0.02, ROCK);
    rect(HABITATS.flamingos, 0.03, WATER);
    // the penguins' pool, inset in its rocks
    const pp = HABITATS.penguins;
    rect(
      { x0: pp.x0 + 3, z0: pp.z0 + 3, x1: pp.x1 - 3, z1: pp.z1 - 3 },
      0.05,
      WATER,
    );
    // the lions' rocks
    b.add(new THREE.DodecahedronGeometry(1.6, 0), ROCK, {
      position: [-13, 0.8, 4.5],
      scale: [1.4, 0.8, 1],
    });
    // fences: posts and two rails round each habitat
    for (const [id, h] of Object.entries(HABITATS)) {
      const sides: [number, number, number, number][] = [
        [h.x0, h.z0, h.x1, h.z0],
        [h.x1, h.z0, h.x1, h.z1],
        [h.x1, h.z1, h.x0, h.z1],
        [h.x0, h.z1, h.x0, h.z0],
      ];
      for (const [ax, az, bx, bz] of sides) {
        const len = Math.hypot(bx - ax, bz - az);
        const yaw = Math.atan2(bx - ax, bz - az);
        for (const y of [0.45, 0.95])
          b.add(new THREE.BoxGeometry(0.06, 0.08, len), WOOD, {
            position: [(ax + bx) / 2, y, (az + bz) / 2],
            rotation: [0, yaw, 0],
          });
        const posts = Math.ceil(len / 2);
        for (let k = 0; k <= posts; k++)
          b.add(new THREE.BoxGeometry(0.12, 1.1, 0.12), WOOD, {
            position: [
              ax + ((bx - ax) * k) / posts,
              0.55,
              az + ((bz - az) * k) / posts,
            ],
          });
      }
      // the habitat's sign, on the path side
      const i = names.indexOf(id);
      const g = new THREE.PlaneGeometry(2.4, 0.3);
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++)
        uv.setY(k, 1 - (i + 1 - uv.getY(k)) / names.length);
      const front = h.z1 < 0 ? h.z1 + 0.08 : h.z0 - 0.08;
      b.add(g, board, {
        position: [(h.x0 + h.x1) / 2, 1.35, front],
        rotation: [0, h.z1 < 0 ? 0 : Math.PI, 0],
      });
    }
    // acacia-ish trees in the savanna and by the paths
    for (const [tx, tz, s] of [
      [-16.5, -12.5, 1.2],
      [-7.5, -6, 1],
      [16.5, -6, 1.1],
      [5, 11.5, 0.9],
      [12, 11, 1],
      [-12, 11.5, 1],
    ] as const) {
      b.add(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 2.4 * s, 8), BARK, {
        position: [tx, 1.2 * s, tz],
      });
      b.add(new THREE.SphereGeometry(1.4 * s, 10, 6), LEAVES, {
        position: [tx, 2.6 * s, tz],
        scale: [1.4, 0.45, 1.4],
      });
    }
    return b.build();
  }, [signs]);
}

/**
 * The Daydaze Zoo on Park Avenue: paved paths past five fenced habitats:
 * giraffes and zebras on the savanna, elephants, lions on their rocks,
 * penguins round a pool and flamingos in a pond, all procedurally built.
 */
export function Zoo({ onPick }: { onPick: PickHandler }): JSX.Element {
  const signs = useMemo(signTex, []);
  const grounds = useGrounds(signs);
  return (
    <>
      <color attach="background" args={["#8ec8ff"]} />
      <fog attach="fog" args={["#bfe0ff", 30, 90]} />
      <hemisphereLight args={["#fff8e8", "#5a7a4a", 1.8]} />
      <directionalLight
        position={[10, 18, 8]}
        intensity={1.6}
        color="#fff4e0"
      />
      <Floor
        width={W}
        depth={D}
        center={[0, (z0 + z1) / 2]}
        color="#e8e0d0"
        texture={{ id: "patterned_paving", scale: 0.3 }}
        low={{ metalness: 0, roughness: 0.9 }}
        mirror={0}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.zoo} color="#7dff6b" />
      <primitive object={grounds} />
      <Walkers />
      <Birds />
      <NeonText
        text="DAYDAZE ZOO"
        color="#2d6a4f"
        font={MARQUEE}
        width={4.4}
        k={1.2}
        position={[0, 3.2, z1 - 0.2]}
        rotation-y={Math.PI}
      />
    </>
  );
}
