// The dream city's authored architecture, including its distant silhouettes.
// Blender exports one colored mesh per family and LOD; the surface flags let
// all twenty-four meshes share textured stone, brass, foliage and lit glass.
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { patchShader } from "@three.ez/instanced-mesh";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { DREAM_KINDS, type DreamSpot } from "../../game/city/dream.ts";
import { createStore } from "../rooms/shared/store.ts";
import { useDetail, useGraphics } from "../world/quality.ts";
import { bakedGeometry } from "../world/bakedGeometry.ts";
import { useDaylight } from "./daylight.ts";
import { boxMapped, groundMaps, groundOcclusion } from "./worldTexture.ts";
import {
  createDreamMesh,
  placeDreamMeshes,
  type FamilyMesh,
} from "./dreamMeshes.ts";

import { DreamLandmarkBuilding, isLandmark } from "./DreamLandmarks.tsx";
import { isMesh } from "../world/guards.ts";

const URL = "/models/city-dream/architecture.glb";

/** Updated with the city plan, after movement or a camera-detail change. */
export const cityDream = createStore<{ spots: readonly DreamSpot[] }>({
  spots: [],
});

/** Surface flags survive meshopt quantization; UV.y is unused. */
function architectureMaterial(
  night: { value: number },
  onReady: () => void,
  realism: { graffiti: THREE.Texture; occlusion: THREE.Texture } | null,
  reflections: boolean,
) {
  const maps = groundMaps("stone_tile_wall", { full: true });
  const loader = new THREE.TextureLoader();
  let loaded = 0;
  const copper = ["diff", "nor", "surface"].map((name) => {
    const texture = loader.load(`/textures/city_copper/${name}.webp`, () => {
      if (++loaded === 3) onReady();
    });
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    if (name === "diff") texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
  const [copperColor, copperNormal, copperSurface] = copper;
  const material = boxMapped(
    new THREE.MeshStandardMaterial({
      ...maps,
      aoMap: realism?.occlusion ?? null,
      aoMapIntensity: 0.65,
      vertexColors: true,
      roughness: 0.76,
      normalScale: new THREE.Vector2(0.55, 0.55),
      emissive: "#ffffff",
      emissiveIntensity: 1,
    }),
    0.32,
  );
  // These textures belong to this material, including under StrictMode remounts.
  material.addEventListener("dispose", () => {
    for (const texture of copper) texture.dispose();
  });
  const boxed = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    boxed.call(material, shader, renderer);
    shader.uniforms.uDreamNight = night;
    if (realism) shader.uniforms.uGraffiti = { value: realism.graffiti };
    shader.uniforms.uCopperColor = { value: copperColor };
    shader.uniforms.uCopperNormal = { value: copperNormal };
    shader.uniforms.uCopperSurface = { value: copperSurface };
    shader.vertexShader = shader.vertexShader.replace(
      "void main() {",
      "attribute float aSurface;\nattribute float aDistant;\nvarying float vSurface;\nvarying float vDistant;\nvarying vec3 vArchitectureP;\nvarying vec3 vArchitectureN;\nvoid main() {\nvSurface = aSurface;\nvDistant = aDistant;\nvArchitectureP = position;\nvArchitectureN = normal;",
    );
    shader.vertexShader = patchShader(shader.vertexShader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "varying float vSurface;\nvarying float vDistant;\nvarying vec3 vArchitectureP;\nvarying vec3 vArchitectureN;\nuniform float uDreamNight;\nuniform sampler2D uCopperColor;\nuniform sampler2D uCopperNormal;\nuniform sampler2D uCopperSurface;\n#ifdef DREAM_DETAIL\nuniform sampler2D uGraffiti;\n#endif\nvoid main() {",
      )
      .replace(
        "#include <color_fragment>",
        [
          "#include <color_fragment>",
          // Distant stone keeps arched openings without adding meshes. The
          // pattern lives in model space, so it follows every family's body
          // and remains fixed as the camera or player moves.
          "vec2 dreamFace = abs(vArchitectureN.x) > abs(vArchitectureN.z) ? vArchitectureP.zy : vArchitectureP.xy;",
          "vec2 dreamCell = fract((dreamFace + vec2(0.0, 0.4)) / vec2(4.0, 3.8));",
          "float dreamJamb = 1.0 - smoothstep(0.24, 0.28, abs(dreamCell.x - 0.5));",
          "float dreamLower = dreamJamb * smoothstep(0.14, 0.18, dreamCell.y) * (1.0 - smoothstep(0.64, 0.68, dreamCell.y));",
          "float dreamRound = 1.0 - smoothstep(0.94, 1.04, length((dreamCell - vec2(0.5, 0.65)) / vec2(0.26, 0.2)));",
          "float dreamOpening = max(dreamLower, dreamRound);",
          "float dreamDistantWindow = dreamOpening * step(0.5, vDistant) * (1.0 - step(0.1, vSurface)) * (1.0 - smoothstep(0.2, 0.45, abs(vArchitectureN.y))) * smoothstep(0.6, 1.0, vArchitectureP.y) * (1.0 - smoothstep(14.6, 15.2, vArchitectureP.y));",
          "diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.065, 0.07), dreamDistantWindow);",
        ].join("\n"),
      )
      .replace(
        /#ifdef USE_MAP\nfloat bk =[\s\S]*?diffuseColor \*= sampledDiffuseColor;\n#endif/,
        [
          // Keep the stone courses aligned; randomly offset texture samples
          // would break the mortar lines. Copper uses its own aligned projection.
          "float dreamStone = 1.0 - smoothstep(0.06, 0.14, vSurface);",
          "float dreamBrass = 1.0 - smoothstep(0.04, 0.1, abs(vSurface - 0.25));",
          // Local projection preserves roof detail through instance transforms
          // and LOD changes; no random offsets separate color and PBR channels.
          "vec3 dreamAxes = abs(vArchitectureN);",
          "vec2 dreamCopperUv = (dreamAxes.y >= max(dreamAxes.x, dreamAxes.z) ? vArchitectureP.xz : dreamAxes.x >= dreamAxes.z ? vArchitectureP.zy : vArchitectureP.xy) * 0.23;",
          "vec3 dreamCopper = texture2D(uCopperColor, dreamCopperUv).rgb;",
          "vec2 dreamCopperPbr = texture2D(uCopperSurface, dreamCopperUv).gb;",
          "vec3 dreamRoofColor = mix(diffuseColor.rgb * (0.55 + dreamCopper * 1.7), dreamCopper, 0.36);",
          "diffuseColor.rgb = mix(diffuseColor.rgb, dreamRoofColor, dreamBrass);",
          "vec3 dreamMasonry = texture2D(map, vMapUv).rgb * 1.6 + 0.2;",
          "diffuseColor.rgb *= mix(vec3(1.0), dreamMasonry, dreamStone);",
          "float dreamFoot = smoothstep(0.0, 2.0, vBoxP.y);",
          "diffuseColor.rgb *= mix(1.0, mix(0.79, 1.0, dreamFoot), dreamStone);",
          "#ifdef DREAM_DETAIL",
          // Project the painted tag onto the masonry of Bassline's west wall.
          "vec2 tagUv = (vBoxP.zy - vec2(61.3, 0.1)) / vec2(3.4);",
          "if (vBoxP.x > 135.9 && vBoxP.x < 137.4 && all(greaterThan(tagUv, vec2(0.0))) && all(lessThan(tagUv, vec2(1.0)))) {",
          "  vec4 tag = texture2D(uGraffiti, tagUv);",
          "  diffuseColor.rgb = mix(diffuseColor.rgb, tag.rgb, tag.a * dreamStone * 0.75);",
          "}",
          "#endif",
        ].join("\n"),
      )
      .replace(
        "#include <normal_fragment_maps>",
        THREE.ShaderChunk.normal_fragment_maps
          .replace(
            "vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;",
            "vec3 mapN = mix(texture2D(normalMap, vNormalMapUv).xyz, texture2D(uCopperNormal, dreamCopperUv).xyz, dreamBrass) * 2.0 - 1.0;",
          )
          .replace(
            "mapN.xy *= normalScale;",
            "mapN.xy *= normalScale * (dreamStone + dreamBrass * 0.65);",
          )
          // The copper projection rotates with each building. Derive its
          // own frame so normal detail follows the same UVs as its patina.
          .replace(
            "normal = normalize( tbn * mapN );",
            "mat3 dreamCopperFrame = getTangentFrame(-vViewPosition, normal, dreamCopperUv);\nnormal = normalize(mix(tbn * mapN, dreamCopperFrame * mapN, dreamBrass));",
          ),
      )
      .replace(
        "#include <roughnessmap_fragment>",
        [
          "#include <roughnessmap_fragment>",
          "float dreamGlass = 1.0 - smoothstep(0.04, 0.1, abs(vSurface - 0.5));",
          "roughnessFactor = mix(roughnessFactor, clamp(dreamCopperPbr.x, 0.28, 0.92), dreamBrass);",
          "roughnessFactor = mix(roughnessFactor, 0.18, dreamGlass);",
          "diffuseColor.rgb *= mix(1.0, 0.42, dreamGlass);",
        ].join("\n"),
      )
      .replace(
        "#include <metalnessmap_fragment>",
        [
          "#include <metalnessmap_fragment>",
          "metalnessFactor = mix(metalnessFactor, dreamCopperPbr.y * 0.72, dreamBrass);",
          "#ifdef DREAM_REFLECTIONS",
          "metalnessFactor = mix(metalnessFactor, 0.62, dreamGlass);",
          "#endif",
        ].join("\n"),
      )
      .replace(
        "#include <emissivemap_fragment>",
        [
          "#include <emissivemap_fragment>",
          // Opaque glazing avoids hundreds of transparent layers. Its sky
          // reflection by day gives way to warm interior light after dark.
          "vec3 dreamSky = mix(vec3(0.16, 0.25, 0.32), vec3(0.46, 0.69, 0.75), clamp(normal.y * 0.5 + 0.5, 0.0, 1.0));",
          "vec3 dreamLit = mix(vec3(1.0, 0.68, 0.34), vColor.rgb * 1.6, 0.3);",
          "float dreamWindow = mix(0.7, 1.0, step(0.24, boxHash(floor(vBoxP.xz * 0.4) + floor(vBoxP.y * 0.3))));",
          "totalEmissiveRadiance = dreamGlass * mix(dreamSky * 0.2, dreamLit * dreamWindow * 0.16, uDreamNight);",
          "totalEmissiveRadiance += dreamDistantWindow * mix(vec3(0.025, 0.065, 0.075), vec3(0.32, 0.18, 0.07), uDreamNight);",
          "totalEmissiveRadiance += step(0.9, vSurface) * vColor.rgb * mix(0.32, 1.25, uDreamNight);",
        ].join("\n"),
      );
  };
  if (realism) material.defines = { ...material.defines, DREAM_DETAIL: "" };
  if (reflections)
    material.defines = { ...material.defines, DREAM_REFLECTIONS: "" };
  material.customProgramCacheKey = () => "dream-architecture-v5";
  return material;
}

/** Bake the glTF's dequantization transform before placing its instances. */
function prepared(node: THREE.Mesh, far: boolean) {
  const geometry = bakedGeometry(node);
  const uv = geometry.getAttribute("uv");
  if (!uv)
    throw new Error(`Dream architecture ${node.name} has no surface flags`);
  const flags = new Float32Array(uv.count);
  for (let i = 0; i < uv.count; i++) flags[i] = uv.getX(i);
  geometry.setAttribute("aSurface", new THREE.BufferAttribute(flags, 1));
  geometry.setAttribute(
    "aDistant",
    new THREE.BufferAttribute(new Float32Array(uv.count).fill(far ? 1 : 0), 1),
  );
  return geometry;
}

export function DreamBuildings() {
  const gltf = useGLTF(URL);
  const { spots } = cityDream.use();
  const [meshes, setMeshes] = useState<readonly FamilyMesh[]>([]);
  const night = useMemo(() => ({ value: 0 }), []);
  const day = useDaylight();
  const realistic = useDetail() === "ultra";
  const graphics = useGraphics();
  const reflections = realistic && graphics.reflections;
  const invalidate = useThree((state) => state.invalidate);
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    gltf.scene.updateMatrixWorld(true);
    let active = true;
    const realism = realistic
      ? {
          graffiti: new THREE.TextureLoader().load(
            "/textures/graffiti/tag.png",
            () => {
              if (active) invalidate();
            },
          ),
          occlusion: groundOcclusion("stone_tile_wall", () => {
            if (active) invalidate();
          }),
        }
      : null;
    if (realism) realism.graffiti.colorSpace = THREE.SRGBColorSpace;
    const material = architectureMaterial(
      night,
      () => {
        if (!active) return;
        canvas.dataset.architectureMetal = "ready";
        invalidate();
      },
      realism,
      reflections,
    );
    const built = DREAM_KINDS.flatMap((kind) =>
      [false, true].map((far) => {
        const name = far ? `${kind}-lo` : kind;
        const node = gltf.scene.getObjectByName(name);
        if (!isMesh(node)) throw new Error(`architecture.glb has no ${name}`);
        const mesh = createDreamMesh(prepared(node, far), material);
        mesh.name = `dream-${name}`;
        // The library grows buffers as needed and culls each building.
        return { kind, far, mesh };
      }),
    );
    setMeshes(built);
    return () => {
      active = false;
      for (const { mesh } of built) {
        mesh.geometry.dispose();
        mesh.dispose();
      }
      realism?.graffiti.dispose();
      realism?.occlusion.dispose();
      material.map?.dispose();
      material.normalMap?.dispose();
      material.roughnessMap?.dispose();
      material.dispose();
      delete canvas.dataset.architecture;
      delete canvas.dataset.architectureMetal;
      delete canvas.dataset.architectureFamilies;
      delete canvas.dataset.landmarkExpected;
    };
  }, [gltf, night, canvas, invalidate, realistic, reflections]);

  useEffect(() => {
    night.value = day.neon;
    invalidate();
  }, [day.neon, night, invalidate]);

  useEffect(() => {
    placeDreamMeshes(meshes, spots);
    canvas.dataset.landmarkExpected = spots
      .filter(isLandmark)
      .map((spot) => spot.landmark)
      .sort()
      .join(",");
    if (meshes.length > 0 && spots.length > 0) {
      canvas.dataset.architecture = "ready";
      const near = spots.filter((spot) => !spot.far);
      canvas.dataset.architectureFamilies = [
        ...new Set((near.length > 0 ? near : spots).map((s) => s.kind)),
      ]
        .sort()
        .join(",");
    }
    invalidate();
  }, [meshes, spots, canvas, invalidate]);

  return (
    <group name="dream-city-architecture">
      {spots.filter(isLandmark).map((spot) => (
        <Suspense key={spot.id} fallback={null}>
          <DreamLandmarkBuilding spot={spot} />
        </Suspense>
      ))}
      {meshes.map(({ kind, far, mesh }) => (
        <primitive key={`${kind}|${far}`} object={mesh} />
      ))}
    </group>
  );
}
