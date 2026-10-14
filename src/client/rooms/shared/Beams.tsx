import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { hdr } from "./materials.ts";

// Fake volumetric beams: additive cones, no real lights (forward-shaded
// lights are the main per-pixel cost here).
const BEAM_GEO = (() => {
  const g = new THREE.ConeGeometry(0.85, 6.5, 32, 1, true);
  g.translate(0, -3.25, 0);
  g.rotateX(-Math.PI / 2);
  return g;
})();

function beamMat(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: hdr(color, 0.9) } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main() {
        vY = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vY; varying vec3 vN; varying vec3 vV;
      void main() {
        float core = pow(abs(dot(normalize(vN), normalize(vV))), 2.5);
        gl_FragColor = vec4(uColor * core * pow(vY, 1.3) * 0.32, 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export type Beam = {
  position: [number, number, number];
  color: string;
  phase: number;
  /** Stretches the 6.5 m cone. */
  length?: number;
};

/**
 * Spotlight cones sweeping around `aim` (x, z) at height `aimY`; they hold
 * still under reduced motion.
 */
export function Beams({
  beams,
  aim,
  aimY = 0,
  spread = [2.2, 1.8],
}: {
  beams: readonly Beam[];
  aim: readonly [number, number];
  aimY?: number;
  spread?: readonly [number, number];
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(() => beams.map((b) => beamMat(b.color)), [beams]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    const t = calm ? 0 : clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const ph = beams[i].phase;
      target.set(
        aim[0] + Math.sin(t * 0.5 + ph) * spread[0],
        aimY,
        aim[1] + Math.cos(t * 0.37 + ph) * spread[1],
      );
      m.lookAt(target);
    });
  });
  return (
    <>
      {beams.map((b, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          position={b.position}
          scale={b.length ? b.length / 6.5 : 1}
          geometry={BEAM_GEO}
          material={mats[i]}
        />
      ))}
    </>
  );
}
