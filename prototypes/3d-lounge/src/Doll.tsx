import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  hairGeometry,
  headGeometry,
  headPoint,
  lathe,
  lumpy,
  PONY_ROOT,
} from "./dollGeometry";
import { buildFaceTextures } from "./faceTexture";
import type { Look, Mood } from "./looks";
import { hairTime, makeHair, makeOutline, makeToon } from "./toon";

// ------------------------------------------------------------ shared geometry

const TORSO: [number, number][] = [
  [0.655, 0],
  [0.668, 0.075],
  [0.7, 0.118],
  [0.75, 0.136],
  [0.8, 0.126],
  [0.85, 0.096],
  [0.885, 0.08],
  [0.925, 0.086],
  [0.975, 0.101],
  [1.025, 0.11],
  [1.065, 0.108],
  [1.095, 0.088],
  [1.115, 0.055],
  [1.125, 0],
];

function torsoShape(g: THREE.BufferGeometry, zScale = 0.7, flare = 0) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    let z = p.getZ(i) * (zScale + flare * Math.max(0, (0.8 - y) / 0.2));
    // bust
    if (z > 0) {
      const b = Math.exp(-Math.pow((y - 1.005) / 0.04, 2));
      const side = Math.exp(-Math.pow((Math.abs(x) - 0.052) / 0.045, 2));
      z += 0.032 * b * side;
    }
    p.setZ(i, z);
  }
  g.computeVertexNormals();
  return g;
}

const band = (from: number, to: number, pad: number) =>
  TORSO.filter(([y]) => y >= from && y <= to).map(
    ([y, r]) => [y, r + pad] as [number, number],
  );

