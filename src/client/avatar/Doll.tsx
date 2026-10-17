import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { couplePoseAt, type CoupleRole } from "../../game/dance/couple.ts";
import {
  createPose,
  danceMove,
  poseAt,
  type DanceMoveId,
  type Pose,
} from "../../game/dance/moves.ts";
import { bodyScales, DEFAULT_BODY, type BodyShape } from "../../game/body.ts";
import {
  silhouetteOf,
  type Silhouette,
  type Look,
  type Mood,
  type SwimLook,
} from "../../game/look.ts";
import { liveDrunk } from "../effects/drunk.ts";
import { useReducedMotion } from "../motion.ts";
import {
  farGeometry,
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
  DRINK_MATERIAL,
  NAIL,
  OUTLINE,
  shadowTex,
} from "./dollParts.ts";
import { buildFaceTextures } from "./faceTexture.ts";
import { HumanDoll } from "./human/HumanDoll.tsx";
import { pose, type Rig } from "./pose.ts";
import { gaitOf } from "../../game/gaits.ts";
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

// the toon doll has three cuts; the 3D doll's everyday wear borrows the nearest
const TOON_CUT: Record<Silhouette, "flares" | "mini" | "fur"> = {
  flares: "flares",
  mini: "mini",
  fur: "fur",
  jeans: "flares",
  shorts: "mini",
  blouse: "mini",
};

function useDollMaterials(look: Look, swim: SwimLook | null) {
  const { skin, hairColor } = look;
  const outfitColor = swim?.color ?? look.outfitColor;
  // shop outfits are cut from the three starting silhouettes
  const outfit = swim ? "swim" : TOON_CUT[silhouetteOf(look.outfit)];
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
        color: outfit === "fur" ? "#16101a" : shade(accent, 0.08),
        rim,
        gloss: 0.3,
      }),
      fur: makeToon({ color: accent, rim: "#ffffff", rimStrength: 0.4 }),
      shoe: makeToon({
        color: outfit === "mini" ? "#f6e7ff" : shade(accent, 0.05),
        rim,
        gloss: 0.9,
      }),
      sole: makeToon({ color: "#1a0d1d", rim, rimStrength: 0.3, gloss: 0.6 }),
      hair: makeHair(hairColor),
    };
  }, [skin, outfitColor, hairColor, outfit]);
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

// ----------------------------------------------------------------- LOD

// Past this many metres a doll drops its outlines and tiny jewellery and swaps
// to coarse head and hair meshes. The gap is hysteresis, so a doll at the edge
// does not flicker between the two.
const FAR_RANGE = 8.5;
const NEAR_RANGE = 7.5;
const detailParts = new Set<THREE.BufferGeometry>([
  G.ear,
  G.hoop,
  G.nails,
  G.scrunchie,
]);
const nearGeometry = new WeakMap<THREE.Mesh, THREE.BufferGeometry>();
const worldPos = new THREE.Vector3();

function setLod(root: THREE.Object3D, far: boolean) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geo: THREE.BufferGeometry | undefined = o.geometry;
    if (!geo) return;
    const outline = o.material === OUTLINE || o.material === HAIR_OUTLINE;
    o.visible = !((outline || detailParts.has(geo)) && far);
    const base = nearGeometry.get(o) ?? geo;
    nearGeometry.set(o, base);
    o.geometry = far ? farGeometry(base) : base;
  });
}

// ---------------------------------------------------------------- the doll

export type WalkState = { speed: number };

type DollProps = {
  look: Look;
  /** Worn instead of the outfit in swimwear rooms; the look is untouched. */
  swim?: SwimLook | null;
  /** Closet sliders: a clothed doll scales, it never changes outline shape. */
  body?: BodyShape;
  mood: Mood;
  /** The move a dancing doll loops; the two-step when none is given. */
  dance?: DanceMoveId;
  /** Set on one partner of a couple dance; the other doll takes the other role. */
  couple?: CoupleRole;
  /** A held motion-capture pose (STILL_CLIPS id) for the pose and sit moods. */
  hold?: string;
  /** Wobbles with the local player's buzz. */
  buzzed?: boolean;
  walk?: { current: WalkState };
  seed?: number;
} & Omit<ThreeElements["group"], "children">;

