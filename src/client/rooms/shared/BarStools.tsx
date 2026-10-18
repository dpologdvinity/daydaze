import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { canvasTex } from "./materials.ts";

/** Seat height, meters: the top of the cushion. */
const SEAT = 0.8;

// each part's geometry is built in place, so every part shares one matrix
const parts = (() => {
  const seat = new THREE.CylinderGeometry(0.2, 0.21, 0.09, 28).translate(
    0,
    SEAT - 0.045,
    0,
  );
  const piping = new THREE.TorusGeometry(0.205, 0.012, 6, 28)
    .rotateX(Math.PI / 2)
    .translate(0, SEAT - 0.005, 0);
  const pan = new THREE.CylinderGeometry(0.17, 0.12, 0.05, 20).translate(
    0,
    SEAT - 0.115,
    0,
  );
  const pole = new THREE.CylinderGeometry(
    0.024,
    0.03,
    SEAT - 0.16,
    10,
  ).translate(0, (SEAT - 0.16) / 2 + 0.02, 0);
  const ring = new THREE.TorusGeometry(0.16, 0.013, 6, 24)
    .rotateX(Math.PI / 2)
    .translate(0, 0.3, 0);
  const base = new THREE.CylinderGeometry(0.17, 0.2, 0.035, 24).translate(
    0,
    0.0175,
    0,
  );
  const chrome = [piping, pan, pole, ring, base];
  return { seat, chrome };
})();

const chromeGeometry = mergeGeometries(
  parts.chrome.map((g) => g.toNonIndexed()),
);

const CHROME = new THREE.MeshStandardMaterial({
  color: "#e4e4ee",
  metalness: 0.95,
  roughness: 0.18,
});

/** Diamond tufting: buttons pulled into the cushion, with soft creases. */
function tufting() {
  return canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 256, 256);
    const step = 64;
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 3;
    for (let k = -256; k <= 512; k += step) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + 256, 256);
      ctx.moveTo(k, 256);
      ctx.lineTo(k + 256, 0);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += step / 2)
      for (let x = (y / (step / 2)) % 2 ? step / 2 : 0; x <= 256; x += step) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
        g.addColorStop(0, "rgba(0,0,0,0.6)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 14, y - 14, 28, 28);
      }
  });
}

/**
 * Bar stools in two draw calls: a tufted velvet seat in `color` with chrome
 * piping, pan, pole, foot ring and base. `at` is [x, y, z, yaw] per stool.
 * The seat glows faintly, so it still reads in a dark club.
 */
export function BarStools({
  at,
  color = "#b0123a",
}: {
  at: readonly (readonly [number, number, number, number])[];
  color?: string;
}) {
  const seat = useRef<THREE.InstancedMesh>(null);
  const metal = useRef<THREE.InstancedMesh>(null);
  const velvet = useMemo(() => {
    const tex = tufting();
    return new THREE.MeshStandardMaterial({
      color,
      map: tex,
      bumpMap: tex,
      bumpScale: 2,
      roughness: 0.85,
      emissive: color,
      emissiveIntensity: 0.18,
    });
  }, [color]);
  useLayoutEffect(() => () => velvet.map?.dispose(), [velvet]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    for (const mesh of [seat.current, metal.current]) {
      if (!mesh) continue;
      at.forEach(([x, y, z, yaw], i) => {
        q.setFromAxisAngle(up, yaw);
        mesh.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), q, one));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [at]);
  return (
    <>
      <instancedMesh ref={seat} args={[parts.seat, velvet, at.length]} />
      <instancedMesh ref={metal} args={[chromeGeometry, CHROME, at.length]} />
    </>
  );
}
