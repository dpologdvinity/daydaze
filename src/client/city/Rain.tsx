// One batch of world-space rain streaks, animated entirely in the vertex shader.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { ShaderMaterial } from "three";
import { hash } from "../../game/city/hash.ts";

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vFade;

  void main() {
    const float span = 38.0;
    float tip = float(gl_VertexID % 2);
    float y = mod(position.y - uTime * (8.5 + position.y * 0.12), 21.0);
    vec2 offset = mod(position.xz + vec2(y * 0.13, -y * 0.05)
      - cameraPosition.xz + span * 0.5, span) - span * 0.5;
    vec3 p = vec3(cameraPosition.x + offset.x, y, cameraPosition.z + offset.y);
    vec4 view = viewMatrix * vec4(p, 1.0);
    vFade = smoothstep(1.5, 4.0, -view.z)
      * (1.0 - smoothstep(12.0, 19.0, max(abs(offset.x), abs(offset.y))))
      * (1.0 - smoothstep(17.0, 21.0, y)) * smoothstep(0.0, 1.0, y);
    p += vec3(0.065, 0.53, -0.026) * tip;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uRain;
  uniform float uNight;
  varying float vFade;

  void main() {
    vec3 rainColor = mix(vec3(0.15, 0.25, 0.34), vec3(0.52, 0.67, 0.82), uNight);
    gl_FragColor = vec4(rainColor, vFade * uRain * 0.67);
    #include <colorspace_fragment>
  }
`;

export function Rain({
  amount,
  low,
  night,
}: {
  amount: number;
  low: boolean;
  night: number;
}) {
  const positions = useMemo(() => {
    const count = low ? 760 : 1500;
    const data = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const x = hash(i, 1) * 38;
      const y = hash(i, 2) * 21;
      const z = hash(i, 3) * 38;
      data.set([x, y, z, x, y, z], i * 6);
    }
    return data;
  }, [low]);
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uRain: { value: 0 }, uNight: { value: 0 } }),
    [],
  );
  useFrame(({ clock }) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value = clock.elapsedTime;
    material.current.uniforms.uRain.value = amount;
    material.current.uniforms.uNight.value = night;
  });
  return (
    <lineSegments name="city-rain" frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}