/** The original toon doll, shown while the 3D doll's models load. */
export function ToonDoll({
  look,
  swim = null,
  body = DEFAULT_BODY,
  mood,
  dance = "groove",
  couple,
  hold: _hold, // the 3D doll's alone
  buzzed = false,
  walk,
  seed = 0,
  ...rest
}: DollProps) {
  const m = useDollMaterials(look, swim);
  const gait = gaitOf(look.gait);
  const face = useFace(look, m.face);
  const hair = hairGeometry(look.hairStyle);
  const root = useRef<THREE.Group>(null);
  const lod = useRef<boolean | null>(null);
  const rig = useRef<Rig>({});
  const set = (k: keyof Rig) => (g: THREE.Group | null) => {
    rig.current[k] = g;
  };
  const calm = useReducedMotion();
  const phase = useRef(0);
  const blinkAt = useRef(2 + seed);
  // one pose buffer per doll, rewritten each frame, so the loop allocates nothing
  const sampled = useMemo<Pose>(createPose, []);

  // a new look brings new meshes with near geometry, so the LOD is reapplied
  useEffect(() => {
    lod.current = null;
  }, [look, hair]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime + seed * 7.3;
    hairTime.value = state.clock.elapsedTime;
    if (root.current) {
      // last frame's world matrix is close enough for picking a LOD, and
      // reading it costs nothing (getWorldPosition re-walks every parent)
      worldPos.setFromMatrixPosition(root.current.matrixWorld);
      const far = worldPos.distanceTo(state.camera.position);
      const isFar = far > (lod.current ? NEAR_RANGE : FAR_RANGE);
      if (isFar !== lod.current) {
        lod.current = isFar;
        setLod(root.current, isFar);
      }
    }
    const j = rig.current;
    if (!j.body) return;
    const speed = walk?.current.speed ?? 0;
    const moving = speed > 0.05;
    phase.current += dt * speed * 6.2 * gait.cadence;
    // walking ends the dance, so a move only plays while the doll stands still
    const move = mood === "dance" && !moving ? danceMove(dance) : null;
    const danced = !move
      ? null
      : couple
        ? couplePoseAt(move, couple, t, sampled)
        : poseAt(move, t, sampled);
    pose(
      j,
      moving ? "walk" : mood,
      t,
      phase.current,
      calm,
      danced,
      buzzed ? liveDrunk.wobble : 0,
      gait,
    );
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

  const silhouette = TOON_CUT[silhouetteOf(look.outfit)];
  const flares = !swim && silhouette === "flares";
  const mini = !swim && silhouette === "mini";
  const fur = !swim && silhouette === "fur";
  const earL = headPoint(Math.PI / 2, -0.03, 0.0);
  const scale = bodyScales(body);

  return (
    <group {...rest} ref={root} scale={[scale.hips, scale.height, scale.hips]}>
      <mesh
        geometry={G.shadow}
        rotation-x={-Math.PI / 2}
        position-y={0.004}
        renderOrder={1}
      >
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
      </mesh>
      <group
        ref={set("body")}
        scale={[scale.bust * scale.waist, 1, scale.bust * scale.waist]}
      >
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
        {swim?.style === "one-piece" && (
          <Part geometry={G.onePiece} material={m.cloth} />
        )}
        {swim?.style === "bikini" && (
          <>
            <Part geometry={G.bikiniTop} material={m.cloth} />
            <Part geometry={G.bikiniBottom} material={m.cloth2} />
          </>
        )}
        {swim && (
          <>
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
                scale={[s * 0.017, 0.042, 0.026]}
              />
              <Part
                geometry={G.nails}
                material={NAIL}
                outline={null}
                position={[0, -0.25, 0.004]}
                scale={[s * 0.017, 0.042, 0.026]}
              />
              {s === 1 && mood === "lean" && (
                <group position={[0, -0.25, 0.04]} rotation-x={Math.PI / 2}>
                  <mesh geometry={G.glass} material={GLASS} />
                  <mesh
                    position-y={-0.005}
                    scale={[0.03, 0.012, 0.03]}
                    material={DRINK_MATERIAL}
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
                <Shoe m={m} flat={swim !== null} />
              </group>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

/** Heeled sandals, or flat flip-flops with the swimsuit. */
function Shoe({
  m,
  flat,
}: {
  m: ReturnType<typeof useDollMaterials>;
  flat: boolean;
}) {
  if (flat)
    return (
      <group>
        <Part
          geometry={G.sole}
          material={m.shoe}
          position={[0, -0.12, 0.03]}
          scale={[1, 0.45, 1.1]}
        />
        <Part
          geometry={G.strapRing}
          material={m.shoe}
          position={[0, -0.08, 0.05]}
          rotation-x={Math.PI / 2}
          scale={0.8}
        />
      </group>
    );
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

/** A doll: the 3D Blender-built doll, with the toon doll standing in while
 * its models load. */
export function Doll(props: DollProps) {
  return (
    <Suspense fallback={<ToonDoll {...props} />}>
      <HumanDoll {...props} />
    </Suspense>
  );
}
