import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SLIDES, TOWER, type Vec3 } from "../../../game/waterPark.ts";
import { useReducedMotion } from "../../motion.ts";
import { stripes, toon } from "./materials.ts";

const UP = new THREE.Vector3(0, 1, 0);

/**
 * An open half-pipe along the rider's path: the rider's hips sit on its
 * floor, so the trough's centre runs `r` above the path.
 */
function troughGeometry(path: readonly Vec3[], r: number) {
  const curve = new THREE.CatmullRomCurve3(
    path.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  );
  const rings = path.length * 3;
  const sides = 14;
  const pos: number[] = [];
  const index: number[] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const side = new THREE.Vector3();
  const down = new THREE.Vector3();
  for (let i = 0; i <= rings; i++) {
    const u = i / rings;
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    side.crossVectors(t, UP).normalize();
    down.crossVectors(side, t).normalize().negate();
    p.addScaledVector(down, -r * 0.9);
    // a little over a half circle, so the lip curls in
    for (let j = 0; j <= sides; j++) {
      const a = -0.25 + (j / sides) * (Math.PI + 0.5);
      pos.push(
        p.x + (side.x * Math.cos(a) + down.x * Math.sin(a)) * r,
        p.y + (side.y * Math.cos(a) + down.y * Math.sin(a)) * r,
        p.z + (side.z * Math.cos(a) + down.z * Math.sin(a)) * r,
      );
      if (i < rings && j < sides) {
        const a0 = i * (sides + 1) + j;
        const b0 = a0 + sides + 1;
        index.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Posts under a slide every few metres, down to the deck. */
function supports(path: readonly Vec3[]) {
  return path.filter((p, i) => i % 10 === 5 && p[1] > 0.9);
}

const ROOF = stripes(["#ff3f9e", "#ffffff", "#ffd23f", "#ffffff"], 4);

function Flag({ position, color }: { position: Vec3; color: string }) {
  const flag = useRef<THREE.Mesh>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (flag.current && !calm)
      flag.current.rotation.y =
        Math.sin(clock.elapsedTime * 3.2 + position[0]) * 0.35;
  });
  return (
    <group position={position}>
      <mesh position-y={0.6} material={toon("#ffffff")}>
        <cylinderGeometry args={[0.025, 0.025, 1.2, 6]} />
      </mesh>
      <mesh ref={flag} position-y={1.05} material={toon(color)}>
        <coneGeometry args={[0.16, 0.6, 3]} />
      </mesh>
    </group>
  );
}

/**
 * The slide tower: a candy-striped scaffold with three slides spiralling
 * down into the wave pool. Tapping the tower or a slide rides it.
 */
export function Tower({ onRide }: { onRide: (slide: number) => void }) {
  const troughs = useMemo(
    () => SLIDES.map((s) => troughGeometry(s.path, 0.42)),
    [],
  );
  const tap = (slide: number) => (e: ThreeEvent<MouseEvent>) => {
    // a drag is an orbit, not a tap
    if (e.delta > 6) return;
    e.stopPropagation();
    onRide(slide);
  };
  const post = toon("#ffd23f");
  const deck = ["#3fc2ff", "#ff3f9e", "#7cf0c8"];
  return (
    <group>
      <group position={[TOWER.x, 0, TOWER.z]} onClick={tap(0)}>
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh
              key={`${sx}${sz}`}
              position={[sx * 0.95, 3.9, sz * 0.95]}
              material={post}
            >
              <cylinderGeometry args={[0.13, 0.15, 7.8, 10]} />
            </mesh>
          )),
        )}
        {[2.2, 4.4, TOWER.top - 0.12].map((y, i) => (
          <mesh key={y} position-y={y} material={toon(deck[i])}>
            <boxGeometry args={[2.3, 0.16, 2.3]} />
          </mesh>
        ))}
        {/* zigzag stairs on the open (+z) side */}
        {Array.from({ length: 12 }, (_, i) => (
          <mesh
            key={i}
            position={[-0.5 + (i % 2) * 1, 0.28 + i * 0.53, 1.25]}
            rotation-z={(i % 2 ? -1 : 1) * 0.5}
            material={toon("#ffffff")}
          >
            <boxGeometry args={[1.1, 0.08, 0.5]} />
          </mesh>
        ))}
        {/* railings round the top deck */}
        <mesh position-y={TOWER.top + 0.5} material={toon("#ffffff")}>
          <torusGeometry args={[1.5, 0.04, 6, 4, Math.PI * 2]} />
        </mesh>
        <mesh position-y={TOWER.top + 2.05}>
          <coneGeometry args={[2.1, 1.3, 16, 1, true]} />
          <meshToonMaterial map={ROOF} side={THREE.DoubleSide} />
        </mesh>
        <mesh position-y={TOWER.top + 1.38} material={toon("#ff3f9e")}>
          <torusGeometry args={[2.05, 0.08, 6, 24]} />
        </mesh>
        <Flag position={[0, TOWER.top + 2.6, 0]} color="#ff3f9e" />
        <Flag position={[0.95, TOWER.top + 1.3, 0.95]} color="#ffd23f" />
        <Flag position={[-0.95, TOWER.top + 1.3, 0.95]} color="#3fc2ff" />
      </group>
      {SLIDES.map((s, i) => {
        const [x0, y0, z0] = s.path[0];
        const dx = x0 - TOWER.x;
        const dz = z0 - TOWER.z;
        const reach = Math.hypot(dx, dz);
        return (
          <group key={s.id} onClick={tap(i)}>
            <mesh geometry={troughs[i]}>
              <meshToonMaterial
                color={s.color}
                gradientMap={post.gradientMap}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* a gangway from the tower to the top of the slide */}
            <mesh
              position={[TOWER.x + dx / 2, y0 - 0.14, TOWER.z + dz / 2]}
              rotation-y={Math.atan2(dx, dz)}
              material={toon("#ffffff")}
            >
              <boxGeometry args={[0.9, 0.12, reach + 0.4]} />
            </mesh>
            {supports(s.path).map(([x, y, z], k) => (
              <mesh
                key={k}
                position={[x, (y - 0.3) / 2, z]}
                material={toon("#f4f4f4")}
              >
                <cylinderGeometry args={[0.07, 0.09, y - 0.3, 8]} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
