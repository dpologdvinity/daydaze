// New York facades: the bays the city plan gives for the blocks near the
// player (src/game/city/nyc.ts), drawn from public/models/nyc/bays.glb (built
// from Quaternius' Downtown City MegaKit, CC0, by art/city/nyc_bays.py).
// One InstancedMesh per bay kind, all sharing one material: the brick photo
// box-mapped by world position (so it tiles at true size across bays) where a
// face is brick, flat stone, metal and trim elsewhere, and dark glass whose
// panes light up at night. Each vertex carries its color in COLOR_0 and two
// flags in TEXCOORD_0, renamed `aMat` here: x = glass, y = brick (the
// instance tint applies to brick only). CityScene hands over the bays on
// every plan reload (`cityBays`).

import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, type JSX } from "react";
import * as THREE from "three";
import {
  BAY_CAPACITY,
  BAY_KINDS,
  type BayInstance,
  type BayKind,
} from "../../game/city/nyc.ts";
import { createStore } from "../rooms/shared/store.ts";
import { disposeInstanced } from "./dispose.ts";
import { groundMaps, boxMapped } from "./worldTexture.ts";

const URL = "/models/nyc/bays.glb";

/** The bays near the player and where the plan was cut; set by CityScene. */
export const cityBays = createStore({ bays: [] as readonly BayInstance[] });

/** 0 by day, 1 at night: how brightly the panes glow (set by dimForDay). */
export const BAY_NIGHT = { value: 1 };

let material: THREE.MeshStandardMaterial | null = null;

/** The one material every bay shares; built on first use. Exported so the
 * day/night dimming can reach its wall glow like the other facades. */
export function bayMaterial(): THREE.MeshStandardMaterial {
  if (material) return material;
  const maps = groundMaps("brick_wall_02", { full: true });
  const m = boxMapped(
    new THREE.MeshStandardMaterial({
      ...maps,
      vertexColors: true,
      emissiveMap: maps.map,
      emissive: "#7060b0",
      emissiveIntensity: 0.75,
      roughness: 0.85,
    }),
    0.5,
    { weather: true },
  );
  const boxed = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    boxed.call(m, shader, renderer);
    shader.uniforms.uNight = BAY_NIGHT;
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        "attribute vec2 aMat;\nvarying vec2 vMat;\nvoid main() {\nvMat = aMat;",
      )
      .replace(
        "#include <color_vertex>",
        [
          "vColor = vec4(1.0);",
          "#ifdef USE_COLOR",
          "vColor.rgb *= color.rgb;",
          "#endif",
          "#ifdef USE_INSTANCING_COLOR",
          // the building's tint dyes brick only; stone and metal keep theirs
          "vColor.rgb *= mix(vec3(1.0), instanceColor.xyz, aMat.y);",
          "#endif",
        ].join("\n"),
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "varying vec2 vMat;\nuniform float uNight;\nvoid main() {",
      )
      .replace(
        "diffuseColor *= sampledDiffuseColor;",
        [
          // the photo's grain on brick; on stone and metal only its grime
          "float bayLum = dot(sampledDiffuseColor.rgb, vec3(0.299, 0.587, 0.114));",
          "vec3 bayGrime = vec3(mix(bayLum, 0.3, 0.75) * 2.4);",
          "diffuseColor.rgb *= mix(bayGrime, sampledDiffuseColor.rgb, vMat.y);",
        ].join("\n"),
      )
      .replace(
        "#include <emissivemap_fragment>",
        [
          "#include <emissivemap_fragment>",
          "if (vMat.x > 0.5) {",
          // a lit window per 3 m of wall and storey: warm, cool or pink
          "  vec3 cell = floor(vec3(vBoxP.x + vBoxP.z, vBoxP.y, vBoxP.x - vBoxP.z) / vec3(2.0, 3.0, 2.0));",
          "  float on = boxHash(cell.xy * 1.31 + cell.z * 7.7);",
          "  float tint = boxHash(cell.xy * 3.1 + cell.z * 1.9);",
          "  vec3 lamp = tint < 0.6 ? vec3(1.0, 0.72, 0.38) : tint < 0.85 ? vec3(0.55, 0.9, 1.0) : vec3(1.0, 0.5, 0.8);",
          "  // by day the panes mirror the sky, brighter toward the top of each storey; a few have curtains drawn",
          "  vec3 sky = mix(vec3(0.1, 0.16, 0.26), vec3(0.42, 0.56, 0.74), fract(vBoxP.y / 3.0));",
          "  vec3 dayGlass = boxHash(cell.xy * 2.3 + cell.z) > 0.8 ? vec3(0.34, 0.28, 0.22) : sky;",
          "  totalEmissiveRadiance = mix(dayGlass * 0.55, lamp * 0.8 * step(0.5, on), uNight);",
          "}",
        ].join("\n"),
      );
  };
  const key = m.customProgramCacheKey.bind(m);
  m.customProgramCacheKey = () => `${key()}|nyc-bays`;
  material = m;
  return m;
}

