// Behind-the-ear hearing aids for the 3D doll, built at the nose anchor like
// the glasses and parented to the head bone. Shell materials are shared
// module-wide and never disposed; geometry is disposed on unmount.

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BONE } from "./anims.ts";
import type { Makeup } from "../../../game/look.ts";
import type { Anchors } from "./Jewelry.tsx";

type Shell = Exclude<Makeup["hearing"], "none">;

const SHELL: Record<Shell, THREE.MeshStandardMaterial> = {
  beige: new THREE.MeshStandardMaterial({ color: "#d8b89a", roughness: 0.4 }),
  pink: new THREE.MeshStandardMaterial({ color: "#ff4fb3", roughness: 0.3 }),
  teal: new THREE.MeshStandardMaterial({ color: "#2fc8b8", roughness: 0.3 }),
};
const TUBE = new THREE.MeshStandardMaterial({
  color: "#e8e4e0",
  transparent: true,
  opacity: 0.7,
  roughness: 0.2,
});

/** Where the ear sits from the nostril anchor: out to the side, up a little,
 * back to the ear (the glasses' temples end here too). */
const SIDE = 0.077;
const UP = 0.022;
const BACK = 0.088;

/** One aid in its own space (x out from the head, y up, z forward): a bean
 * that arcs over the top of the ear, a pod behind it and a clear tube. */
function aid(shell: Shell, side: -1 | 1): THREE.Mesh[] {
  const pod = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.0045, 0.014, 4, 8),
    SHELL[shell],
  );
  pod.position.set(side * 0.004, -0.004, -0.012);
  pod.rotation.x = 0.35;
  const hook = new THREE.Mesh(
    new THREE.TorusGeometry(0.013, 0.0016, 6, 14, Math.PI * 0.95),
    TUBE,
  );
  hook.rotation.y = Math.PI / 2;
  hook.position.set(side * 0.002, 0.008, 0.002);
  hook.rotation.z = Math.PI * 0.05;
  return [pod, hook];
}

/** A pair of hearing aids. Nothing shows without the nose anchor. */
export function HearingAids({
  shell,
  anchors,
  bones,
  restInverse,
}: {
  shell: Makeup["hearing"];
  anchors: Anchors;
  bones: Map<string, THREE.Bone>;
  restInverse: Map<string, THREE.Matrix4>;
}) {
  const built = useMemo(() => {
    const nose = anchors.nose;
    const bone = bones.get(BONE.head);
    const inv = restInverse.get(BONE.head);
    if (shell === "none" || !nose || !bone || !inv) return null;
    const group = new THREE.Group();
    for (const side of [-1, 1] as const) {
      const one = new THREE.Group();
      for (const m of aid(shell, side)) one.add(m);
      one.position.set(side * SIDE, nose.p.y + UP, nose.p.z - BACK);
      group.add(one);
    }
    group.updateMatrix();
    group.applyMatrix4(inv);
    return { group, bone };
  }, [shell, anchors, bones, restInverse]);

  useEffect(() => {
    if (!built) return;
    built.bone.add(built.group);
    return () => {
      built.bone.remove(built.group);
      built.group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    };
  }, [built]);
  return null;
}
