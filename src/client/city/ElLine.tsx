// The El you can see: the steel trestle over Main Avenue, each station's
// platform, roof and stairs (all boxes from src/game/city/el.ts merged into
// four meshes), and the train, three cars of Quaternius' Train Pack (CC0,
// built by art/city/el_train.py) that runs on the shared timetable.

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ROAD_NODES } from "../../game/city/layout.ts";
import {
  EL_DECK_Y,
  EL_Z,
  elBoxes,
  elTrainAt,
  type ElBox,
} from "../../game/city/el.ts";
import { elClock } from "./elLayout.ts";

const FRONT = "/models/el/train-front.glb";
const WAGON = "/models/el/train-wagon.glb";
/** Cars are 12 m long; the train is front, wagon, front turned about. */
const CAR = 12;

const MATERIALS: Record<ElBox["kind"], THREE.MeshStandardMaterial> = {
  steel: new THREE.MeshStandardMaterial({
    color: "#34423f",
    roughness: 0.6,
    metalness: 0.5,
    emissive: "#16201e",
    emissiveIntensity: 0.6,
  }),
  stone: new THREE.MeshStandardMaterial({
    color: "#a8a39a",
    roughness: 0.9,
    emissive: "#2a2630",
    emissiveIntensity: 0.4,
  }),
  rail: new THREE.MeshStandardMaterial({
    color: "#8a8f96",
    roughness: 0.35,
    metalness: 0.8,
  }),
  roof: new THREE.MeshStandardMaterial({
    color: "#2f6f66",
    roughness: 0.7,
    emissive: "#10302c",
    emissiveIntensity: 0.5,
  }),
};

/** The x of every north-south street, where the columns must not stand. */
const CROSS = [
  ...new Set(
    ROAD_NODES.filter((n) => Math.abs(n.position[1]) === 192).map(
      (n) => n.position[0],
    ),
  ),
];

/** Boxes of one material merged into one geometry. */
function merged(boxes: readonly ElBox[]): THREE.BufferGeometry {
  const parts = boxes.map((b) => {
    const g = new THREE.BoxGeometry(b.sx, b.sy, b.sz);
    g.translate(b.x, b.y, b.z + EL_Z);
    return g;
  });
  const out = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  if (!out) throw new Error("the El has no boxes");
  return out;
}

/** A car's geometry with plain float attributes (the file stores them quantized). */
function plain(
  source: THREE.BufferGeometry,
  node: THREE.Mesh,
): THREE.BufferGeometry {
  const copy = (name: string, size: number) => {
    const a = source.getAttribute(name);
    const f = new Float32Array(a.count * size);
    for (let i = 0; i < a.count; i++) {
      f[i * size] = a.getX(i);
      f[i * size + 1] = a.getY(i);
      if (size > 2) f[i * size + 2] = a.getZ(i);
    }
    return new THREE.BufferAttribute(f, size);
  };
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", copy("position", 3));
  g.setAttribute("normal", copy("normal", 3));
  g.setAttribute("color", copy("color", 3));
  g.setIndex(source.getIndex());
  node.updateWorldMatrix(true, false);
  g.applyMatrix4(node.matrixWorld);
  return g;
}

const CAR_MATERIAL = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.45,
  metalness: 0.2,
  emissive: "#202838",
  emissiveIntensity: 0.5,
});

function firstMesh(root: THREE.Object3D): THREE.Mesh {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (!found && o instanceof THREE.Mesh) found = o;
  });
  if (!found) throw new Error("the train car has no mesh");
  return found;
}

export function ElLine(): JSX.Element {
  const front = useGLTF(FRONT);
  const wagon = useGLTF(WAGON);
  const train = useRef<THREE.Group>(null);
  const trestle = useMemo(() => {
    const boxes = elBoxes(CROSS);
    return (Object.keys(MATERIALS) as ElBox["kind"][]).map((kind) => ({
      kind,
      geometry: merged(boxes.filter((b) => b.kind === kind)),
    }));
  }, []);
  const cars = useMemo(() => {
    const f = firstMesh(front.scene);
    const w = firstMesh(wagon.scene);
    return {
      front: plain(f.geometry, f),
      wagon: plain(w.geometry, w),
    };
  }, [front, wagon]);
  useEffect(
    () => () => {
      trestle.forEach((t) => t.geometry.dispose());
      cars.front.dispose();
      cars.wagon.dispose();
    },
    [trestle, cars],
  );
  useFrame(() => {
    const g = train.current;
    if (!g) return;
    const t = elTrainAt(elClock());
    g.position.set(t.x, EL_DECK_Y + 0.16, EL_Z);
  });
  return (
    <>
      {trestle.map(({ kind, geometry }) => (
        <mesh
          key={kind}
          geometry={geometry}
          material={MATERIALS[kind]}
          frustumCulled={false}
        />
      ))}
      <group ref={train}>
        <mesh
          geometry={cars.front}
          material={CAR_MATERIAL}
          position-x={CAR}
          frustumCulled={false}
        />
        <mesh
          geometry={cars.wagon}
          material={CAR_MATERIAL}
          frustumCulled={false}
        />
        <mesh
          geometry={cars.front}
          material={CAR_MATERIAL}
          position-x={-CAR}
          rotation-y={Math.PI}
          frustumCulled={false}
        />
      </group>
    </>
  );
}

useGLTF.preload(FRONT);
useGLTF.preload(WAGON);
