import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { canvasTex } from "../shared/materials.ts";

// A mermaid's tail in the doll's own space (y up, nose +z): a sleeve that
// swallows both legs from the hips, tapers past the feet and curls forward
// into a two-lobed fluke.
const STANDING = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 1.0, 0),
  new THREE.Vector3(0, 0.56, 0.03),
  new THREE.Vector3(0, 0.14, 0.03),
  new THREE.Vector3(0, -0.18, 0.14),
  new THREE.Vector3(0, -0.34, 0.46),
]);
// seated: along the thighs to the knees, down the shins, then curling out
const SEATED = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0.55, -0.08),
  new THREE.Vector3(0, 0.56, 0.22),
  new THREE.Vector3(0, 0.48, 0.46),
  new THREE.Vector3(0, 0.2, 0.56),
  new THREE.Vector3(0, -0.06, 0.6),
  new THREE.Vector3(0, -0.28, 0.82),
  new THREE.Vector3(0, -0.36, 1.12),
]);
const SPINES = { standing: STANDING, seated: SEATED } as const;
export type TailPose = keyof typeof SPINES;
const SEGMENTS = 40;
const RADIAL = 16;

/** Half-width at `t` along the spine: hips, knees, ankles, then the narrow. */
function radiusAt(t: number) {
  const knots = [
    [0, 0.205],
    [0.3, 0.15],
    [0.58, 0.13],
    [0.85, 0.06],
    [1, 0.035],
  ] as const;
  for (let i = 1; i < knots.length; i++) {
    const [t1, r1] = knots[i];
    const [t0, r0] = knots[i - 1];
    if (t <= t1) return r0 + ((r1 - r0) * (t - t0)) / (t1 - t0);
  }
  return knots[knots.length - 1][1];
}

function sleeve(SPINE: THREE.CatmullRomCurve3) {
  const g = new THREE.TubeGeometry(SPINE, SEGMENTS, 1, RADIAL, false);
  const p = g.attributes.position;
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    SPINE.getPointAt(t, center);
    const r = radiusAt(t);
    for (let j = 0; j <= RADIAL; j++) {
      const k = i * (RADIAL + 1) + j;
      v.fromBufferAttribute(p, k).sub(center).multiplyScalar(r);
      // wider than deep, like hips
      v.x *= 1.15;
      v.add(center);
      p.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** The fluke: two lobes, flat across the tail, at the spine's end. */
export function fluke() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.12, 0.08, 0.3, 0.12, 0.42, 0.3);
  s.bezierCurveTo(0.3, 0.2, 0.2, 0.22, 0, 0.12);
  s.bezierCurveTo(-0.2, 0.22, -0.3, 0.2, -0.42, 0.3);
  s.bezierCurveTo(-0.3, 0.12, -0.12, 0.08, 0, 0);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.025,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 1,
    curveSegments: 8,
  });
  // the shape's y runs out along the tail: lay it flat, pointing +z
  g.translate(0, 0, -0.0125).rotateX(Math.PI / 2);
  return g;
}

/** Overlapping scales, light at each scale's crown: tinted by the material. */
function scales() {
  return canvasTex(
    128,
    128,
    (ctx) => {
      ctx.fillStyle = "#6a6a7a";
      ctx.fillRect(0, 0, 128, 128);
      const r = 16;
      for (let row = -1; row < 10; row++)
        for (let col = -1; col < 6; col++) {
          const x = col * 2 * r + (row % 2 ? r : 0);
          const y = row * r * 0.9;
          const g = ctx.createRadialGradient(x, y - r * 0.4, 1, x, y, r);
          g.addColorStop(0, "#ffffff");
          g.addColorStop(0.7, "#b8b8c8");
          g.addColorStop(1, "#4a4a5a");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI);
          ctx.fill();
        }
    },
    [6, 10],
  );
}

/** A full tail in `color`, iridescent; the doll stands with her legs inside. */
export function Tail({
  color,
  pose = "standing",
}: {
  color: string;
  pose?: TailPose;
}) {
  const { body, fin, material } = useMemo(() => {
    const map = scales();
    const material = new THREE.MeshStandardMaterial({
      color,
      map,
      metalness: 0.55,
      roughness: 0.3,
      emissive: color,
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide,
    });
    const SPINE = SPINES[pose];
    const body = sleeve(SPINE);
    const fin = fluke();
    const end = SPINE.getPointAt(1);
    const dir = SPINE.getTangentAt(1);
    fin.applyMatrix4(
      new THREE.Matrix4()
        .lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0))
        .multiply(new THREE.Matrix4().makeRotationY(Math.PI))
        .setPosition(end),
    );
    return { body, fin, material };
  }, [color, pose]);
  useEffect(
    () => () => {
      body.dispose();
      fin.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [body, fin, material],
  );
  return (
    <>
      <mesh geometry={body} material={material} />
      <mesh geometry={fin} material={material} />
    </>
  );
}
