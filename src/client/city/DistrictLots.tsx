// District lots: the finished buildings of Quaternius' Ultimate Textured
// Building Pack (CC0, public/models/districts/lots.glb, built by
// art/city/district_blocks.py) standing along the blocks of Little Manila,
// Chinatown, Koreatown, the Arts District and Uptown, at the spots the city
// plan gives (src/game/city/districts.ts). One InstancedMesh2 per model with
// a far twin (the plan marks which lots are far), all sharing one material.
//
// The pack paints with a 32 px palette (4 by 4 swatches: wall, trim, roof,
// door, glass...), and every face of every model sits at the center of one
// swatch. The material keeps a tall atlas of every district palette
// (PALETTES), one 4 by 4 block each; each lot's palette rides in the red
// channel of its instance color (index / 32), and the vertex shader moves the
// lot's UVs into its block. So one model wears every district's colors. The
// walls get grime and streaks by world position, a faint violet glow at
// night like the bays, and the glass swatch lights its windows by night
// (a lamp here and there, as on the New York bays) and mirrors the sky by day.
// CityScene hands over the lots on every plan reload (`cityLots`).

import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useState, type JSX } from "react";
import * as THREE from "three";
import { InstancedMesh2, patchShader } from "@three.ez/instanced-mesh";
import {
  LOT_CAPACITY,
  LOT_MODELS,
  PALETTES,
  SWATCH,
  swatchColors,
  type LotModel,
  type PlacedLot,
} from "../../game/city/districts.ts";
import { createStore } from "../rooms/shared/store.ts";

const URL = "/models/districts/lots.glb";

/** The lots near the player and where the plan was cut; set by CityScene. */
export const cityLots = createStore({ lots: [] as readonly PlacedLot[] });

/** 0 by day, 1 at night: how brightly the panes glow (set by dimForDay). */
export const LOT_NIGHT = { value: 1 };

/** Instance color red = palette / PALETTE_CODE, decoded with rounding. */
const PALETTE_CODE = 32;

/** The atlas of every palette: 4 texels wide, 4 tall per palette, one texel
 * per swatch. glTF UVs run V down from the top row (v = 0), so palette p's
 * swatch (row r from the top, column c) sits at texel (c, 4p + r) and a lot's
 * UV v just needs shifting into block p. */
function paletteAtlas(): THREE.DataTexture {
  const data = new Uint8Array(4 * 4 * PALETTES.length * 4);
  PALETTES.forEach((palette, p) => {
    swatchColors(palette).forEach((hex, i) => {
      const rgb = Number.parseInt(hex.slice(1), 16);
      const at = ((4 * p + Math.floor(i / 4)) * 4 + (i % 4)) * 4;
      data[at] = (rgb >> 16) & 255;
      data[at + 1] = (rgb >> 8) & 255;
      data[at + 2] = rgb & 255;
      data[at + 3] = 255;
    });
  });
  const texture = new THREE.DataTexture(data, 4, 4 * PALETTES.length);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

// Value noise on world position for the weathering and the lit windows.
const NOISE = [
  "float lotHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
  "float lotNoise(vec2 p) {",
  "  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);",
  "  return mix(mix(lotHash(i), lotHash(i + vec2(1.0, 0.0)), f.x),",
  "             mix(lotHash(i + vec2(0.0, 1.0)), lotHash(i + vec2(1.0, 1.0)), f.x), f.y);",
  "}",
].join("\n");

let material: THREE.MeshStandardMaterial | null = null;

/** The one material every lot shares; built on first use. */
function lotMaterial(): THREE.MeshStandardMaterial {
  if (material) return material;
  const m = new THREE.MeshStandardMaterial({
    map: paletteAtlas(),
    vertexColors: true,
    roughness: 0.9,
  });
  const glass = SWATCH.glass;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = LOT_NIGHT;
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        "varying float vGlass;\nvarying vec3 vWorld;\nvoid main() {",
      )
      .replace(
        "#include <color_vertex>",
        [
          "#include <color_vertex>",
          // the pack's swatch under this vertex (every face sits at a swatch
          // center), then the UVs moved into this lot's palette block
          `vGlass = step(abs(floor(vMapUv.x * 4.0) + floor(vMapUv.y * 4.0) * 4.0 - ${glass}.0), 0.5);`,
          `vMapUv.y = (vMapUv.y + floor(vColor.r * ${PALETTE_CODE}.0 + 0.5)) / ${PALETTES.length}.0;`,
        ].join("\n"),
      )
      .replace(
        "#include <worldpos_vertex>",
        [
          "#include <worldpos_vertex>",
          "vec4 lotPos = vec4(transformed, 1.0);",
          "#ifdef USE_INSTANCING",
          "lotPos = instanceMatrix * lotPos;",
          "#endif",
          "vWorld = (modelMatrix * lotPos).xyz;",
        ].join("\n"),
      );
    // InstancedMesh2 draws through USE_INSTANCING_INDIRECT: patch our chunks
    shader.vertexShader = patchShader(shader.vertexShader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        `varying float vGlass;\nvarying vec3 vWorld;\nuniform float uNight;\n${NOISE}\nvoid main() {`,
      )
      .replace(
        // the instance color carried the palette, not a tint
        "#include <color_fragment>",
        [
          "float lotKeep = 1.0 - vGlass;",
          // grime pooled toward the street, streaks running down the wall,
          // a broad mottling a few meters across
          "float lotGrime = mix(0.62, 1.0, smoothstep(0.0, 4.0, vWorld.y));",
          "float lotStreak = lotNoise(vec2((vWorld.x + vWorld.z) * 1.7, vWorld.y * 0.12));",
          "float lotMottle = lotNoise(vWorld.xz * 0.3 + vWorld.y * 0.15);",
          "diffuseColor.rgb *= mix(1.0, lotGrime * mix(0.8, 1.0, smoothstep(0.25, 0.75, lotStreak)) * mix(0.88, 1.08, lotMottle), lotKeep);",
        ].join("\n"),
      )
      .replace(
        "#include <emissivemap_fragment>",
        [
          "#include <emissivemap_fragment>",
          // a faint violet glow so the dark side of the street still reads
          "totalEmissiveRadiance += diffuseColor.rgb * vec3(0.44, 0.38, 0.69) * 0.55 * (0.1 + 0.9 * uNight) * lotKeep;",
          "if (vGlass > 0.5) {",
          // a lit window per 2.4 m of wall and 3.2 m of storey: warm, cool or pink
          "  vec3 cell = floor(vec3(vWorld.x + vWorld.z, vWorld.y, vWorld.x - vWorld.z) / vec3(2.4, 3.2, 2.4));",
          "  float on = lotHash(cell.xy * 1.31 + cell.z * 7.7);",
          "  float tint = lotHash(cell.xy * 3.1 + cell.z * 1.9);",
          "  vec3 lamp = tint < 0.6 ? vec3(1.0, 0.72, 0.38) : tint < 0.85 ? vec3(0.55, 0.9, 1.0) : vec3(1.0, 0.5, 0.8);",
          // by day the panes mirror the sky, brighter toward the top of each storey
          "  vec3 sky = mix(vec3(0.1, 0.16, 0.26), vec3(0.42, 0.56, 0.74), fract(vWorld.y / 3.2));",
          "  totalEmissiveRadiance = mix(sky * 0.5, lamp * 0.8 * step(0.45, on), uNight);",
          "}",
        ].join("\n"),
      );
  };
  m.customProgramCacheKey = () => "district-lots";
  material = m;
  return m;
}

