import { Stars } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useReducedMotion } from "../../motion.ts";
import { canvasTex, hdr } from "../shared/materials.ts";

// Night sky: violet overhead, a sodium-pink city glow on the horizon.
const SKY = new THREE.ShaderMaterial({
  uniforms: {
    uTop: { value: new THREE.Color("#04020c") },
    uMid: { value: new THREE.Color("#1c0a3a") },
    uGlow: { value: new THREE.Color("#ff4f8a") },
  },
  vertexShader: `varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uGlow; varying vec3 vDir;
    void main() {
      float h = vDir.y;
      vec3 c = mix(uMid, uTop, smoothstep(0.08, 0.55, h));
      // the glow hugs the horizon and dies off below it
      float glow = 1.0 - smoothstep(0.0, 0.22, h);
      c = mix(c, uGlow, pow(glow, 2.2) * 0.85 * smoothstep(-0.06, 0.0, h));
      gl_FragColor = vec4(c, 1.0);
    }`,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
});

// Office towers far behind the shops: lit windows in warm and pink.
const WINDOWS = canvasTex(
  64,
  64,
  (ctx) => {
    ctx.fillStyle = "#06030c";
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 2; y < 64; y += 8) {
      for (let x = 2; x < 64; x += 8) {
        const n = Math.sin(x * 91.7 + y * 47.3) * 9631.7;
        const r = n - Math.floor(n);
        if (r < 0.7) continue;
        ctx.fillStyle = r > 0.92 ? "#ff8ad8" : r > 0.8 ? "#ffd27a" : "#5a3c7a";
        ctx.fillRect(x, y, 4, 5);
      }
    }
  },
  [1, 1],
);

function skylineGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  let x = -60;
  let i = 0;
  while (x < 60) {
    const n = Math.sin(i * 12.3) * 4375.85;
    const r = n - Math.floor(n);
    const w = 3 + r * 5;
    const h = 6 + ((r * 7.3) % 1) * 12;
    const z = -30 - ((r * 3.1) % 1) * 16;
    const g = new THREE.BoxGeometry(w, h, 4);
    // scale UVs so each window cell stays the same size on every tower
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) {
      uv.setXY(k, uv.getX(k) * (w / 4), uv.getY(k) * (h / 4));
    }
    g.translate(x + w / 2, h / 2 - 0.5, z);
    parts.push(g);
    x += w + 0.6 + r * 2;
    i++;
  }
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error("Skyline parts have mismatched attributes.");
  return merged;
}

export function Sky() {
  const calm = useReducedMotion();
  const skyline = useMemo(skylineGeometry, []);
  const windows = useMemo(() => {
    const t = WINDOWS.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    return t;
  }, []);
  return (
    <>
      <mesh material={SKY} scale={90} renderOrder={-1}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      <Stars
        radius={70}
        depth={10}
        count={1400}
        factor={3}
        saturation={0.6}
        fade
        speed={calm ? 0 : 0.6}
      />
      <mesh geometry={skyline}>
        <meshBasicMaterial map={windows} color="#b8a8c8" />
      </mesh>
      {/* the moon, with a soft halo */}
      <group position={[-30, 30, -60]}>
        <mesh>
          <circleGeometry args={[2.4, 40]} />
          <meshBasicMaterial
            color={hdr("#ffe6f4", 1.6)}
            toneMapped={false}
            fog={false}
          />
        </mesh>
        <mesh position-z={-0.1}>
          <circleGeometry args={[7, 40]} />
          <meshBasicMaterial
            color="#ff8ad8"
            transparent
            opacity={0.12}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      </group>
    </>
  );
}
