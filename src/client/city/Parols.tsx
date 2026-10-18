import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MANILA_X, WEST_EDGE } from "../../game/city/layout.ts";
import { VIEW_RADIUS } from "../../game/city/tuning.ts";
import { useReducedMotion } from "../motion.ts";
import { hdr } from "../rooms/shared/materials.ts";

/**
 * Parol lanterns strung across Little Manila's stretch of the avenue: a wire
 * between the shopfronts every 12 m, five lit stars hanging from each, swaying
 * along the wire. One draw for the stars, one for the wires, and neither is
 * drawn unless the camera is in or near Little Manila.
 */

const COLOURS = ["#ff2f4f", "#ffd84f", "#4fe3ff", "#7dff6b", "#ff4fb3"];
/** Strings run from the west edge to Downtown, clear of the crossing. */
const STRING_X: number[] = [];
for (let x = WEST_EDGE + 8; x < -200; x += 12)
  if (Math.abs(x - MANILA_X) > 10) STRING_X.push(x);
const EAST = STRING_X[STRING_X.length - 1];
const WIRE_Y = 7.5;
/** The wire spans the avenue and its sidewalks, building to building. */
const WIRE_HALF = 14;
const ACROSS = [-8, -4, 0, 4, 8];

/** A five-pointed star with two tails, hung from its top point. */
export function parolGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.24 : 0.55;
    if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const parts = [
    new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false })
      .translate(0, 0, -0.08)
      .toNonIndexed(),
    ...[-0.14, 0.14].map((x) =>
      new THREE.BoxGeometry(0.06, 0.8, 0.02)
        .translate(x, -0.8, 0)
        .toNonIndexed(),
    ),
  ];
  const g = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  // hang from the top point, facing along the avenue
  return g.translate(0, -0.55, 0).rotateY(Math.PI / 2);
}

type Spot = { x: number; z: number; drop: number; phase: number };

const SPOTS: Spot[] = STRING_X.flatMap((x, s) =>
  ACROSS.map((z, i) => ({
    x,
    z,
    // the wire sags towards the middle of the street
    drop: 0.3 + 0.8 * (1 - (z / WIRE_HALF) ** 2),
    phase: s * 1.3 + i * 0.7,
  })),
);

const X_AXIS = new THREE.Vector3(1, 0, 0);
const scratch = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  p: new THREE.Vector3(),
  one: new THREE.Vector3(1, 1, 1),
};

export function Parols() {
  const calm = useReducedMotion();
  const group = useRef<THREE.Group>(null);
  const stars = useMemo(() => {
    const m = new THREE.InstancedMesh(
      parolGeometry(),
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      SPOTS.length,
    );
    SPOTS.forEach((_, i) =>
      m.setColorAt(i, hdr(COLOURS[i % COLOURS.length], 1.8)),
    );
    m.frustumCulled = false;
    return m;
  }, []);
  const wires = useMemo(() => {
    const m = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.04, 0.04, WIRE_HALF * 2),
      new THREE.MeshBasicMaterial({ color: "#3a2f4a" }),
      STRING_X.length,
    );
    STRING_X.forEach((x, i) =>
      m.setMatrixAt(i, scratch.m.makeTranslation(x, WIRE_Y, 0)),
    );
    m.frustumCulled = false;
    return m;
  }, []);
  useEffect(
    () => () => {
      for (const m of [stars, wires]) {
        m.geometry.dispose();
        [m.material].flat().forEach((mat) => mat.dispose());
        m.dispose();
      }
    },
    [stars, wires],
  );

  useFrame(({ camera, clock }) => {
    const g = group.current;
    if (!g) return;
    // distance from the camera to the strung stretch of the avenue
    const { x, z } = camera.position;
    const dx = Math.max(0, STRING_X[0] - x, x - EAST);
    g.visible = Math.hypot(dx, z) < VIEW_RADIUS;
    if (!g.visible) return;
    const t = calm ? 0 : clock.elapsedTime;
    const { m, q, p, one } = scratch;
    SPOTS.forEach((s, i) => {
      // a pendulum swinging along the wire
      const swing = calm ? 0 : Math.sin(t * 1.1 + s.phase) * 0.12;
      q.setFromAxisAngle(X_AXIS, swing);
      m.compose(p.set(s.x, WIRE_Y - s.drop, s.z), q, one);
      stars.setMatrixAt(i, m);
    });
    stars.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <primitive object={stars} />
      <primitive object={wires} />
    </group>
  );
}
