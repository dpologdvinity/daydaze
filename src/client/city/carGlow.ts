// What the traffic's lamps throw at night, with no real lights (the low tier has
// no bloom either): a soft additive halo around each head and tail lamp, a
// camera-facing sprite that swells with distance so far cars still read as
// lights, and one flat additive pool of headlight on the road ahead of each
// car. Both are instanced (two draws for every car in the city), cost a handful
// of triangles a car, and only draw once the night is on (`night`, Daylight.neon).
import * as THREE from "three";
import { BODY_LENGTH, type BodyKey } from "../../game/driving/bodies.ts";
import { BODY_LAMPS, HALOS_PER_CAR } from "../../game/driving/lamps.ts";

/** Halo sizes in meters across the quad (the falloff makes the lit disc about half). */
const HEAD_HALO = 0.5;
const TAIL_HALO = 0.38;
/** A halo sits this far out from its lamp so the body does not slice it. */
const OUT = 0.12;
/** How much a halo grows per meter from the camera (up to MAX_SWELL times), so a lamp at 60 m is still a light. */
const SWELL = 0.012;
const MAX_SWELL = 3;
/** A halo is drawn this far (meters) toward the camera, so the lamp's own body never hides it. */
const TOWARD_CAMERA = 0.15;
/** The headlight pool: meters wide, long, and above the road (so it clears the
 * lane paint, with a polygon offset on top for the rest). */
const POOL_WIDTH = 3.6;
const POOL_LENGTH = 9;
const POOL_LIFT = 0.03;

const HEAD = new THREE.Color("#ffe6b8");
const TAIL = new THREE.Color("#ff2a22");

const haloVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vTint;
varying float vFade;
void main() {
  vUv = uv;
  vec4 centre = modelViewMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  float dist = -centre.z;
  float size = length( instanceMatrix[ 0 ].xyz ) * min( ${MAX_SWELL}.0, 1.0 + ${SWELL} * dist );
  centre.z += ${TOWARD_CAMERA};
  centre.xy += position.xy * size;
  vTint = instanceColor;
  vFade = 1.0 - smoothstep( 90.0, 150.0, dist );
  gl_Position = projectionMatrix * centre;
}`;

const haloFragment = /* glsl */ `
uniform float uNight;
varying vec2 vUv;
varying vec3 vTint;
varying float vFade;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float a = max( 0.0, 1.0 - dot( p, p ) );
  a = a * a * a;
  gl_FragColor = vec4( vTint * a * vFade * uNight * 1.4, 1.0 );
  #include <colorspace_fragment>
}`;

const poolVertex = /* glsl */ `
varying vec2 vPool;
void main() {
  // x across (-0.5..0.5), z along from the nose (0..1)
  vPool = vec2( position.x * 2.0, position.z );
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
}`;

const poolFragment = /* glsl */ `
uniform float uNight;
varying vec2 vPool;
void main() {
  float along = pow( max( 0.0, 1.0 - vPool.y ), 1.6 ) * smoothstep( 0.0, 0.08, vPool.y );
  float across = max( 0.0, 1.0 - vPool.x * vPool.x );
  gl_FragColor = vec4( vec3( 1.0, 0.86, 0.58 ) * along * across * uNight * 0.8, 1.0 );
  #include <colorspace_fragment>
}`;

/** Additive, unlit, no depth write: they only brighten what is behind them. */
function additive(
  vertexShader: string,
  fragmentShader: string,
  night: { value: number },
  offset: boolean,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uNight: night },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: offset,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

export type CarGlow = {
  /** The halos and the pools, to mount in the scene. */
  meshes: THREE.InstancedMesh[];
  /** 0 by day to 1 at night (Daylight.neon); set it when the light changes. */
  night: { value: number };
  /** Clears the counts at the start of a frame. */
  reset: () => void;
  /** Adds the glow of one car whose body-to-world matrix is `car`; false if full. */
  add: (body: BodyKey, car: THREE.Matrix4) => boolean;
  /** Uploads the frame's matrices; hides the meshes in daylight or when empty. */
  flush: () => void;
};

const spot = new THREE.Vector3();
const matrix = new THREE.Matrix4();

/** The glow for up to `capacity` cars. */
export function createCarGlow(capacity: number): CarGlow {
  const night = { value: 0 };
  const halos = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    additive(haloVertex, haloFragment, night, false),
    capacity * HALOS_PER_CAR,
  );
  for (let i = 0; i < capacity * HALOS_PER_CAR; i++)
    halos.setColorAt(i, i % HALOS_PER_CAR < 2 ? HEAD : TAIL);
  // the pool lies flat, nose at z = 0 running out to z = 1
  const pools = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5),
    additive(poolVertex, poolFragment, night, true),
    capacity,
  );
  const meshes = [halos, pools];
  for (const mesh of meshes) {
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.renderOrder = 2;
    mesh.count = 0;
    mesh.visible = false;
  }
  return {
    meshes,
    night,
    reset() {
      for (const mesh of meshes) mesh.count = 0;
    },
    add(body, car) {
      if (pools.count >= capacity) return false;
      const { head, tail } = BODY_LAMPS[body];
      for (const [lamp, size, out] of [
        [head, HEAD_HALO, OUT],
        [tail, TAIL_HALO, -OUT],
      ] as const)
        for (const side of [1, -1]) {
          matrix.makeScale(size, size, size);
          spot.set(side * lamp[0], lamp[1], lamp[2] + out).applyMatrix4(car);
          halos.setMatrixAt(halos.count++, matrix.setPosition(spot));
        }
      // the pool starts just beyond the nose and runs ahead, in the car's own frame
      matrix
        .makeScale(POOL_WIDTH, 1, POOL_LENGTH)
        .setPosition(0, POOL_LIFT, BODY_LENGTH[body] / 2 + 0.3);
      pools.setMatrixAt(pools.count++, matrix.premultiply(car));
      return true;
    },
    flush() {
      const on = night.value > 0.02;
      for (const mesh of meshes) {
        mesh.visible = on && mesh.count > 0;
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
