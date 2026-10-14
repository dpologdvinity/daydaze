import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { hash } from "../../game/city/dressing.ts";
import { CITY_CLOCK } from "./shaders.ts";

const RADIUS = 440;
const STARS = 420;

const SKY_VERTEX = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAGMENT = `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
varying vec3 vDir;
void main() {
  float up = vDir.y;
  vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, up));
  // the city's glow hangs over the skyline, strongest on the south side
  float glow = exp(-max(up, 0.0) * 7.0) * (0.55 + 0.45 * smoothstep(-0.5, 0.5, -vDir.z));
  col += uGlow * glow * 0.45;
  if (up < 0.0) col = uHorizon;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const STAR_VERTEX = `
attribute float aSeed;
uniform float uTime;
uniform float uMotion;
varying float vTwinkle;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 1.5 + 2.0 * fract(aSeed * 13.0);
  vTwinkle = mix(1.0, 0.45 + 0.55 * sin(uTime * (1.2 + aSeed * 3.0) + aSeed * 40.0), uMotion);
}`;

const STAR_FRAGMENT = `
varying float vTwinkle;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
  gl_FragColor = vec4(vec3(0.9, 0.93, 1.0) * a * vTwinkle, a * vTwinkle);
}`;

/**
 * A dome of dusk over the city, with stars and the glow of the streets along
 * the horizon. It follows the camera, so it never runs out at the edge of view.
 */
export function CitySky() {
  const root = useMemo(() => {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 24, 16),
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        uniforms: {
          uZenith: { value: new THREE.Color("#07041a") },
          uHorizon: { value: new THREE.Color("#2a1046") },
          uGlow: { value: new THREE.Color("#ff5fa8") },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    dome.frustumCulled = false;
    dome.renderOrder = -1;

    const positions = new Float32Array(STARS * 3);
    const seeds = new Float32Array(STARS);
    for (let i = 0; i < STARS; i++) {
      // upper hemisphere only: the cosine of the polar angle is never negative
      const theta = hash(i, 1) * Math.PI * 2;
      const phi = Math.acos(hash(i, 2));
      const r = RADIUS * 0.95;
      positions.set(
        [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta),
        ],
        i * 3,
      );
      seeds[i] = hash(i, 3);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    starGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.ShaderMaterial({
        vertexShader: STAR_VERTEX,
        fragmentShader: STAR_FRAGMENT,
        uniforms: { uTime: CITY_CLOCK.uTime, uMotion: CITY_CLOCK.uMotion },
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    );
    stars.frustumCulled = false;
    stars.renderOrder = -1;

    const group = new THREE.Group();
    group.add(dome, stars);
    return group;
  }, []);

  useFrame(({ camera }) => {
    root.position.copy(camera.position);
  });

  useEffect(() => () => disposeSky(root), [root]);

  return <primitive object={root} />;
}

function disposeSky(root: THREE.Group) {
  for (const child of root.children) {
    if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  }
}