/** Copies an attribute as plain floats (the file stores quantized ones). */
function floats(
  a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  size: number,
): THREE.BufferAttribute {
  const out = new Float32Array(a.count * size);
  for (let i = 0; i < a.count; i++) {
    out[i * size] = a.getX(i);
    out[i * size + 1] = a.getY(i);
    if (size > 2) out[i * size + 2] = a.getZ(i);
  }
  return new THREE.BufferAttribute(out, size);
}

/** A model's geometry in lot space: float attributes, the node's quantization
 * transform baked in, and a white vertex color (the material wants one; the
 * instance color then carries the palette). */
function prepared(node: THREE.Mesh): THREE.BufferGeometry {
  const src = node.geometry;
  node.updateWorldMatrix(true, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", floats(src.getAttribute("position"), 3));
  g.setAttribute("normal", floats(src.getAttribute("normal"), 3));
  g.setAttribute("uv", floats(src.getAttribute("uv"), 2));
  g.setAttribute(
    "color",
    new THREE.BufferAttribute(
      new Float32Array(src.getAttribute("position").count * 3).fill(1),
      3,
    ),
  );
  g.setIndex(src.getIndex());
  g.applyMatrix4(node.matrixWorld);
  return g;
}

const tint = new THREE.Color();
const up = new THREE.Vector3(0, 1, 0);

type LotMesh = { model: LotModel; far: boolean; mesh: InstancedMesh2 };

/** Writes every lot into its model's mesh. */
function place(meshes: readonly LotMesh[], lots: readonly PlacedLot[]) {
  for (const { model, far, mesh } of meshes) {
    const list = lots
      .filter((lot) => lot.model === model && lot.far === far)
      .slice(0, LOT_CAPACITY);
    mesh.clearInstances();
    mesh.addInstances(list.length, (obj, i) => {
      const lot = list[i];
      obj.position.set(lot.x, 0, lot.z);
      obj.quaternion.setFromAxisAngle(up, lot.yaw);
      obj.scale.set(lot.sx, lot.sy, lot.sx);
      // the palette index, read back by the vertex shader (see lotMaterial)
      obj.color = tint.setRGB(lot.palette / PALETTE_CODE, 0, 0);
    });
  }
}

export function DistrictLots(): JSX.Element | null {
  const gltf = useGLTF(URL);
  const [meshes, setMeshes] = useState<readonly LotMesh[]>([]);
  // built and disposed in the effect, so a StrictMode remount (cleanup, then
  // setup again) gets fresh meshes instead of reusing disposed ones; the one
  // shared material stays for the next visit
  useEffect(() => {
    const node = (name: string): THREE.Mesh => {
      const found = gltf.scene.getObjectByName(name);
      if (!(found instanceof THREE.Mesh))
        throw new Error(`lots.glb has no ${name}`);
      return found;
    };
    const built = LOT_MODELS.flatMap((model) =>
      [false, true].map((far) => ({
        model,
        far,
        mesh: new InstancedMesh2(
          prepared(node(far ? `${model}_lo` : model)),
          lotMaterial(),
          { capacity: LOT_CAPACITY },
        ),
      })),
    );
    setMeshes(built);
    return () => {
      for (const { mesh } of built) {
        mesh.geometry.dispose();
        mesh.dispose();
      }
    };
  }, [gltf]);
  const { lots } = cityLots.use();
  const invalidate = useThree((state) => state.invalidate);
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    place(meshes, lots);
    // a still or paused frame loop draws only when asked
    invalidate();
    // read by the screenshot script: the lots are in and placed
    if (lots.length > 0 && meshes.length > 0) canvas.dataset.lots = "ready";
  }, [meshes, lots, invalidate, canvas]);
  return (
    <>
      {meshes.map(({ model, far, mesh }) => (
        <primitive key={`${model}${far}`} object={mesh} />
      ))}
    </>
  );
}

useGLTF.preload(URL);
