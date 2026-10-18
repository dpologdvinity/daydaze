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
