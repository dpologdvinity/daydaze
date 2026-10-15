import { useMemo } from "react";
import * as THREE from "three";
import { gradientMap } from "../../avatar/toon.ts";
import { useQuality } from "../../world/quality.ts";
import { instanced, Props } from "./build.ts";
import { PROPS } from "./materials.ts";

export type PalmSpec = {
  position: readonly [number, number, number];
  scale: number;
};

// Trunk: 7 leaning, ringed segments from the planter (0.45 m) to the crown (2.2 m).
const CROWN = 2.2;
const FROND_COLORS = ["#2a7240", "#1f5a34", "#3a8a4c"];
const FROND_MAT = new THREE.MeshToonMaterial({
  gradientMap,
  side: THREE.DoubleSide,
});

/**
 * One frond along +z: a drooping blade with a folded midrib, serrated
 * leaflet edges and a tapering tip.
 */
function frondGeometry(segs: number) {
  const pos: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const y = -0.9 * t * t;
    const w =
      0.2 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05)) * (1 - 0.3 * t);
    const serrate = i % 2 ? 1 : 0.7;
    pos.push(
      -w * serrate,
      y,
      1.5 * t,
      0,
      y + 0.06,
      1.5 * t,
      w * serrate,
      y,
      1.5 * t,
    );
    if (i < segs) {
      const c0 = i * 3 + 1;
      const c1 = c0 + 3;
      for (const off of [0, 2]) {
        const e0 = i * 3 + off;
        const e1 = e0 + 3;
        index.push(c0, e0, e1, c0, e1, c1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Trunks, planters and coconuts in one merged mesh, fronds in one instanced mesh. */
function buildPalms(palms: readonly PalmSpec[], segs: number, fronds: number) {
  const wood = new Props();
  const frond = frondGeometry(segs);
  const leaves = instanced(frond, FROND_MAT, palms.length * fronds);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const at = new THREE.Vector3();
  let n = 0;
  palms.forEach((p, pi) => {
    const s = p.scale;
    const [px, , pz] = p.position;
    const base = wood.within(px, 0, pz, 0, s);
    base.add(
      new THREE.CylinderGeometry(0.26, 0.2, 0.5, 20),
      "#f6c46a",
      [0, 0.25, 0],
    );
    for (let k = 0; k < 7; k++) {
      const r = 0.07 - 0.03 * (k / 7);
      const lean = 0.06 * ((k + 0.5) / 7) ** 2;
      base.add(
        new THREE.CylinderGeometry(r * 0.95, r, 0.26, 7),
        k % 2 ? "#3a2418" : "#4a2e1e",
        [lean, 0.45 + k * 0.25 + 0.125, 0],
      );
    }
    for (const [dx, dz] of [
      [0.04, 0.05],
      [-0.06, 0.03],
      [0.02, -0.07],
    ]) {
      base.add(new THREE.SphereGeometry(0.07, 8, 6), "#5a3a22", [
        0.06 + dx,
        CROWN - 0.1,
        dz,
      ]);
    }
    // fronds fan round the crown, each tilted up and lightly yawed
    for (let i = 0; i < fronds; i++) {
      const yaw = (i / fronds) * Math.PI * 2 + pi;
      const pitch = -0.5 - (i % 3) * 0.2;
      q.setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
      at.set(px + 0.06 * s, CROWN * s, pz);
      scale.setScalar(s);
      m.compose(at, q, scale);
      leaves.setMatrixAt(n, m);
      leaves.setColorAt(
        n,
        new THREE.Color(FROND_COLORS[(i + pi) % FROND_COLORS.length]),
      );
      n++;
    }
  });
  return { wood: wood.geometry(), leaves };
}

/** Palms with ringed trunks and curved, serrated fronds: two draw calls for all of them. */
export function Palms({ palms }: { palms: readonly PalmSpec[] }) {
  const quality = useQuality();
  const { wood, leaves } = useMemo(
    () =>
      quality === "high" ? buildPalms(palms, 10, 9) : buildPalms(palms, 6, 7),
    [palms, quality],
  );
  return (
    <>
      <mesh geometry={wood} material={PROPS} />
      <primitive object={leaves} />
    </>
  );
}
