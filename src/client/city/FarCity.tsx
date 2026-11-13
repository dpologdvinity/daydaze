// The far city: the buildings the near plan does not draw (plan.far, from
// game/city/far.ts) as one instanced box mesh, and every road as one more of
// flat strips, so the blocks past the loaded cells (and the infill past its
// range) stand in the overview, from the El, the Ferris wheel and rooftops
// instead of bare ground and haze. The windows, the darker roof and the lit
// windows at night are all drawn by the shader from world position (no
// texture), so a far block costs 12 triangles and shares the two draws.
// Lambert, so the sun and sky tint it like the rest of the city, and fogged,
// so it dissolves into the horizon.
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { FAR_CAPACITY, FAR_ROADS, type FarBox } from "../../game/city/far.ts";
import { createStore } from "../rooms/shared/store.ts";
import { SKY_UNIFORMS } from "./daylight.ts";

/** The far boxes of the current plan; set by CityScene on each reload. */
export const cityFar = createStore({ boxes: [] as readonly FarBox[] });

/** Floor to floor and bay to bay, meters (the near walls' rhythm). */
const FLOOR = 3.4;
const BAY = 3.6;

/** Windows, roof tint and night lights over a Lambert box. */
function windowed(
  material: THREE.MeshLambertMaterial,
): THREE.MeshLambertMaterial {
  material.customProgramCacheKey = () => "far-city";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFarNight = SKY_UNIFORMS.uNeon;
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        `varying vec3 vFarWorld;
varying vec3 vFarNormal;
varying float vFarSeed;
void main() {`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vFarWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
vFarNormal = normal;
vFarSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        `uniform float uFarNight;
varying vec3 vFarWorld;
varying vec3 vFarNormal;
varying float vFarSeed;
float farHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float farRoof = step(0.5, vFarNormal.y);
float farAlong = mix(vFarWorld.z, vFarWorld.x, step(0.5, abs(vFarNormal.z)));
vec2 farGrid = vec2(farAlong / ${BAY.toFixed(1)}, vFarWorld.y / ${FLOOR.toFixed(1)});
vec2 farCell = floor(farGrid);
vec2 farIn = fract(farGrid);
float farWin = step(0.2, farIn.x) * step(farIn.x, 0.8) * step(0.3, farIn.y) * step(farIn.y, 0.8);
farWin *= (1.0 - farRoof) * step(1.0, vFarWorld.y);
float farGlass = 0.5 + 0.5 * farHash(farCell.yx + vFarSeed * 91.0);
diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.09, 0.12, 0.2), vec3(0.3, 0.37, 0.5), farGlass), farWin * 0.85);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.5 + vec3(0.03), farRoof);
float farLit = farWin * step(0.58, farHash(farCell + vFarSeed * 37.0)) * uFarNight;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
totalEmissiveRadiance += farLit * vec3(1.0, 0.78, 0.45) * 1.1 + diffuseColor.rgb * 0.14 * uFarNight;`,
      );
  };
  return material;
}

export function FarCity(): null | React.JSX.Element {
  const { boxes } = cityFar.use();
  const buildings = useMemo(() => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    // standing on the ground: y from 0 to 1, and no floor (FAR_BOX_TRIANGLES)
    geometry.translate(0, 0.5, 0);
    const index = geometry.getIndex();
    if (index) {
      // a box's faces are +x, -x, +y, -y, +z, -z, six indices each
      const kept = Array.from(index.array).filter(
        (_, i) => Math.floor(i / 6) !== 3,
      );
      geometry.setIndex(kept);
      geometry.clearGroups();
    }
    const mesh = new THREE.InstancedMesh(
      geometry,
      windowed(new THREE.MeshLambertMaterial({ color: "#ffffff" })),
      FAR_CAPACITY,
    );
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return mesh;
  }, []);
  const roads = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshLambertMaterial({
      color: "#3a3a42",
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, FAR_ROADS.length);
    const m = new THREE.Matrix4();
    FAR_ROADS.forEach(([x0, z0, x1, z1], i) => {
      // below the near asphalt's top (0.04), so it never shows through it
      m.compose(
        new THREE.Vector3((x0 + x1) / 2, 0.03, (z0 + z1) / 2),
        new THREE.Quaternion(),
        new THREE.Vector3(x1 - x0, 1, z1 - z0),
      );
      mesh.setMatrixAt(i, m);
    });
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  useEffect(() => {
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    boxes.forEach((b, i) => {
      m.compose(p.set(b.x, 0, b.z), q, s.set(b.sx, b.h, b.sz));
      buildings.setMatrixAt(i, m);
      buildings.setColorAt(i, c.set(b.color));
    });
    buildings.count = boxes.length;
    buildings.instanceMatrix.needsUpdate = true;
    if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
  }, [boxes, buildings]);
  useEffect(
    () => () => {
      for (const mesh of [buildings, roads]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        mesh.dispose();
      }
    },
    [buildings, roads],
  );
  return (
    <>
      <primitive object={roads} />
      <primitive object={buildings} />
    </>
  );
}
