// Instanced traffic made of the downloaded car bodies: one InstancedMesh per
// body and level of detail (near, and a -lo twin for distance and the low
// tier), every body's buckets merged into a single draw. The paint takes each
// car's own color from the instance color; lamps glow at night.
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BODY_KEYS, bodyUrl, type BodyKey } from "../../game/driving/bodies.ts";
import { bodyGeometry, mergedBody } from "./carBodies.ts";
import { useDaylight } from "./daylight.ts";

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
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * step( 1.5, vPart ) * uLamp;",
      );
  };
  return m;
}

const matrix = new THREE.Matrix4();
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
  /** Adds one vehicle; returns false if it did not fit (never drawn). */
  put: (
    body: BodyKey,
    color: THREE.Color,
    x: number,
    z: number,
    yaw: number,
    far: boolean,
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
    return { material, meshes };
  }, [gltfs, capacity, lamp]);
  const all = useMemo(() => [...built.meshes.values()], [built]);
  useEffect(() => {
    lamp.value = 0.3 + 2.4 * day.neon;
  }, [lamp, day.neon]);
  useEffect(
    () => () => {
      for (const mesh of all) {
        mesh.geometry.dispose();
        mesh.dispose();
      }
      built.material.dispose();
    },
    [all, built],
  );
  return useMemo(
    () => ({
      all,
      reset() {
        for (const mesh of all) mesh.count = 0;
      },
      put(body, color, x, z, yaw, far) {
        const mesh = built.meshes.get(`${body}${far ? "-lo" : ""}`);
        if (!mesh || mesh.count >= capacity) return false;
        matrix.compose(
          place.set(x, 0, z),
          turn.setFromAxisAngle(up, yaw + NOSE),
          unit,
        );
        mesh.setMatrixAt(mesh.count, matrix);
        mesh.setColorAt(mesh.count, color);
        mesh.count++;
        return true;
      },
      flush() {
        for (const mesh of all) {
          mesh.visible = mesh.count > 0;
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
      },
    }),
    [all, built, capacity],
  );
}
