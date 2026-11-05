// Animated, independently posed copies of the cove's downloaded mermaid.
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useReducedMotion } from "../../motion.ts";
import { useQuality } from "../../world/quality.ts";
import { siren } from "./session.ts";

const URL = "/models/cove/mermaid.glb";

export function Mermaid({
  x,
  y,
  z,
  yaw,
  tint,
  swim,
  singer = false,
}: {
  x: number;
  y: number;
  z: number;
  yaw: number;
  tint: string;
  swim?: boolean;
  singer?: boolean;
}) {
  const gltf = useGLTF(URL);
  const calm = useReducedMotion();
  const tier = useQuality();
  const group = useRef<THREE.Group>(null);
  const state = useRef({ time: 0, clip: "", owed: 0, frame: 0 });
  const rig = useMemo(() => {
    const root = clone(gltf.scene);
    const materials: THREE.Material[] = [];
    root.traverse((node) => {
      node.frustumCulled = false;
      if (node instanceof THREE.Mesh) {
        const recolor = (material: THREE.Material) => {
          const copy = material.clone();
          if (copy instanceof THREE.MeshStandardMaterial)
            copy.color.multiply(new THREE.Color(tint));
          materials.push(copy);
          return copy;
        };
        node.material = Array.isArray(node.material)
          ? node.material.map(recolor)
          : recolor(node.material);
      }
    });
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 2.8 / Math.max(size.x, size.y, size.z);
    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map(
      gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]),
    );
    return { root, mixer, actions, materials, scale, center };
  }, [gltf, tint]);
  useEffect(
    () => () => {
      rig.mixer.stopAllAction();
      rig.materials.forEach((material) => material.dispose());
      rig.root.traverse((node) => {
        if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose();
      });
    },
    [rig],
  );
  useFrame((_, dt) => {
    const s = state.current;
    const want = swim
      ? "swim"
      : singer && siren.get().phase === "listen"
        ? "idle"
        : "sit";
    if (s.clip !== want) {
      const next = rig.actions.get(want);
      const previous = rig.actions.get(s.clip);
      if (next) {
        next.reset().play();
        if (previous && !calm) previous.crossFadeTo(next, 0.3, false);
        else if (previous) previous.stop();
        rig.mixer.update(0);
      }
      s.clip = want;
    }
    if (!calm) {
      s.time += dt;
      s.owed += dt;
      if (tier !== "low" || ++s.frame % 4 === 0) {
        rig.mixer.update(s.owed);
        s.owed = 0;
      }
      if (swim && group.current) {
        group.current.position.x = x + Math.sin(s.time * 0.25 + z) * 0.8;
        group.current.position.z = z + Math.cos(s.time * 0.25 + z) * 0.45;
      }
    }
  });
  return (
    <group ref={group} position={[x, y, z]} rotation-y={yaw}>
      <group
        scale={rig.scale}
        position={[
          -rig.center.x * rig.scale,
          -rig.center.y * rig.scale,
          -rig.center.z * rig.scale,
        ]}
      >
        <primitive object={rig.root} />
      </group>
    </group>
  );
}
