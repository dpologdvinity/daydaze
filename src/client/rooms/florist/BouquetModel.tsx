// Downloaded stems (Quaternius' Stylized Nature MegaKit, CC0), recolored per
// flower and drawn instanced: one draw call per model part and stem type, however
// many stems stand in a bucket, on the counter or in the vase at home.
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  arrange,
  RIBBON_HEX,
  STEMS,
  WRAP_HEX,
  type Bouquet,
  type Stem,
  type StemPose,
} from "../../../game/florist.ts";
import { useFittedParts } from "../shared/Prop.tsx";

/** Which downloaded model draws each stem, and how tall it stands (meters). */
const LOOK: Record<Stem, { model: string; height: number }> = {
  rose: { model: "flower-4-single", height: 0.62 },
  tulip: { model: "flower-3-single", height: 0.55 },
  sunflower: { model: "flower-3-single", height: 0.75 },
  peony: { model: "flower-4-single", height: 0.5 },
  lily: { model: "flower-4-single", height: 0.7 },
  daisy: { model: "flower-3-single", height: 0.42 },
  "babys-breath": { model: "flower-4-single", height: 0.38 },
  eucalyptus: { model: "fern-1", height: 0.5 },
};
const UNIT_FIT = { width: 1, depth: 1, height: 1 } as const;

/** Where one stem stands: a spot in the group, its pose and a spin. */
export type Placement = {
  x: number;
  y: number;
  z: number;
  pose: StemPose;
  spin: number;
};

/**
 * Every stem of one kind, instanced. `placements` may change (a stem added to
 * a bucket or the counter): matrices are rewritten in a layout effect, never
 * inside a frame loop.
 */
export function StemCluster({
  stem,
  placements,
}: {
  stem: Stem;
  placements: readonly Placement[];
}) {
  const { model, height } = LOOK[stem];
  const fitted = useFittedParts(model, UNIT_FIT, "florist");
  const parts = useMemo(
    () =>
      fitted.map(({ geometry, material }) => {
        const m = material.clone();
        if (m instanceof THREE.MeshStandardMaterial) {
          // the flower heads take the stem's own color; foliage keeps its green
          if (m.name.startsWith("Flowers")) {
            m.map = null;
            m.color.set(STEMS[stem].hex);
          } else if (stem === "eucalyptus") m.color.set(STEMS[stem].hex);
          m.side = THREE.DoubleSide;
        }
        return { geometry, material: m };
      }),
    [fitted, stem],
  );
  useEffect(
    () => () => {
      for (const p of parts) p.material.dispose();
    },
    [parts],
  );
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    for (const mesh of refs.current) {
      if (!mesh) continue;
      placements.forEach((p, i) => {
        o.position.set(p.x, p.y + p.pose.lift, p.z);
        o.rotation.set(p.pose.tiltX, p.spin, p.pose.tiltZ, "YXZ");
        o.scale.setScalar(height);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.count = placements.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [placements, height, parts]);
  return (
    <>
      {parts.map((p, i) => (
        <instancedMesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          args={[p.geometry, p.material, 12]}
          frustumCulled={false}
        />
      ))}
    </>
  );
}

const STEM_IDS = Object.keys(STEMS) as Stem[];

/**
 * The bouquet as a whole: its stems fanned from the base (see arrange) with
 * the wrap and ribbon around them, or standing in a glass vase when `vase`.
 */
export function BouquetModel({
  bouquet,
  vase = false,
}: {
  bouquet: Pick<Bouquet, "stems" | "wrap" | "ribbon">;
  vase?: boolean;
}) {
  const byKind = useMemo(() => {
    const poses = arrange(bouquet.stems.length);
    const groups = new Map<Stem, Placement[]>();
    bouquet.stems.forEach((stem, i) => {
      const pose = poses[i];
      if (!pose) return;
      const list = groups.get(stem) ?? [];
      list.push({ x: 0, y: 0.3, z: 0, pose, spin: i * 1.7 });
      groups.set(stem, list);
    });
    return groups;
  }, [bouquet.stems]);
  return (
    <group>
      {STEM_IDS.map((stem) => {
        const list = byKind.get(stem);
        return list ? (
          <StemCluster key={stem} stem={stem} placements={list} />
        ) : null;
      })}
      {vase ? (
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.16, 0.11, 0.34, 20]} />
          <meshStandardMaterial
            color="#bfe3ee"
            transparent
            opacity={0.55}
            roughness={0.1}
          />
        </mesh>
      ) : (
        <>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.2, 0.05, 0.4, 14, 1, true]} />
            <meshStandardMaterial
              color={WRAP_HEX[bouquet.wrap]}
              roughness={0.85}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.018, 6, 20]} />
            <meshStandardMaterial color={RIBBON_HEX[bouquet.ribbon]} />
          </mesh>
        </>
      )}
    </group>
  );
}
