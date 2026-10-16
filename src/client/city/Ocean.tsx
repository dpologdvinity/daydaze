import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { WATER_Z } from "../../game/city/layout.ts";
import { useReducedMotion } from "../motion.ts";

const time = { value: 0 };

/**
 * The sea off Beachside: a dark plane from the waterline out past the fog,
 * moonlight glinting in slow swells, and a line of surf breaking on the sand.
 * One draw call for the water, one for the foam; no clicks (not walkable).
 */
export function Ocean() {
  const calm = useReducedMotion();
  const water = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      // nearly black water lit from within: the night sky would grey it out
      color: "#01060c",
      roughness: 0.7,
      metalness: 0,
      emissive: "#062a4a",
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "varying vec2 vSea;\nvoid main() {")
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvSea = (modelMatrix * vec4(transformed, 1.0)).xz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "void main() {",
          "uniform float uTime;\nvarying vec2 vSea;\nvoid main() {",
        )
        .replace(
          "#include <emissivemap_fragment>",
          [
            "#include <emissivemap_fragment>",
            // moonlit glints riding slow swells toward the shore
            "float swell = sin(vSea.y * 0.35 - uTime * 0.9) * sin(vSea.x * 0.11 + uTime * 0.3);",
            "float glint = pow(max(0.0, swell), 28.0);",
            "totalEmissiveRadiance += vec3(0.25, 0.4, 0.6) * glint;",
          ].join("\n"),
        );
    };
    return m;
  }, []);
  const foam = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#cfe9ff",
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    [],
  );
  useFrame((state) => {
    time.value = calm ? 0 : state.clock.elapsedTime;
    foam.opacity = calm
      ? 0.45
      : 0.4 + 0.2 * Math.sin(state.clock.elapsedTime * 0.8);
  });
  return (
    <>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -0.05, WATER_Z + 200]}
        material={water}
        raycast={() => {}}
      >
        <planeGeometry args={[1400, 400]} />
      </mesh>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.16, WATER_Z + 0.6]}
        material={foam}
        raycast={() => {}}
      >
        <planeGeometry args={[384, 1.2]} />
      </mesh>
    </>
  );
}
