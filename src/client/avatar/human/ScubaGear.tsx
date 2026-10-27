// Rented scuba gear for the 3D doll, built from primitives and parented to
// her bones so it follows every stroke: an air tank strapped across the back
// (spine) and a mask over the eyes (head, at the nose anchor like her
// glasses). Materials are shared and never disposed; geometry goes on unmount.

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BONE } from "./anims.ts";
import type { Anchors } from "./Jewelry.tsx";

const TANK = new THREE.MeshStandardMaterial({
  color: "#ffb02e",
  metalness: 0.5,
  roughness: 0.35,
});
const METAL = new THREE.MeshStandardMaterial({
  color: "#8a929c",
  metalness: 0.8,
  roughness: 0.3,
});
const STRAP = new THREE.MeshStandardMaterial({
  color: "#15131c",
  roughness: 0.8,
});
const GLASS = new THREE.MeshStandardMaterial({
  color: "#bff8ff",
  transparent: true,
  opacity: 0.35,
  roughness: 0.05,
  depthWrite: false,
});

/** Where the tank rides: meters up the model from the hips' height to mid
 * back, and back from the spine's centre line (model space, +z forward). */
const TANK_UP = 1.3;
const TANK_BACK = -0.17;

function tankGroup(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.075, 0.42, 6, 14),
    TANK,
  );
  const valve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.025, 0.07, 8),
    METAL,
  );
  valve.position.y = 0.3;
  const hose = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.008, 6, 14, Math.PI),
    STRAP,
  );
  hose.position.set(0, 0.32, 0.03);
  hose.rotation.x = Math.PI / 2;
  const strap = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.012, 6, 24),
    STRAP,
  );
  strap.rotation.x = Math.PI / 2;
  strap.position.set(0, 0.12, 0.17);
  g.add(body, valve, hose, strap);
  g.position.set(0, TANK_UP, TANK_BACK);
  return g;
}

function maskGroup(): THREE.Group {
  const g = new THREE.Group();
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.03), GLASS);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.009, 6, 18).scale(1, 0.45, 1),
    STRAP,
  );
  rim.position.z = 0.014;
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.095, 0.006, 6, 22),
    STRAP,
  );
  band.rotation.x = Math.PI / 2;
  band.position.z = -0.085;
  g.add(lens, rim, band);
  return g;
}

/** Her rented tank and mask, while she wears them. */
export function ScubaGear({
  on,
  anchors,
  bones,
  restInverse,
}: {
  on: boolean;
  anchors: Anchors;
  bones: Map<string, THREE.Bone>;
  restInverse: Map<string, THREE.Matrix4>;
}) {
  const built = useMemo(() => {
    const spine = bones.get(BONE.spine2);
    const head = bones.get(BONE.head);
    const spineInv = restInverse.get(BONE.spine2);
    const headInv = restInverse.get(BONE.head);
    if (!on || !spine || !head || !spineInv || !headInv) return null;
    const tank = tankGroup();
    tank.updateMatrix();
    tank.applyMatrix4(spineInv);
    const mask = maskGroup();
    // the mask sits at the eyes: the nose anchor's depth, a hand above it
    const nose = anchors.nose;
    mask.position.set(0, (nose?.p.y ?? 1.6) + 0.03, (nose?.p.z ?? 0.1) - 0.006);
    mask.updateMatrix();
    mask.applyMatrix4(headInv);
    return { tank, mask, spine, head };
  }, [on, anchors, bones, restInverse]);

  useEffect(() => {
    if (!built) return;
    built.spine.add(built.tank);
    built.head.add(built.mask);
    return () => {
      built.spine.remove(built.tank);
      built.head.remove(built.mask);
      for (const g of [built.tank, built.mask])
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        });
    };
  }, [built]);
  return null;
}