const G = {
  torso: torsoShape(lathe(TORSO, 32)),
  neck: lathe(
    [
      [1.04, 0.036],
      [1.13, 0.03],
      [1.25, 0.03],
    ],
    16,
  ),
  upperArm: lathe(
    [
      [-0.25, 0],
      [-0.24, 0.021],
      [-0.13, 0.026],
      [-0.02, 0.031],
      [0.012, 0.024],
      [0.02, 0],
    ],
    16,
  ),
  foreArm: lathe(
    [
      [-0.222, 0],
      [-0.212, 0.016],
      [-0.15, 0.019],
      [-0.05, 0.023],
      [0, 0.021],
      [0.012, 0],
    ],
    16,
  ),
  hand: new THREE.SphereGeometry(1, 16, 12),
  thigh: lathe(
    [
      [-0.345, 0],
      [-0.33, 0.041],
      [-0.25, 0.049],
      [-0.12, 0.06],
      [-0.02, 0.066],
      [0.02, 0.05],
      [0.035, 0],
    ],
    20,
  ),
  shin: lathe(
    [
      [-0.325, 0],
      [-0.31, 0.023],
      [-0.27, 0.026],
      [-0.16, 0.038],
      [-0.07, 0.041],
      [0, 0.039],
      [0.014, 0],
    ],
    20,
  ),
  ear: new THREE.SphereGeometry(1, 12, 10),
  // clothes
  cropTop: torsoShape(lathe(band(0.935, 1.1, 0.008), 32)),
  lowRise: torsoShape(lathe(band(0.665, 0.79, 0.008), 32)),
  flareThigh: lathe(
    [
      [-0.34, 0.052],
      [-0.25, 0.058],
      [-0.12, 0.068],
      [-0.02, 0.074],
      [0.02, 0.06],
    ],
    20,
  ),
  flareShin: lathe(
    [
      [-0.37, 0.092],
      [-0.33, 0.08],
      [-0.26, 0.062],
      [-0.16, 0.05],
      [-0.06, 0.049],
      [0.02, 0.052],
    ],
    20,
  ),
  dress: torsoShape(
    lathe(
      [
        [0.6, 0.178],
        [0.64, 0.162],
        [0.7, 0.148],
        [0.76, 0.14],
        [0.81, 0.124],
        [0.855, 0.104],
        [0.89, 0.09],
        [0.93, 0.095],
        [0.975, 0.109],
        [1.025, 0.118],
        [1.06, 0.115],
        [1.085, 0.1],
      ],
      36,
    ),
    0.7,
    0.18,
  ),
  skirt: torsoShape(
    lathe(
      [
        [0.62, 0.17],
        [0.66, 0.158],
        [0.72, 0.147],
        [0.78, 0.138],
        [0.8, 0.133],
      ],
      36,
    ),
    0.7,
    0.16,
  ),
  jacket: lumpy(
    torsoShape(
      new THREE.LatheGeometry(
        band(0.84, 1.1, 0.045).map(([y, r]) => new THREE.Vector2(r, y)),
        36,
        0.55,
        Math.PI * 2 - 1.1,
      ),
      0.82,
    ),
    0.007,
    90,
  ),
  collar: lumpy(new THREE.TorusGeometry(0.12, 0.052, 14, 36), 0.012, 70),
  hem: lumpy(new THREE.TorusGeometry(0.15, 0.03, 10, 36), 0.008, 80),
  furSleeve: lumpy(
    lathe(
      [
        [-0.24, 0.05],
        [-0.12, 0.056],
        [-0.02, 0.06],
        [0.03, 0.05],
      ],
      18,
    ),
    0.009,
    80,
  ),
  furFore: lumpy(
    lathe(
      [
        [-0.2, 0.05],
        [-0.12, 0.044],
        [-0.02, 0.044],
        [0.02, 0.04],
      ],
      18,
    ),
    0.008,
    80,
  ),
  cuff: lumpy(new THREE.TorusGeometry(0.05, 0.026, 10, 24), 0.008, 90),
  belt: new THREE.TorusGeometry(0.128, 0.007, 8, 48),
  strap: new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.075, 0.065),
      new THREE.Vector3(0, 1.122, 0.012),
      new THREE.Vector3(0, 1.1, -0.06),
    ]),
    12,
    0.0045,
    6,
  ),
  // shoes
  sole: new THREE.BoxGeometry(0.09, 0.055, 0.15, 1, 1, 1),
  heel: new THREE.CylinderGeometry(0.03, 0.026, 0.1, 14),
  upper: new THREE.SphereGeometry(1, 18, 12),
  strapRing: new THREE.TorusGeometry(0.032, 0.007, 8, 20),
  hoop: new THREE.TorusGeometry(0.036, 0.0045, 8, 32),
  scrunchie: lumpy(new THREE.TorusGeometry(0.04, 0.018, 12, 24), 0.004, 120),
  glass: lathe(
    [
      [-0.07, 0.03],
      [-0.068, 0.002],
      [-0.03, 0.004],
      [-0.02, 0.02],
      [0.0, 0.034],
      [0.01, 0.036],
    ],
    20,
  ),
  shadow: new THREE.CircleGeometry(0.34, 32),
};
G.jacket.computeVertexNormals();
G.belt.rotateX(Math.PI / 2);
G.belt.scale(1, 1, 0.72);
G.belt.translate(0, 0.765, 0);
G.collar.rotateX(Math.PI / 2);
G.collar.scale(1, 1, 0.78);
G.collar.translate(0, 1.11, -0.008);
G.hem.rotateX(Math.PI / 2);
G.hem.scale(1, 1, 0.75);
G.hem.translate(0, 0.84, 0);
G.cuff.rotateX(Math.PI / 2);
G.cuff.translate(0, -0.2, 0);
G.scrunchie.rotateX(-0.9);

const shadowTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.75)");
  g.addColorStop(0.6, "rgba(0,0,0,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

const OUTLINE = makeOutline(0.0055, false);
const HAIR_OUTLINE = makeOutline(0.0065, true);
const GOLD = new THREE.MeshStandardMaterial({
  color: "#ffcf73",
  metalness: 1,
  roughness: 0.22,
  envMapIntensity: 1.6,
});
const GLASS = new THREE.MeshStandardMaterial({
  color: "#ffe6f4",
  metalness: 0.2,
  roughness: 0.05,
  transparent: true,
  opacity: 0.35,
});
const MANGO_DRINK = new THREE.MeshBasicMaterial({
  color: new THREE.Color("#ff9a1f").multiplyScalar(1.6),
  toneMapped: false,
});

type Mat = THREE.Material;
type PartProps = {
  geometry: THREE.BufferGeometry;
  material: Mat;
  outline?: Mat | null;
} & Omit<ThreeElements["group"], "children">;

// Outlines live on layer 1: the main camera sees them, the floor reflection
// camera (default layer only) skips them, halving the dolls' reflected draws.
export const OUTLINE_LAYER = 1;
const outlineLayer = (m: THREE.Mesh | null) => m?.layers.set(OUTLINE_LAYER);

function Part({ geometry, material, outline = OUTLINE, ...rest }: PartProps) {
  return (
    <group {...rest}>
      <mesh geometry={geometry} material={material} />
      {outline && (
        <mesh geometry={geometry} material={outline} ref={outlineLayer} />
      )}
    </group>
  );
}

// ------------------------------------------------------------- materials

function shade(hex: string, l: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + l, 0, 1));
}

function useDollMaterials(look: Look) {
  const { skin, outfitColor, hairColor } = look;
  const mats = useMemo(() => {
    const rim = "#ff74d4";
    const accent = outfitColor;
    return {
      skin: makeToon({ color: skin, rim, rimStrength: 0.45, gloss: 0.12 }),
      face: makeToon({ color: "#ffffff", rim, rimStrength: 0.45, gloss: 0.1 }),
      cloth: makeToon({ color: accent, rim, rimStrength: 0.6, gloss: 0.5 }),
      cloth2: makeToon({
        color: shade(accent, -0.12),
        rim,
        rimStrength: 0.5,
        gloss: 0.4,
      }),
      top: makeToon({
        color: look.outfit === "fur" ? "#16101a" : shade(accent, 0.08),
        rim,
        gloss: 0.3,
      }),
      fur: makeToon({ color: accent, rim: "#ffffff", rimStrength: 0.4 }),
      shoe: makeToon({
        color: look.outfit === "mini" ? "#f6e7ff" : shade(accent, 0.05),
        rim,
        gloss: 0.9,
      }),
      sole: makeToon({ color: "#1a0d1d", rim, rimStrength: 0.3, gloss: 0.6 }),
      hair: makeHair(hairColor),
    };
  }, [skin, outfitColor, hairColor, look.outfit]);
  useEffect(
    () => () => Object.values(mats).forEach((m) => m.dispose()),
    [mats],
  );
  return mats;
}

function useFace(look: Look, face: THREE.MeshToonMaterial) {
  const [tex, setTex] = useState<{
    open: THREE.Texture;
    closed: THREE.Texture;
  } | null>(null);
  useEffect(() => {
    let live = true;
    buildFaceTextures(look).then((t) => {
      if (live) setTex(t);
      else {
        t.open.dispose();
        t.closed.dispose();
      }
    });
    return () => {
      live = false;
    };
  }, [look.skin, look.lips, look.brows, look.shadow]);
  useEffect(() => {
    if (!tex) return;
    face.map = tex.open;
    face.needsUpdate = true;
    return () => {
      tex.open.dispose();
      tex.closed.dispose();
    };
  }, [tex, face]);
  return tex;
}

// ---------------------------------------------------------------- the doll

type Joint = THREE.Group | null;
type Rig = Record<
  | "body"
  | "head"
  | "lArm"
  | "lFore"
  | "rArm"
  | "rFore"
  | "lLeg"
  | "lShin"
  | "rLeg"
  | "rShin"
  | "lFoot"
  | "rFoot"
  | "pony",
  Joint
>;

export type WalkState = { speed: number };

type DollProps = {
  look: Look;
  mood: Mood;
  walk?: { current: WalkState };
  seed?: number;
} & Omit<ThreeElements["group"], "children">;

