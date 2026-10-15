import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { Batch } from "../shared/batch.ts";
import { hdr } from "../shared/materials.ts";
import { HALF_WIDTH, LAMP_TOP, LAMPS, SHOP_HEIGHT, SHOP_Z } from "./layout.ts";

const BULB_GAP = 0.55;
const SAG = 0.9;
const PALETTE = ["#fff1c8", "#ff6ac8", "#ffb02e", "#fff1c8", "#9b5cff"].map(
  (h) => hdr(h, 3.2),
);

// Wires run from the shop cornices out to the lamp posts and back, zig-zag.
const BACK_X = [-HALF_WIDTH, -6, 3, HALF_WIDTH];
const WIRE = new THREE.MeshBasicMaterial({ color: "#1a0d1d" });

function anchors() {
  const out: THREE.Vector3[] = [];
  BACK_X.forEach((x, i) => {
    out.push(new THREE.Vector3(x, SHOP_HEIGHT - 0.2, SHOP_Z));
    const lamp = LAMPS[i];
    if (lamp) out.push(new THREE.Vector3(lamp[0], LAMP_TOP + 0.05, lamp[1]));
  });
  return out;
}

/** A sagging wire between two anchors, as a quadratic curve. */
function span(a: THREE.Vector3, b: THREE.Vector3) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= SAG * 2;
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

export function StringLights() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { wires, bulbs } = useMemo(() => {
    const pts = anchors();
    const curves = pts.slice(1).map((p, i) => span(pts[i], p));
    const bulbs: THREE.Vector3[] = [];
    for (const c of curves) {
      const n = Math.floor(c.getLength() / BULB_GAP);
      for (let i = 1; i < n; i++) bulbs.push(c.getPointAt(i / n));
    }
    const b = new Batch();
    for (const c of curves) {
      b.add(new THREE.TubeGeometry(c, 40, 0.012, 4), WIRE);
    }
    return { wires: b.build(), bulbs };
  }, []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    bulbs.forEach((p, i) => {
      o.position.copy(p);
      o.position.y -= 0.06;
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, PALETTE[i % PALETTE.length]);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [bulbs]);
  const calm = useReducedMotion();
  const c = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m || calm) return;
    // a slow twinkle that rolls along the strings
    const t = clock.elapsedTime;
    for (let i = 0; i < bulbs.length; i++) {
      const k = 0.7 + 0.3 * Math.sin(t * 1.6 + i * 0.9);
      c.copy(PALETTE[i % PALETTE.length]).multiplyScalar(k);
      m.setColorAt(i, c);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <primitive object={wires} />
      <instancedMesh ref={ref} args={[undefined, undefined, bulbs.length]}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}
