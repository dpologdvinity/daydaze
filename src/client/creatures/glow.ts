// Self-lit creature materials: a fish in a lit tank is bright from inside as
// well as from the lights around it, so a model's own colors (vertex colors
// included) are added to its emitted light at a fraction `k`. One material
// per (source material, k) pair, shared by every fish of that species.
import * as THREE from "three";

const cache = new WeakMap<THREE.Material, Map<number, THREE.Material>>();

/** `material` made to glow with its own color at strength `k` (0 leaves it be). */
export function lit(material: THREE.Material, k: number): THREE.Material {
  if (k <= 0 || !(material instanceof THREE.MeshStandardMaterial)) {
    return material;
  }
  let byK = cache.get(material);
  if (!byK) cache.set(material, (byK = new Map()));
  let made = byK.get(k);
  if (!made) {
    const m = material.clone();
    m.onBeforeCompile = (shader) => {
      // diffuseColor already holds color * vertex color at this point
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * ${k.toFixed(3)};`,
      );
    };
    m.customProgramCacheKey = () => `glow${k.toFixed(3)}`;
    byK.set(k, (made = m));
  }
  return made;
}
