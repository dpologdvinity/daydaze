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

function tex(path: string, srgb: boolean, full = false) {
  const t =
    lean && !srgb && !full
      ? standIn(path.endsWith("/nor.webp") ? FLAT_NORMAL : FULL_ROUGH)
      : loader.load(path);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Poly Haven CC0 set in public/textures/<id>/ (diff, nor, rough). `full`
 * loads the normal and roughness maps even on the low tier. */
export function groundMaps(id: string, { full = false } = {}) {
  return {
    map: tex(`/textures/${id}/diff.webp`, true),
    normalMap: tex(`/textures/${id}/nor.webp`, false, full),
    roughnessMap: tex(`/textures/${id}/rough.webp`, false, full),
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

// Value noise on world position, shared by the box-mapped shaders: cheap
// enough to run per pixel, smooth enough to read as weathering.
const NOISE = [
  "float boxHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
  "float boxNoise(vec2 p) {",
  "  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);",
  "  return mix(mix(boxHash(i), boxHash(i + vec2(1.0, 0.0)), f.x),",
  "             mix(boxHash(i + vec2(0.0, 1.0)), boxHash(i + vec2(1.0, 1.0)), f.x), f.y);",
  "}",
].join("\n");

/**
 * Box mapping: samples the maps by world position on the plane the surface
 * faces most (floor XZ, wall XY or ZY), `scale` repeats per meter. Any box,
 * wall or counter tiles at true size with no UV work.
 *
 * The color map is sampled twice at offsets picked by low-frequency noise and
 * blended, so the photo's repeat never lines up into a grid (Quilez's
 * technique 3, https://iquilezles.org/articles/texturerepetition/), and a
 * broad mottling varies it across a wall. `weather` (building walls) also
 * darkens toward the street and streaks the walls with grime, so they read
 * as textured from a distance, not as flat painted blocks.
 */
export function boxMapped<M extends THREE.MeshStandardMaterial>(
  material: M,
  scale: number,
  { weather = false } = {},
): M {
  // the scale rides in each map's own transform (repeat), so every
  // box-mapped material shares one shader program; the maps must be this
  // material's own (clones share the GPU image)
  for (const t of [material.map, material.normalMap, material.roughnessMap])
    t?.repeat.set(scale, scale);
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "void main() {",
      "varying vec3 vBoxP;\nvoid main() {",
    );
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
        "vBoxP = boxP;",
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
        "#ifdef USE_EMISSIVEMAP",
        "vEmissiveMapUv = (emissiveMapTransform * vec3(boxUv, 1.0)).xy;",
        "#endif",
      ].join("\n"),
    );
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", `varying vec3 vBoxP;\n${NOISE}\nvoid main() {`)
      .replace(
        "#include <map_fragment>",
        [
          "#ifdef USE_MAP",
          // two samples at noise-picked offsets, blended: no visible repeat
          "float bk = boxNoise(vBoxP.xz * 0.11 + vBoxP.y * 0.07) * 8.0;",
          "float bi = floor(bk); float bf = fract(bk);",
          "vec2 bOffA = sin(vec2(3.0, 7.0) * bi);",
          "vec2 bOffB = sin(vec2(3.0, 7.0) * (bi + 1.0));",
          "vec4 bColA = texture2D(map, vMapUv + bOffA);",
          "vec4 bColB = texture2D(map, vMapUv + bOffB);",
          "vec4 sampledDiffuseColor = mix(bColA, bColB,",
          "  smoothstep(0.2, 0.8, bf - 0.1 * dot(bColA.rgb - bColB.rgb, vec3(1.0))));",
          // broad mottling, a few meters across
          "float bMacro = boxNoise(vBoxP.xz * 0.045 + vBoxP.y * 0.03);",
          "sampledDiffuseColor.rgb *= mix(0.82, 1.1, bMacro);",
          "#ifdef BOX_WEATHER",
          // grime pooled toward the street and streaks running down the wall
          "float bStreak = boxNoise(vec2((vBoxP.x + vBoxP.z) * 1.7, vBoxP.y * 0.12));",
          "sampledDiffuseColor.rgb *= mix(0.62, 1.0, smoothstep(0.0, 5.0, vBoxP.y));",
          "sampledDiffuseColor.rgb *= mix(0.78, 1.0, smoothstep(0.25, 0.75, bStreak));",
          "#endif",
          "diffuseColor *= sampledDiffuseColor;",
          "#endif",
        ].join("\n"),
      );
  };
  if (weather) material.defines = { ...material.defines, BOX_WEATHER: "" };
  material.customProgramCacheKey = () => (weather ? "box-weather" : "box");
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
