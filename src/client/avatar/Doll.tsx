import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Look, Mood } from "../../game/look.ts";
import { useReducedMotion } from "../motion.ts";
import {
  hairGeometry,
  headGeometry,
  headPoint,
  PONY_ROOT,
} from "./dollGeometry.ts";
import {
  G,
  GLASS,
  GOLD,
  HAIR_OUTLINE,
  MANGO_DRINK,
  OUTLINE,
  shadowTex,
} from "./dollParts.ts";
import { buildFaceTextures } from "./faceTexture.ts";
import { pose, type Rig } from "./pose.ts";
import { hairTime, makeHair, makeToon } from "./toon.ts";

type Mat = THREE.Material;
type PartProps = {
  geometry: THREE.BufferGeometry;
  material: Mat;
  outline?: Mat | null;
} & Omit<ThreeElements["group"], "children">;

function Part({ geometry, material, outline = OUTLINE, ...rest }: PartProps) {
  return (
    <group {...rest}>
      <mesh geometry={geometry} material={material} />
      {outline && <mesh geometry={geometry} material={outline} />}
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
  const invalidate = useThree((s) => s.invalidate);
  const [tex, setTex] = useState<{
    open: THREE.Texture;
    closed: THREE.Texture;
  } | null>(null);
  useEffect(() => {
    let live = true;
    buildFaceTextures(look)
      .then((t) => {
        if (live) setTex(t);
        else {
          t.open.dispose();
          t.closed.dispose();
        }
      })
      // a missing image leaves the face blank rather than breaking the room
      .catch((e: unknown) => console.warn(e));
    return () => {
      live = false;
    };
  }, [look.skin, look.lips, look.brows, look.shadow]);
  useEffect(() => {
    if (!tex) return;
    face.map = tex.open;
    face.needsUpdate = true;
    invalidate();
    return () => {
      tex.open.dispose();
      tex.closed.dispose();
    };
  }, [tex, face, invalidate]);
  return tex;
}

// ---------------------------------------------------------------- the doll

export type WalkState = { speed: number };

type DollProps = {
  look: Look;
  mood: Mood;
  walk?: { current: WalkState };
  seed?: number;
} & Omit<ThreeElements["group"], "children">;

export function Doll({ look, mood, walk, seed = 0, ...rest }: DollProps) {
  const m = useDollMaterials(look);
  const face = useFace(look, m.face);
  const hair = hairGeometry(look.hairStyle);
  const rig = useRef<Rig>({});
  const set = (k: keyof Rig) => (g: THREE.Group | null) => {
    rig.current[k] = g;
  };
  const calm = useReducedMotion();
  const phase = useRef(0);
  const blinkAt = useRef(2 + seed);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime + seed * 7.3;
    hairTime.value = state.clock.elapsedTime;
    const j = rig.current;
    if (!j.body) return;
    const speed = walk?.current.speed ?? 0;
    phase.current += dt * speed * 6.2;
    pose(j, speed > 0.05 ? "walk" : mood, t, phase.current, calm);
    // blink
    if (face) {
      const tm = state.clock.elapsedTime;
      const fm = m.face;
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
            <mesh geometry={hair.main} material={HAIR_OUTLINE} />
            {hair.pony && (
              <group position={PONY_ROOT} ref={set("pony")}>
                <mesh geometry={hair.pony} material={m.hair} />
                <mesh geometry={hair.pony} material={HAIR_OUTLINE} />
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