/** Copies an attribute as plain floats (the file stores quantized ones). */
function floats(
  a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  size: number,
) {
  const out = new Float32Array(a.count * size);
  for (let i = 0; i < a.count; i++) {
    out[i * size] = a.getX(i);
    out[i * size + 1] = a.getY(i);
    if (size > 2) out[i * size + 2] = a.getZ(i);
  }
  return new THREE.BufferAttribute(out, size);
}

/** A bay's geometry in bay space: float attributes, the node's quantization
 * transform baked in, colors cut to RGB, the glass/brick flags as `aMat`. */
function prepared(node: THREE.Mesh): THREE.BufferGeometry {
  const src = node.geometry as THREE.BufferGeometry;
  node.updateWorldMatrix(true, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", floats(src.getAttribute("position"), 3));
  g.setAttribute("normal", floats(src.getAttribute("normal"), 3));
  g.setAttribute("color", floats(src.getAttribute("color"), 3));
  const flags = floats(src.getAttribute("uv"), 2);
  // glTF flips V on export (v = 1 - brick); flip it back
  for (let i = 0; i < flags.count; i++) flags.setY(i, 1 - flags.getY(i));
  g.setAttribute("aMat", flags);
  g.setIndex(src.getIndex());
  g.applyMatrix4(node.matrixWorld);
  return g;
}

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const tint = new THREE.Color();
const up = new THREE.Vector3(0, 1, 0);

/** Writes every bay into its kind's mesh. */
function place(
  meshes: Record<BayKind, THREE.InstancedMesh>,
  bays: readonly BayInstance[],
) {
  const counts = Object.fromEntries(BAY_KINDS.map((k) => [k, 0])) as Record<
    BayKind,
    number
  >;
  for (const bay of bays) {
    const mesh = meshes[bay.kind];
    const i = counts[bay.kind];
    if (i >= BAY_CAPACITY) continue;
    q.setFromAxisAngle(up, bay.yaw);
    m4.compose(p.set(bay.x, bay.y, bay.z), q, s.set(bay.sx, bay.sy, 1));
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, tint.set(bay.color));
    counts[bay.kind] = i + 1;
  }
  for (const kind of BAY_KINDS) {
    const mesh = meshes[kind];
    mesh.count = counts[kind];
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

export function NycFacades(): JSX.Element {
  const gltf = useGLTF(URL);
  const meshes = useMemo(() => {
    const out = {} as Record<BayKind, THREE.InstancedMesh>;
    for (const kind of BAY_KINDS) {
      const node = gltf.scene.getObjectByName(kind);
      if (!(node instanceof THREE.Mesh))
        throw new Error(`bays.glb has no ${kind}`);
      const mesh = new THREE.InstancedMesh(
        prepared(node),
        bayMaterial(),
        BAY_CAPACITY,
      );
      mesh.count = 0;
      mesh.frustumCulled = false;
      // colors exist from the start so the shader keeps one program
      mesh.setColorAt(0, tint.set("#ffffff"));
      out[kind] = mesh;
    }
    return out;
  }, [gltf]);
  // the geometry copies and instance buffers go with the city; the one
  // shared material stays for the next visit
  useEffect(
    () => () => disposeInstanced(Object.values(meshes), false),
    [meshes],
  );
  const { bays } = cityBays.use();
  const invalidate = useThree((state) => state.invalidate);
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    place(meshes, bays);
    // a still or paused frame loop draws only when asked
    invalidate();
    // read by the screenshot script: the bays are in and placed
    if (bays.length > 0) canvas.dataset.bays = "ready";
  }, [meshes, bays, invalidate, canvas]);
  return (
    <>
      {BAY_KINDS.map((kind) => (
        <primitive key={kind} object={meshes[kind]} />
      ))}
    </>
  );
}

useGLTF.preload(URL);
