import * as THREE from "three";

/**
 * Ground textures for instanced city surfaces. The road and sidewalk are a
 * few huge stretched boxes, so their UVs mean nothing; the shader samples
 * the maps by world position instead, `scale` repeats per meter.
 */
const loader = new THREE.TextureLoader();

function tex(path: string, srgb: boolean) {
  const t = loader.load(path);
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
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBoxScale = { value: scale };
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        "varying vec3 vBoxPos;\nvarying vec3 vBoxNormal;\nvoid main() {",
      )
      .replace(
        "#include <worldpos_vertex>",
        [
          "#include <worldpos_vertex>",
          "vec4 boxPos = vec4(transformed, 1.0);",
          "vec3 boxN = objectNormal;",
          "#ifdef USE_INSTANCING",
          "boxPos = instanceMatrix * boxPos;",
          "boxN = mat3(instanceMatrix) * boxN;",
          "#endif",
          "vBoxPos = (modelMatrix * boxPos).xyz;",
          "vBoxNormal = mat3(modelMatrix) * boxN;",
        ].join("\n"),
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        [
          "uniform float uBoxScale;",
          "varying vec3 vBoxPos;",
          "varying vec3 vBoxNormal;",
          "void main() {",
          "vec3 boxA = abs(vBoxNormal);",
          "vec2 boxUv = (boxA.y >= max(boxA.x, boxA.z) ? vBoxPos.xz",
          "  : boxA.x >= boxA.z ? vBoxPos.zy : vBoxPos.xy) * uBoxScale;",
        ].join("\n"),
      )
      .replaceAll("vMapUv", "boxUv")
      .replaceAll("vNormalMapUv", "boxUv")
      .replaceAll("vRoughnessMapUv", "boxUv");
  };
  material.customProgramCacheKey = () => `box${scale}`;
  return material;
}

const surfaces = new Map<string, THREE.MeshStandardMaterial>();
// box mapping ignores a texture's repeat, so every surface of a set shares one
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
        ...maps,
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
