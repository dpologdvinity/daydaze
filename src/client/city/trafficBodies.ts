// Instanced traffic made of the downloaded car bodies: one InstancedMesh per
// body and level of detail (near, and a -lo twin for distance and the low
// tier), every body's buckets merged into a single draw. The paint takes each
// car's own color from the instance color; lamps glow at night. The wheels are
// not in the bodies: one shared wheel (the sedan's) is instanced four times a
// car, near and distance twin each, sized to the car's tyre and turned by the
// distance it has rolled and, at the front, its steering.
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { lampGain } from "../../game/city/daylight.ts";
import { BODY_KEYS, bodyUrl, type BodyKey } from "../../game/driving/bodies.ts";
import { BODY_WHEELS } from "../../game/driving/wheels.ts";
import { createCarGlow } from "./carGlow.ts";
import { setCarLampGlow } from "./carLamps.ts";
import { bodyGeometry, mergedBody } from "./carBodies.ts";
import { useDaylight } from "./daylight.ts";
import { WHEELS_PER_CAR, wheelMatrix } from "./wheelPlacement.ts";

const URLS = BODY_KEYS.flatMap((key) =>
  [false, true].map((lo) => bodyUrl(key, lo)),
);

/** Beyond this many meters (high tier) a car draws its distance twin. */
export const NEAR_BODY = 35;

/**
 * The shared traffic material: vertex colors, with the instance color applied
 * only to vertices marked `aPart` = paint, and lamp vertices lifted into
 * emissive by `lamp` (raise it at night).
 */
function trafficMaterial(lamp: { value: number }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    metalness: 0.2,
    emissive: "#1a2030",
    emissiveIntensity: 0.5,
  });
  m.customProgramCacheKey = () => "traffic-body";
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uLamp = lamp;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aPart;\nvarying float vPart;",
      )
      .replace(
        "#include <color_vertex>",
        THREE.ShaderChunk.color_vertex.replace(
          "vColor.rgb *= instanceColor.rgb;",
          "vColor.rgb *= mix( vec3( 1.0 ), instanceColor.rgb, step( 0.5, aPart ) * step( aPart, 1.5 ) );",
        ) + "\nvPart = aPart;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vPart;\nuniform float uLamp;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        // the hue squared: at a high gain a plain hue washes pink, a squared one stays red
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vColor.rgb * step( 1.5, vPart ) * uLamp;",
      );
  };
  return m;
}

/** The body whose wheel every car borrows. */
const WHEEL_BODY: BodyKey = "sedan";

const matrix = new THREE.Matrix4();
const wheel = new THREE.Matrix4();
const place = new THREE.Vector3();
const turn = new THREE.Quaternion();
const unit = new THREE.Vector3(1, 1, 1);
const up = new THREE.Vector3(0, 1, 0);
// the bodies point down +z, the traffic simulation's yaw points +x
const NOSE = Math.PI / 2;
const white = new THREE.Color(1, 1, 1);

export type TrafficBodies = {
  /** Every mesh, to mount in the scene. */
  all: THREE.InstancedMesh[];
  /** Clears the counts at the start of a frame. */
  reset: () => void;
  /**
   * Adds one vehicle; returns false if it did not fit (never drawn). `travel`
   * is the meters it has rolled (its wheels turn by it), `steer` the angle of
   * its front wheels, `lit` whether its lamps throw a night glow (carGlow.ts);
   * a parked car passes none.
   */
  put: (
    body: BodyKey,
    color: THREE.Color,
    x: number,
    z: number,
    yaw: number,
    far: boolean,
    travel?: number,
    steer?: number,
    lit?: boolean,
  ) => boolean;
  /** Uploads the frame's matrices and colors, hides unused meshes. */
  flush: () => void;
};