export function Doll({ look, mood, walk, seed = 0, ...rest }: DollProps) {
  const m = useDollMaterials(look);
  const face = useFace(look, m.face as THREE.MeshToonMaterial);
  const hair = hairGeometry(look.hairStyle);
  const rig = useRef<Rig>({} as Rig);
  const set = (k: keyof Rig) => (g: THREE.Group | null) => {
    rig.current[k] = g;
  };
  const phase = useRef(0);
  const blinkAt = useRef(2 + seed);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime + seed * 7.3;
    hairTime.value = state.clock.elapsedTime;
    const j = rig.current;
    if (!j.body) return;
    const speed = walk?.current.speed ?? 0;
    phase.current += dt * speed * 6.2;
    pose(j, speed > 0.05 ? "walk" : mood, t, phase.current);
    // blink
    if (face) {
      const tm = state.clock.elapsedTime;
      const fm = m.face as THREE.MeshToonMaterial;
      const closed = tm > blinkAt.current && tm < blinkAt.current + 0.13;
      fm.map = closed ? face.closed : face.open;
      if (tm > blinkAt.current + 0.13)
        blinkAt.current = tm + 2.2 + ((seed * 13.7 + tm) % 3.1);
    }
  });

  const flares = look.outfit === "flares";
  const mini = look.outfit === "mini";
  const fur = look.outfit === "fur";
  const earL = headPoint(Math.PI / 2, -0.03, 0.0);

  return (
    <group {...rest}>
      <mesh
        geometry={G.shadow}
        rotation-x={-Math.PI / 2}
        position-y={0.004}
        renderOrder={1}
      >
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
      </mesh>
      <group ref={set("body")}>
        <Part geometry={G.torso} material={m.skin} />
        <Part geometry={G.neck} material={m.skin} position-z={-0.008} />
        {(flares || fur) && <Part geometry={G.cropTop} material={m.top} />}
        {flares && (
          <>
            <Part geometry={G.lowRise} material={m.cloth} />
            <Part geometry={G.belt} material={GOLD} outline={null} />
          </>
        )}
        {mini && (
          <>
            <Part geometry={G.dress} material={m.cloth} />
            <Part geometry={G.strap} material={m.cloth} position-x={0.062} />
            <Part geometry={G.strap} material={m.cloth} position-x={-0.062} />
          </>
        )}
        {fur && (
          <>
            <Part geometry={G.skirt} material={m.cloth2} />
            <Part geometry={G.jacket} material={m.fur} />
            <Part geometry={G.collar} material={m.fur} />
            <Part geometry={G.hem} material={m.fur} />
          </>
        )}

        {/* head */}
        <group position={[0, 1.12, -0.005]} ref={set("head")}>
          <group position={[0, 0.329, 0.012]}>
            <Part geometry={headGeometry} material={m.face} />
            {[1, -1].map((s) => (
              <group key={s}>
                <Part
                  geometry={G.ear}
                  material={m.skin}
                  position={[s * (earL.x - 0.004), earL.y, -0.01]}
                  scale={[0.018, 0.042, 0.03]}
                />
                <mesh
                  geometry={G.hoop}
                  material={GOLD}
                  position={[s * (earL.x + 0.006), earL.y - 0.075, 0.0]}
                  rotation-y={Math.PI / 2}
                />
              </group>
            ))}
            <mesh geometry={hair.main} material={m.hair} />
            <mesh
              geometry={hair.main}
              material={HAIR_OUTLINE}
              ref={outlineLayer}
            />
            {hair.shell && <mesh geometry={hair.shell} material={m.hair} />}
            {hair.pony && (
              <group position={PONY_ROOT} ref={set("pony")}>
                <mesh geometry={hair.pony} material={m.hair} />
                <mesh
                  geometry={hair.pony}
                  material={HAIR_OUTLINE}
                  ref={outlineLayer}
                />
                <Part geometry={G.scrunchie} material={m.cloth} />
              </group>
            )}
          </group>
        </group>

        {/* arms */}
        {(
          [
            [1, "lArm", "lFore"],
            [-1, "rArm", "rFore"],
          ] as const
        ).map(([s, a, f]) => (
          <group key={a} position={[s * 0.148, 1.078, -0.008]} ref={set(a)}>
            <Part geometry={G.upperArm} material={m.skin} />
            {fur && <Part geometry={G.furSleeve} material={m.fur} />}
            <group position-y={-0.24} ref={set(f)}>
              <Part geometry={G.foreArm} material={m.skin} />
              {fur && (
                <>
                  <Part geometry={G.furFore} material={m.fur} />
                  <Part geometry={G.cuff} material={m.fur} />
                </>
              )}
              <Part
                geometry={G.hand}
                material={m.skin}
                position={[0, -0.25, 0.004]}
                scale={[0.017, 0.042, 0.026]}
              />
              {s === 1 && mood === "lean" && (
                <group position={[0, -0.25, 0.04]} rotation-x={Math.PI / 2}>
                  <mesh geometry={G.glass} material={GLASS} />
                  <mesh
                    position-y={-0.005}
                    scale={[0.03, 0.012, 0.03]}
                    material={MANGO_DRINK}
                  >
                    <sphereGeometry args={[1, 16, 8]} />
                  </mesh>
                </group>
              )}
            </group>
          </group>
        ))}

        {/* legs */}
        {(
          [
            [1, "lLeg", "lShin", "lFoot"],
            [-1, "rLeg", "rShin", "rFoot"],
          ] as const
        ).map(([s, l, sh, ft]) => (
          <group key={l} position={[s * 0.066, 0.775, 0]} ref={set(l)}>
            <Part geometry={G.thigh} material={m.skin} />
            {flares && <Part geometry={G.flareThigh} material={m.cloth} />}
            <group position-y={-0.33} ref={set(sh)}>
              <Part geometry={G.shin} material={m.skin} />
              {flares && <Part geometry={G.flareShin} material={m.cloth} />}
              <group position-y={-0.305} ref={set(ft)}>
                <Shoe m={m} />
              </group>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

function Shoe({ m }: { m: ReturnType<typeof useDollMaterials> }) {
  return (
    <group>
      <Part geometry={G.sole} material={m.sole} position={[0, -0.105, 0.045]} />
      <Part geometry={G.heel} material={m.sole} position={[0, -0.08, -0.04]} />
      <Part
        geometry={G.upper}
        material={m.shoe}
        position={[0, -0.06, 0.05]}
        scale={[0.044, 0.04, 0.085]}
      />
      <Part
        geometry={G.strapRing}
        material={m.shoe}
        position={[0, 0.0, 0]}
        rotation-x={Math.PI / 2}
      />
    </group>
  );
}

// ------------------------------------------------------------- animation

function r(j: Joint, x = 0, y = 0, z = 0) {
  j?.rotation.set(x, y, z);
}

function pose(j: Rig, mood: Mood | "walk", t: number, ph: number) {
  const breath = Math.sin(t * 1.7);
  const body = j.body!;
  body.position.set(0, 0, 0);
  body.scale.set(1, 1, 1);
  r(j.pony, Math.sin(t * 1.6) * 0.05, 0, Math.sin(t * 1.1) * 0.06);

  if (mood === "walk") {
    const s = Math.sin(ph),
      c = Math.cos(ph);
    body.position.y = Math.abs(c) * 0.025 - 0.012;
    r(body, 0.04, s * 0.12, s * 0.04);
    r(j.lLeg, -s * 0.5, 0, 0.02);
    r(j.rLeg, s * 0.5, 0, -0.02);
    r(j.lShin, 0.15 + Math.max(0, c) * 0.75);
    r(j.rShin, 0.15 + Math.max(0, -c) * 0.75);
    r(j.lFoot, s * 0.2 - 0.1);
    r(j.rFoot, -s * 0.2 - 0.1);
    r(j.lArm, s * 0.45, 0, 0.13);
    r(j.rArm, -s * 0.45, 0, -0.13);
    r(j.lFore, -0.35);
    r(j.rFore, -0.35);
    r(j.head, -0.02, -s * 0.08, 0);
    r(j.pony, 0.15 + c * 0.12, 0, s * 0.15);
    return;
  }
  if (mood === "dance") {
    const b = Math.abs(Math.sin(t * 4.2));
    const sway = Math.sin(t * 2.1);
    body.position.y = -b * 0.045;
    body.position.x = sway * 0.03;
    r(body, 0, sway * 0.3, sway * 0.09);
    r(j.lLeg, -b * 0.3, 0, 0.06);
    r(j.rLeg, -b * 0.3 + 0.1, 0, -0.06);
    r(j.lShin, b * 0.55);
    r(j.rShin, b * 0.45);
    r(j.lFoot, -0.1);
    r(j.rFoot, -0.1);
    r(j.lArm, -0.4, 0, 2.5 + Math.sin(t * 4.2) * 0.25);
    r(j.rArm, -0.4, 0, -2.4 - Math.sin(t * 4.2 + 1) * 0.25);
    r(j.lFore, -0.5, 0, 0.5 + Math.sin(t * 8.4) * 0.3);
    r(j.rFore, -0.5, 0, -0.5);
    r(j.head, 0.05 + b * 0.08, sway * -0.25, sway * 0.12);
    r(j.pony, 0.2 + b * 0.25, 0, sway * 0.3);
    return;
  }
  if (mood === "sit") {
    body.position.y = -0.33;
    r(body, -0.08, 0, 0);
    r(j.lLeg, -1.45, 0, 0.12);
    r(j.rLeg, -1.55, 0, -0.18);
    r(j.lShin, 1.35, 0, 0);
    r(j.rShin, 1.5, 0, 0);
    r(j.lFoot, 0.25);
    r(j.rFoot, 0.25);
    r(j.lArm, -0.35, 0, 0.12);
    r(j.rArm, -0.2, 0, -0.5);
    r(j.lFore, -0.9, 0, -0.2);
    r(j.rFore, -1.3, 0, 0.3);
    r(j.head, 0.05 + breath * 0.01, 0.3 + Math.sin(t * 0.4) * 0.15, 0.1);
    return;
  }
  const shift = Math.sin(t * 0.55);
  body.scale.set(1, 1 + breath * 0.004, 1 + breath * 0.008);
  if (mood === "pose" || mood === "lean") {
    // hip pop, hand on hip, crossed step
    body.position.x = 0.025;
    r(body, 0, 0.12, 0.06 + shift * 0.01);
    r(j.lLeg, -0.18, 0.1, -0.1);
    r(j.lShin, 0.32);
    r(j.lFoot, -0.15);
    r(j.rLeg, 0.04, 0, -0.04);
    r(j.rShin, 0.02);
    r(j.rFoot, 0);
    r(j.rArm, 0.15, 0, -0.78);
    r(j.rFore, -0.2, 0, 1.95);
    if (mood === "lean") {
      r(j.lArm, -0.35, 0, 0.18);
      r(j.lFore, -1.75 + breath * 0.03, 0, -0.2);
    } else {
      r(j.lArm, 0.05, 0, 0.2);
      r(j.lFore, -0.25, 0, 0.15);
    }
    r(j.head, 0.06, -0.12 + Math.sin(t * 0.3) * 0.06, -0.14);
    return;
  }
  // idle: weight shift, relaxed arms, slow look-around
  body.position.x = shift * 0.012;
  r(body, 0, 0, shift * 0.025);
  r(j.lLeg, 0, 0, 0.02 + shift * 0.02);
  r(j.rLeg, -0.06, 0, -0.03);
  r(j.lShin, 0.02);
  r(j.rShin, 0.12 + Math.max(0, -shift) * 0.08);
  r(j.lFoot, 0);
  r(j.rFoot, -0.06);
  r(j.lArm, 0.04 + breath * 0.01, 0, 0.16);
  r(j.rArm, 0.04 + breath * 0.01, 0, -0.16);
  r(j.lFore, -0.2, 0, 0.05);
  r(j.rFore, -0.2, 0, -0.05);
  r(j.head, Math.sin(t * 0.4) * 0.04, Math.sin(t * 0.27) * 0.18, shift * 0.06);
}
