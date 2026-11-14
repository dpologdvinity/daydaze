// The stargazing night's sky (src/game/starfield.ts): a dome of small points
// far behind everything, so the buildings and the deck cover them and none
// float in the room. Many tiny stars of varied size and warmth that twinkle
// gently (still under reduced motion), a faint Milky Way band, and now and
// then a shooting star with a short trail. Two draw calls; nothing allocates
// in useFrame.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { shootingStarPoint, starField } from "../../game/starfield.ts";
import { useReducedMotion } from "../motion.ts";

/** How far out the dome sits: past every building, inside the sky sphere. */
const DEFAULT_RADIUS = 380;
const TRAIL = 8;

const COOL = new THREE.Color("#a9c4ff");
const WHITE = new THREE.Color("#ffffff");
const WARM = new THREE.Color("#ffd9a0");

/** Round, soft-edged points of per-star size, brightness and twinkle phase. */
function starMaterial(px: number, twinkle: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTwinkle: { value: twinkle ? 1 : 0 },
      uPx: { value: px },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uTwinkle;
      uniform float uPx;
      varying vec3 vColor;
      void main() {
        float rate = 0.7 + fract(aPhase * 7.0) * 1.3;
        float tw = 1.0 + uTwinkle * 0.4 * sin(uTime * rate + aPhase * 40.0);
        vColor = aColor * tw;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPx * 2.8;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, d);
        gl_FragColor = vec4(vColor, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Warmth 0..1 to a star color, scaled by its brightness. */
function starColor(warmth: number, bright: number, out: THREE.Color) {
  if (warmth < 0.5) out.copy(COOL).lerp(WHITE, warmth * 2);
  else out.copy(WHITE).lerp(WARM, (warmth - 0.5) * 2);
  return out.multiplyScalar(bright * 2.4);
}

function attribute(array: Float32Array, size: number) {
  return new THREE.BufferAttribute(array, size);
}

/** The stargazing night's dome of stars, with its Milky Way and shooting stars. */
export function StarDome({
  low,
  radius = DEFAULT_RADIUS,
  floor,
}: {
  low: boolean;
  radius?: number;
  /** The lowest a star may sit, as the sine of its elevation. */
  floor?: number;
}) {
  const calm = useReducedMotion();
  const px = useThree((s) => s.gl.getPixelRatio());
  const sky = useMemo(() => {
    const f = starField(low ? 1800 : 3000, low ? 800 : 1500, floor);
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(f.count * 3);
    const col = new Float32Array(f.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < f.count; i++) {
      for (let k = 0; k < 3; k++)
        pos[i * 3 + k] = (f.dir[i * 3 + k] ?? 0) * radius;
      starColor(f.warmth[i] ?? 0.5, f.bright[i] ?? 0.5, c);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("position", attribute(pos, 3));
    g.setAttribute("aColor", attribute(col, 3));
    g.setAttribute("aSize", attribute(f.size, 1));
    g.setAttribute("aPhase", attribute(f.phase, 1));
    return g;
  }, [low, radius, floor]);
  const trail = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const size = new Float32Array(TRAIL);
    const col = new Float32Array(TRAIL * 3);
    for (let i = 0; i < TRAIL; i++) {
      const k = 1 - i / TRAIL;
      size[i] = 1 + 3.2 * k;
      col.set([2 * k, 2 * k, 2.2 * k], i * 3);
    }
    g.setAttribute("position", attribute(new Float32Array(TRAIL * 3), 3));
    g.setAttribute("aColor", attribute(col, 3));
    g.setAttribute("aSize", attribute(size, 1));
    g.setAttribute("aPhase", attribute(new Float32Array(TRAIL), 1));
    return g;
  }, []);
  const skyMat = useMemo(() => starMaterial(px, !calm), [px, calm]);
  const trailMat = useMemo(() => starMaterial(px, false), [px]);
  const streak = useRef<THREE.Points>(null);
  const out = useMemo<[number, number, number]>(() => [0, 0, 0], []);
  useEffect(
    () => () => {
      sky.dispose();
      trail.dispose();
      skyMat.dispose();
      trailMat.dispose();
    },
    [sky, trail, skyMat, trailMat],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    skyMat.uniforms.uTime!.value = t;
    const s = streak.current;
    if (!s) return;
    // reduced motion: no streaks, they are the one fast thing in the sky
    const pos = trail.getAttribute("position");
    let shown = false;
    if (!calm)
      for (let i = 0; i < TRAIL; i++) {
        if (shootingStarPoint(t, i * 0.025, out)) {
          pos.setXYZ(i, out[0] * radius, out[1] * radius, out[2] * radius);
          shown = true;
        } else pos.setXYZ(i, 0, -radius, 0);
      }
    s.visible = shown;
    if (shown) pos.needsUpdate = true;
  });
  return (
    <>
      <points
        geometry={sky}
        material={skyMat}
        frustumCulled={false}
        renderOrder={-1}
      />
      <points
        ref={streak}
        geometry={trail}
        material={trailMat}
        frustumCulled={false}
        renderOrder={-1}
        visible={false}
      />
    </>
  );
}