/** The traffic bodies, `capacity` vehicles of each at most. */
export function useTrafficBodies(capacity: number): TrafficBodies {
  const gltfs = useGLTF(URLS);
  const day = useDaylight();
  const lamp = useMemo(() => ({ value: 0.5 }), []);
  const built = useMemo(() => {
    const material = trafficMaterial(lamp);
    const meshes = new Map<string, THREE.InstancedMesh>();
    BODY_KEYS.forEach((key, k) => {
      [false, true].forEach((lo, l) => {
        const gltf = gltfs[k * 2 + l];
        if (!gltf) throw new Error(`car body not loaded: ${key}`);
        const mesh = new THREE.InstancedMesh(
          mergedBody(bodyGeometry(gltf.scene)),
          material,
          capacity,
        );
        mesh.frustumCulled = false;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        // the color buffer exists up front, so the shader compiles with it
        mesh.setColorAt(0, white);
        mesh.count = 0;
        mesh.visible = false;
        meshes.set(`${key}${lo ? "-lo" : ""}`, mesh);
      });
    });
    // one wheel for every car: the sedan's, which every body's wheels are
    // sized from; instanced at four a car
    const wheels = [false, true].map((lo) => {
      const gltf = gltfs[BODY_KEYS.indexOf(WHEEL_BODY) * 2 + (lo ? 1 : 0)];
      if (!gltf) throw new Error("wheel body not loaded");
      const { tyre, rim } = bodyGeometry(gltf.scene);
      const mesh = new THREE.InstancedMesh(
        mergedBody({ tyre, rim }),
        material,
        capacity * WHEELS_PER_CAR,
      );
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.setColorAt(0, white);
      mesh.count = 0;
      mesh.visible = false;
      return mesh;
    });
    return { material, meshes, wheels, glow: createCarGlow(capacity) };
  }, [gltfs, capacity, lamp]);
  // the meshes with a body's own material: counted, flushed and hidden together
  const solid = useMemo(
    () => [...built.meshes.values(), ...built.wheels],
    [built],
  );
  const all = useMemo(() => [...solid, ...built.glow.meshes], [solid, built]);
  useEffect(() => {
    lamp.value = lampGain(day.neon);
    setCarLampGlow(day.neon);
    built.glow.night.value = day.neon;
  }, [lamp, built, day.neon]);
  useEffect(
    () => () => {
      for (const mesh of all) {
        mesh.geometry.dispose();
        mesh.dispose();
      }
      built.material.dispose();
      for (const mesh of built.glow.meshes)
        [mesh.material].flat().forEach((m) => m.dispose());
    },
    [all, built],
  );
  return useMemo(
    () => ({
      all,
      reset() {
        for (const mesh of solid) mesh.count = 0;
        built.glow.reset();
      },
      put(body, color, x, z, yaw, far, travel = 0, steer = 0, lit = false) {
        const mesh = built.meshes.get(`${body}${far ? "-lo" : ""}`);
        const wheels = built.wheels[far ? 1 : 0];
        if (
          !mesh ||
          mesh.count >= capacity ||
          wheels.count + WHEELS_PER_CAR > capacity * WHEELS_PER_CAR
        )
          return false;
        matrix.compose(
          place.set(x, 0, z),
          turn.setFromAxisAngle(up, yaw + NOSE),
          unit,
        );
        mesh.setMatrixAt(mesh.count, matrix);
        mesh.setColorAt(mesh.count, color);
        mesh.count++;
        // the wheels, sized from the shared wheel to this body's tyre
        const layout = BODY_WHEELS[body];
        const size = layout.radius / BODY_WHEELS[WHEEL_BODY].radius;
        for (let i = 0; i < WHEELS_PER_CAR; i++) {
          wheelMatrix(wheel, layout, i, travel, steer, size);
          wheels.setMatrixAt(wheels.count++, wheel.premultiply(matrix));
        }
        if (lit) built.glow.add(body, matrix);
        return true;
      },
      flush() {
        built.glow.flush();
        for (const mesh of solid) {
          mesh.visible = mesh.count > 0;
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
      },
    }),
    [all, solid, built, capacity],
  );
}
