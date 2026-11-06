// The city's seasonal dressing (src/game/city/season.ts says which are on,
// seasonSpots.ts where they go): fairy-light swags and the Plaza tree for the
// winter holidays, rainbow swags in June, orange and purple ones with
// pumpkins and paper bats for Halloween, red lanterns over Chinatown and
// Koreatown for Lunar New Year. Bulbs are one unlit instanced mesh with a
// color per instance; the models (public/models/seasons/, credits in
// docs/assets.md) are instanced only near the player, so they cost almost
// nothing on the low tier. Placement runs when the plan or the dressings
// change, never per frame.

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import type { Dressing } from "../../game/city/season.ts";
import {
  HALLOWEEN_LIGHTS,
  PLAZA_TREE,
  RAINBOW_LIGHTS,
  WARM_LIGHTS,
  bats,
  facadeLights,
  lanternStrings,
  pumpkins,
  treeLights,
  type Bulb,
  type Piece,
} from "../../game/city/seasonSpots.ts";
import { useQuality } from "../world/quality.ts";
import { cityFurniture, dimMeshes, partsOf } from "./CityFurniture.tsx";
import { useDaylight } from "./daylight.ts";
import { disposeInstanced } from "./dispose.ts";

const MODELS = "/models/seasons";
/** Models are drawn this close to where the plan was cut (meters), less on the low tier. */
const NEAR = 110;
const NEAR_LOW = 60;
/** The most pieces of one model drawn at once. */
const CAPACITY = 160;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const tint = new THREE.Color();

/** Every bulb as one unlit instanced mesh. */
function Bulbs({ bulbs }: { bulbs: readonly Bulb[] }): JSX.Element {
  const mesh = useMemo(() => {
    const geometry = new THREE.OctahedronGeometry(0.5, 0);
    const material = new THREE.MeshBasicMaterial({ toneMapped: false });
    const out = new THREE.InstancedMesh(geometry, material, bulbs.length);
    bulbs.forEach((b, i) => {
      m.compose(p.set(...b.at), q.identity(), s.setScalar(b.size));
      out.setMatrixAt(i, m);
      out.setColorAt(i, tint.set(b.color));
    });
    out.frustumCulled = false;
    return out;
  }, [bulbs]);
  useEffect(() => () => disposeInstanced([mesh], true), [mesh]);
  return <primitive object={mesh} />;
}

/** One downloaded model instanced at the pieces near the player. */
function Pieces({
  model,
  pieces,
  glow,
}: {
  model: string;
  pieces: readonly Piece[];
  glow?: string;
}): JSX.Element {
  const low = useQuality() === "low";
  const gltf = useGLTF(`${MODELS}/${model}.glb`);
  const meshes = useMemo(() => {
    const parts = partsOf(gltf.scene, null, CAPACITY);
    if (glow)
      for (const part of parts)
        if (part.material instanceof THREE.MeshStandardMaterial) {
          part.material.emissive.set(glow);
          part.material.emissiveIntensity = 0.7;
        }
    return parts;
  }, [gltf, glow]);
  const { at } = cityFurniture.use();
  const { neon } = useDaylight();
  useEffect(() => dimMeshes(meshes, 1 - 0.55 * neon), [meshes, neon]);
  useEffect(() => {
    const near = low ? NEAR_LOW : NEAR;
    let n = 0;
    for (const piece of pieces) {
      if (Math.hypot(piece.at[0] - at[0], piece.at[2] - at[1]) > near) continue;
      if (n === CAPACITY) break;
      q.setFromAxisAngle(up, piece.yaw);
      m.compose(p.set(...piece.at), q, s.setScalar(piece.scale));
      for (const mesh of meshes) mesh.setMatrixAt(n, m);
      n++;
    }
    for (const mesh of meshes) {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [meshes, pieces, at, low]);
  useEffect(() => () => disposeInstanced(meshes, true), [meshes]);
  return (
    <>
      {meshes.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </>
  );
}

/** The Plaza's big tree (its bulbs are part of the winter string). */
function PlazaTree(): JSX.Element {
  const gltf = useGLTF(`${MODELS}/tree.glb`);
  const tree = useMemo(() => gltf.scene.clone(true), [gltf]);
  return (
    <primitive object={tree} position={[PLAZA_TREE[0], 0, PLAZA_TREE[1]]} />
  );
}

export function SeasonalDressing({
  active,
}: {
  active: readonly Dressing[];
}): JSX.Element {
  const key = active.join(",");
  const winter = active.includes("winter-holidays");
  const halloween = active.includes("halloween");
  const lunar = active.includes("lunar-new-year");
  const pride = active.includes("pride");
  const bulbs = useMemo(() => {
    const out: Bulb[] = [];
    if (winter) out.push(...facadeLights(WARM_LIGHTS), ...treeLights());
    if (halloween) out.push(...facadeLights(HALLOWEEN_LIGHTS));
    if (pride) out.push(...facadeLights(RAINBOW_LIGHTS));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key stands for the flags
  }, [key]);
  const lanterns = useMemo(() => (lunar ? lanternStrings() : null), [lunar]);
  const pumpkinSpots = useMemo(
    () => (halloween ? pumpkins() : []),
    [halloween],
  );
  const batSpots = useMemo(() => (halloween ? bats() : []), [halloween]);
  return (
    <>
      {bulbs.length > 0 && <Bulbs bulbs={bulbs} />}
      {winter && <PlazaTree />}
      {halloween && <Pieces model="pumpkin" pieces={pumpkinSpots} />}
      {halloween && <Pieces model="bat" pieces={batSpots} />}
      {lanterns && (
        <>
          <Bulbs bulbs={lanterns.cord} />
          <Pieces model="lantern" pieces={lanterns.lanterns} glow="#ff2a1a" />
        </>
      )}
    </>
  );
}
