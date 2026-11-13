// The sea south of the waterline: a large emissive plane with shader-patched
// moonlit glints and a pulsing surf line. Neither mesh takes clicks. The glint
// clock is module-wide and stops under reduced motion.

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { WATER_Z } from "../../game/city/layout.ts";
import { useReducedMotion } from "../motion.ts";
import { HORIZON_GLSL } from "./CitySky.tsx";
import { SKY_UNIFORMS } from "./daylight.ts";

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
      // nearly black water lit from within: the night sky would gray it out
      color: "#01060c",
      roughness: 0.7,
      metalness: 0,
      emissive: "#062a4a",
      // fades to the sky's horizon color itself (below), not the scene fog's
      fog: false,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.uniforms.uHorizon = SKY_UNIFORMS.uHorizon;
      shader.uniforms.uGlow = SKY_UNIFORMS.uGlow;
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "varying vec2 vSea;\nvoid main() {")
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvSea = (modelMatrix * vec4(transformed, 1.0)).xz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "void main() {",
          `uniform float uTime;\nuniform vec3 uHorizon;\nuniform vec3 uGlow;\nvarying vec2 vSea;\n${HORIZON_GLSL}\nvoid main() {`,
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
        )
        // past a few hundred meters the water becomes the sky's horizon, all
        // the way to the camera's far plane (the plane runs beyond it), so the
        // sea has no far edge to show
        .replace(
          "#include <colorspace_fragment>",
          [
            "#include <colorspace_fragment>",
            "vec3 toSea = vec3(vSea.x - cameraPosition.x, -0.05 - cameraPosition.y, vSea.y - cameraPosition.z);",
            "float seaDist = length(toSea);",
            "vec3 skyEdge = horizonColor(uHorizon, uGlow, toSea.z / max(length(toSea.xz), 0.0001));",
            "gl_FragColor.rgb = mix(gl_FragColor.rgb, linearToOutputTexel(vec4(skyEdge, 1.0)).rgb, smoothstep(140.0, 560.0, seaDist));",
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
        position={[0, -0.05, WATER_Z + 700]}
        material={water}
        raycast={() => {}}
      >
        {/* runs past the camera's far plane (600 in World.tsx) every way */}
        <planeGeometry args={[3000, 1400]} />
      </mesh>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.16, WATER_Z + 0.6]}
        material={foam}
        raycast={() => {}}
      >
        <planeGeometry args={[896, 1.2]} />
      </mesh>
    </>
  );
}
