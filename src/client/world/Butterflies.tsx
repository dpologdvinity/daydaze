// Butterflies over a place's flocks (game/butterflies.ts): one instanced mesh
// of the decimated monarch (public/models/butterfly/butterfly.glb). Each frame
// the pure `flutter` writes every butterfly's pose into scratch objects and the
// instance matrices; the wings flap in the vertex shader (the tips lift with
// |x|, each butterfly at its own phase), so the whole flock is one draw call
// and nothing is allocated per frame. Hidden at night and under reduced motion.

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import {
  WINGSPAN,
  countOf,
  flockNear,
  flutter,
  isOut,
  wanderOf,
  type Flock,
  type Pose,
} from "../../game/butterflies.ts";
import { hash } from "../../game/city/hash.ts";
import { useReducedMotion } from "../motion.ts";
import type { Player } from "./PlayerController.tsx";
import { useQuality } from "./quality.ts";

const URL = "/models/butterfly/butterfly.glb";
/** Wing beats per second, and how far the tips lift (of the half-span). */
const BEATS = 3;
const LIFT = 0.7;

const pose: Pose = { x: 0, y: 0, z: 0, yaw: 0 };
const at = new THREE.Vector3();
const spin = new THREE.Quaternion();
const size = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const m = new THREE.Matrix4();

/** The model's one mesh, the wing-beat shader on a lit textured material. */
function useWings(time: { value: number }) {
  const gltf = useGLTF(URL);
  return useMemo(() => {
    let mesh: THREE.Mesh | undefined;
    gltf.scene.traverse((o) => {
      if (!mesh && o instanceof THREE.Mesh) mesh = o;
    });
    if (!mesh) throw new Error("butterfly.glb has no mesh");
    const src = mesh.material;
    const map =
      !Array.isArray(src) && src instanceof THREE.MeshStandardMaterial
        ? src.map
        : null;
    const material = new THREE.MeshLambertMaterial({
      map,
      side: THREE.DoubleSide,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uTime;
          attribute float aPhase;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          transformed.y += abs(position.x) * ${LIFT.toFixed(2)} *
            sin(uTime * ${(BEATS * 2 * Math.PI).toFixed(3)} + aPhase);`,
        );
    };
    const geometry = mesh.geometry.clone();
    geometry.computeBoundingBox();
    // the file is quantized: scale its own span to WINGSPAN meters
    const span = geometry.boundingBox?.getSize(size).x ?? 1;
    return { geometry, material, scale: WINGSPAN / span };
  }, [gltf, time]);
}

/**
 * Draws `flocks`. With a `player`, a flock exists only while she is near it
 * (BUTTERFLY_RANGE); `sun` is the daylight (0 night to 1 day) that brings them
 * out. Rooms pass neither: they are always day and fully in view.
 */
export function Butterflies({
  flocks,
  player,
  sun = 1,
  seed = 0,
}: {
  flocks: readonly Flock[];
  player?: Player;
  sun?: number;
  seed?: number;
}): JSX.Element | null {
  const tier = useQuality();
  const calm = useReducedMotion();
  const out = isOut(sun) && !calm;
  const time = useMemo(() => ({ value: 0 }), []);
  const { geometry, material, scale } = useWings(time);
  const capacity = countOf(flocks, tier);
  const canvas = useThree((s) => s.gl.domElement);
  const mesh = useMemo(() => {
    const phase = new Float32Array(capacity);
    for (let i = 0; i < capacity; i++) phase[i] = hash(seed, i, 99) * 6.283;
    const g = geometry.clone();
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    const im = new THREE.InstancedMesh(g, material, Math.max(capacity, 1));
    im.count = 0;
    // they roam a whole box: one draw call, so never cull it by a stale sphere
    im.frustumCulled = false;
    im.raycast = () => null;
    return im;
  }, [geometry, material, capacity, seed]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      mesh.dispose();
    },
    [mesh],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    time.value = t;
    let n = 0;
    flocks.forEach((flock, fi) => {
      if (player && !flockNear(flock, player.pos.x, player.pos.z, tier)) return;
      for (let i = 0; i < flock.count[tier] && n < capacity; i++) {
        flutter(flock, wanderOf(fi + seed * 16, i), t, pose);
        at.set(pose.x, pose.y, pose.z);
        spin.setFromAxisAngle(up, pose.yaw);
        size.setScalar(scale);
        m.compose(at, spin, size);
        mesh.setMatrixAt(n++, m);
      }
    });
    if (mesh.count !== n) canvas.dataset.butterflies = String(n);
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  });
  return out ? <primitive object={mesh} /> : null;
}

useGLTF.preload(URL);
