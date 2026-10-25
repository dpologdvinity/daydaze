import * as THREE from "three";
import { SAVE_KEY } from "../../game/save.ts";
import { bootTier } from "../flags.ts";

/**
 * Ground textures for instanced city surfaces. The road and sidewalk are a
 * few huge stretched boxes, so their UVs mean nothing; the shader samples
 * the maps by world position instead, `scale` repeats per meter.
 */
const loader = new THREE.TextureLoader();

/**
 * A visit that starts on the low tier (`?quality=low` or the saved setting)
 * skips the normal and roughness maps, two thirds of every set's download:
 * each is a one-pixel neutral stand-in instead (flat normal, roughness as the
 * material sets it), so materials, shaders and callers stay the same.
 */
const lean = (() => {
  try {
    return bootTier(location.search, localStorage.getItem(SAVE_KEY)) === "low";
  } catch {
    return false; // no storage, or not in a browser: the full sets
  }
})();

const FLAT_NORMAL = new Uint8Array([128, 128, 255, 255]);
const FULL_ROUGH = new Uint8Array([255, 255, 255, 255]);

function standIn(pixel: Uint8Array) {
  const t = new THREE.DataTexture(pixel, 1, 1);
  t.needsUpdate = true;
  return t;
}

function tex(path: string, srgb: boolean) {
  const t =
    lean && !srgb
      ? standIn(path.endsWith("/nor.webp") ? FLAT_NORMAL : FULL_ROUGH)
      : loader.load(path);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Poly Haven CC0 set in public/textures/<id>/ (diff, nor, rough). */
export function groundMaps(id: string) {
  return {
    map: tex(`/textures/${id}/diff.webp`, true),
    normalMap: tex(`/textures/${id}/nor.webp`, false),
    roughnessMap: tex(`/textures/${id}/rough.webp`, false),
  };
}

export function worldMapped<M extends THREE.MeshStandardMaterial>(
  material: M,
  scale: number,
): M {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.uWorldScale = { value: scale };
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying vec2 vWorldXZ;\nvoid main() {")
      .replace(
        "#include <worldpos_vertex>",
        [
          "#include <worldpos_vertex>",
          "vec4 groundPos = vec4(transformed, 1.0);",
          "#ifdef USE_INSTANCING",
          "groundPos = instanceMatrix * groundPos;",
          "#endif",
          "vWorldXZ = (modelMatrix * groundPos).xz;",
        ].join("\n"),
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "uniform float uWorldScale;\nvarying vec2 vWorldXZ;\nvoid main() {",
      )
      .replaceAll("vMapUv", "(vWorldXZ * uWorldScale)")
      .replaceAll("vNormalMapUv", "(vWorldXZ * uWorldScale)")
      .replaceAll("vRoughnessMapUv", "(vWorldXZ * uWorldScale)");
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}|world${scale}`;
  return material;
}

const tiled = new Map<string, ReturnType<typeof groundMaps>>();

/** A Poly Haven set tiled over a plane of `width` by `depth` meters, with
 * `scale` repeats per meter; shared by every floor that asks for the same. */
export function tiledMaps(
  id: string,
  width: number,
  depth: number,
  scale: number,
) {
  const key = `${id}|${width}|${depth}|${scale}`;
  let maps = tiled.get(key);
  if (!maps) {
    maps = groundMaps(id);
    for (const t of Object.values(maps))
      t.repeat.set(width * scale, depth * scale);
    tiled.set(key, maps);
  }
  return maps;
}

/**
 * Box mapping: samples the maps by world position on the plane the surface
 * faces most (floor XZ, wall XY or ZY), `scale` repeats per meter. Any box,
 * wall or counter tiles at true size with no UV work.
 */
export function boxMapped<M extends THREE.MeshStandardMaterial>(
  material: M,
  scale: number,
): M {
  // the scale rides in each map's own transform (repeat), so every
  // box-mapped material shares one shader program; the maps must be this
  // material's own (clones share the GPU image)
  for (const t of [material.map, material.normalMap, material.roughnessMap])
    t?.repeat.set(scale, scale);
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <worldpos_vertex>",
      [
        "#include <worldpos_vertex>",
        "vec4 boxPos = vec4(transformed, 1.0);",
        "vec3 boxN = objectNormal;",
        "#ifdef USE_INSTANCING",
        "boxPos = instanceMatrix * boxPos;",
        "boxN = mat3(instanceMatrix) * boxN;",
        "#endif",
        "vec3 boxP = (modelMatrix * boxPos).xyz;",
        "vec3 boxA = abs(mat3(modelMatrix) * boxN);",
        // planar per face: exact for flat faces, which box mapping is for
        "vec2 boxUv = boxA.y >= max(boxA.x, boxA.z) ? boxP.xz",
        "  : boxA.x >= boxA.z ? boxP.zy : boxP.xy;",
        "#ifdef USE_MAP",
        "vMapUv = (mapTransform * vec3(boxUv, 1.0)).xy;",
        "#endif",
        "#ifdef USE_NORMALMAP",
        "vNormalMapUv = (normalMapTransform * vec3(boxUv, 1.0)).xy;",
        "#endif",
        "#ifdef USE_ROUGHNESSMAP",
        "vRoughnessMapUv = (roughnessMapTransform * vec3(boxUv, 1.0)).xy;",
        "#endif",
      ].join("\n"),
    );
  };
  material.customProgramCacheKey = () => "box";
  return material;
}

const surfaces = new Map<string, THREE.MeshStandardMaterial>();
// each surface clones its set's textures (sharing the GPU image) to carry
// its own repeat
const boxMaps = new Map<string, ReturnType<typeof groundMaps>>();

/**
 * A shared, box-mapped PBR material from a CC0 set in public/textures/<id>/
 * (fetched by scripts/fetch-textures.ts). `color` tints the photo; `scale`
 * repeats per meter. Same arguments, same material, across every room.
 */
export function surface(
  id: string,
  {
    scale = 1,
    color = "#ffffff",
    metalness = 0,
    roughness = 1,
    emissive = "#000000",
    emissiveIntensity = 0,
    normalScale = 1,
  }: {
    scale?: number;
    color?: string;
    metalness?: number;
    roughness?: number;
    emissive?: string;
    emissiveIntensity?: number;
    normalScale?: number;
  } = {},
): THREE.MeshStandardMaterial {
  const key = [
    id,
    scale,
    color,
    metalness,
    roughness,
    emissive,
    emissiveIntensity,
    normalScale,
  ].join("|");
  let m = surfaces.get(key);
  if (!m) {
    let maps = boxMaps.get(id);
    if (!maps) {
      maps = groundMaps(id);
      boxMaps.set(id, maps);
    }
    m = boxMapped(
      new THREE.MeshStandardMaterial({
        map: maps.map.clone(),
        normalMap: maps.normalMap.clone(),
        roughnessMap: maps.roughnessMap.clone(),
        color,
        metalness,
        roughness,
        emissive,
        emissiveIntensity,
        normalScale: new THREE.Vector2(normalScale, normalScale),
      }),
      scale,
    );
    surfaces.set(key, m);
  }
  return m;
}
