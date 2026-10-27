// Procedural glasses (round, cat-eye or square) for the 3D doll, built at the
// nose anchor and parented to the head bone. Frame and lens materials are
// shared module-wide and never disposed; geometry is disposed on unmount.

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BONE } from "./anims.ts";
import type { Makeup } from "../../../game/look.ts";
import type { Anchors } from "./Jewelry.tsx";

type Style = Exclude<Makeup["glasses"], "none">;

const FRAME: Record<Style, THREE.MeshStandardMaterial> = {
  round: new THREE.MeshStandardMaterial({
    color: "#c8a050",
    metalness: 0.8,
    roughness: 0.3,
  }),
  "cat-eye": new THREE.MeshStandardMaterial({
    color: "#ff4fb3",
    roughness: 0.25,
  }),
  square: new THREE.MeshStandardMaterial({ color: "#141018", roughness: 0.3 }),
};
const LENS = new THREE.MeshStandardMaterial({
  color: "#dff0ff",
  transparent: true,
  opacity: 0.18,
  roughness: 0.05,
  depthWrite: false,
});

/** Where the lenses sit, from the nostril anchor: up to the eyes, back to
 * the bridge, and half the gap between the pupils either side. */
const UP = 0.029;
const BACK = 0.012;
const HALF = 0.031;
const TEMPLE = 0.085;

/** One rim in the frame's own space (x across, y up, z forward). */
function rim(style: Style, side: -1 | 1): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  if (style === "square") {
    const w = 0.034;
    const h = 0.024;
    const t = 0.0024;
    for (const [sx, sy, px, py] of [
      [w, t, 0, h / 2],
      [w, t, 0, -h / 2],
      [t, h, w / 2, 0],
      [t, h, -w / 2, 0],
    ] as const)
      out.push(
        new THREE.BoxGeometry(sx, sy, t).translate(side * HALF + px, py, 0),
      );
    return out;
  }
  const ring = new THREE.TorusGeometry(0.0165, 0.0013, 6, 28);
  if (style === "cat-eye") {
    // wider than tall, the outer corner swept up into a point
    ring.scale(1.12, 0.78, 1);
    ring.rotateZ(side * 0.18);
    out.push(
      new THREE.ConeGeometry(0.004, 0.012, 6)
        .rotateZ(-side * 1.1)
        .translate(side * (HALF + 0.018), 0.009, 0),
    );
  }
  out.push(ring.translate(side * HALF, 0, 0));
  return out;
}

/** The whole pair: rims, bridge and the temples back to her ears. */
function frameGeometry(style: Style) {
  const parts = [...rim(style, -1), ...rim(style, 1)];
  parts.push(
    new THREE.CylinderGeometry(0.0012, 0.0012, 0.03, 6)
      .rotateZ(Math.PI / 2)
      .translate(0, 0.004, 0),
  );
  for (const side of [-1, 1])
    parts.push(
      new THREE.BoxGeometry(0.0018, 0.0022, TEMPLE).translate(
        side * (HALF + 0.019),
        0.004,
        -TEMPLE / 2,
      ),
    );
  return parts;
}

/**
 * Her glasses, built at the nose anchor and parented to the head bone so
 * they move with her. Nothing shows without the anchor (an old model).
 */
export function Glasses({
  style,
  anchors,
  bones,
  restInverse,
}: {
  style: Makeup["glasses"];
  anchors: Anchors;
  bones: Map<string, THREE.Bone>;
  restInverse: Map<string, THREE.Matrix4>;
}) {
  const built = useMemo(() => {
    const nose = anchors.nose;
    const bone = bones.get(BONE.head);
    const inv = restInverse.get(BONE.head);
    if (style === "none" || !nose || !bone || !inv) return null;
    const group = new THREE.Group();
    for (const g of frameGeometry(style))
      group.add(new THREE.Mesh(g, FRAME[style]));
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(
        style === "square"
          ? new THREE.PlaneGeometry(0.032, 0.022)
          : new THREE.CircleGeometry(0.0158, 24),
        LENS,
      );
      if (style === "cat-eye") lens.scale.set(1.12, 0.78, 1);
      lens.position.set(side * HALF, 0, -0.001);
      group.add(lens);
    }
    // the nose anchor is the nostril piercing's spot, off to one side: take
    // its height and depth, but sit on the face's midline, facing straight
    // ahead (+z in the model)
    group.position.set(0, nose.p.y + UP, nose.p.z - BACK);
    group.updateMatrix();
    group.applyMatrix4(inv);
    return { group, bone };
  }, [style, anchors, bones, restInverse]);

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
