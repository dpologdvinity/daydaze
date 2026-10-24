// The Water Park's splash zone: a climbing frame whose giant bucket fills,
// wobbles and tips every 20 s, with a falling water sheet, a splash ring and
// spray jets. All animation runs off the clock in one useFrame, offset by 8 s
// so it does not tip right at load.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useReducedMotion } from "../../motion.ts";
import { toon } from "./materials.ts";

const PERIOD = 20;
const TIP_AT = 16.5;
const BUCKET_Y = 4.4;

const WATER = new THREE.MeshToonMaterial({
  color: "#9feeff",
  transparent: true,
  opacity: 0.75,
});

const smooth = (a: number, b: number, x: number) =>
  THREE.MathUtils.smoothstep(x, a, b);

/**
 * A climbing frame with a giant bucket on top that fills, wobbles and dumps
 * a wall of water every 20 s. Still under reduced motion.
 */
export function SplashZone({
  position,
}: {
  position: [number, number, number];
}) {
  const bucket = useRef<THREE.Group>(null);
  const fall = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const jets = useRef<THREE.Group>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (calm) return;
    const t = clock.elapsedTime;
    const p = (t + 8) % PERIOD;
    const tip =
      smooth(TIP_AT, TIP_AT + 1.1, p) * (1 - smooth(18.6, 19.8, p)) * 2.1;
    const wobble = Math.sin(t * 6) * 0.04 * smooth(TIP_AT - 3, TIP_AT, p);
    if (bucket.current) bucket.current.rotation.x = tip + wobble;
    const pour =
      smooth(TIP_AT + 0.6, TIP_AT + 0.9, p) * (1 - smooth(18.2, 18.9, p));
    if (fall.current) {
      fall.current.visible = pour > 0.01;
      fall.current.scale.set(1, pour, 1);
    }
    const r = smooth(TIP_AT + 0.8, 19.4, p);
    if (ring.current) {
      ring.current.visible = r > 0 && r < 1;
      ring.current.scale.setScalar(0.4 + r * 2.4);
      const m = ring.current.material;
      if (m instanceof THREE.MeshBasicMaterial) m.opacity = 0.8 * (1 - r);
    }
    jets.current?.children.forEach((j, i) => {
      j.scale.y = 0.75 + Math.abs(Math.sin(t * 2.4 + i * 1.9)) * 0.5;
    });
  });
  const posts = ["#ff3f9e", "#3fc2ff", "#ffd23f", "#7cf0c8"];
  return (
    <group position={position}>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz, k) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * 1.3, 2.0, sz * 1.0]}
            material={toon(posts[(sx + 1) / 2 + k * 2] ?? "#ffffff")}
          >
            <cylinderGeometry args={[0.14, 0.14, 4.0, 10]} />
          </mesh>
        )),
      )}
      <mesh position-y={2.2} material={toon("#ffd23f")}>
        <boxGeometry args={[2.9, 0.16, 2.3]} />
      </mesh>
      <mesh position-y={4.05} material={toon("#ff3f9e")}>
        <boxGeometry args={[2.9, 0.14, 0.18]} />
      </mesh>
      {/* the bucket hangs from the top bar and tips towards the deck */}
      <group ref={bucket} position={[0, BUCKET_Y, 0]}>
        <mesh position-y={0.5}>
          <cylinderGeometry args={[0.75, 0.55, 1.0, 20, 1, true]} />
          <meshToonMaterial color="#ffd23f" side={THREE.DoubleSide} />
        </mesh>
        <mesh
          position-y={0.02}
          rotation-x={Math.PI / 2}
          material={toon("#ff9a56")}
        >
          <circleGeometry args={[0.55, 20]} />
        </mesh>
        <mesh position-y={0.85} rotation-x={-Math.PI / 2} material={WATER}>
          <circleGeometry args={[0.66, 20]} />
        </mesh>
      </group>
      {/* the falling sheet hangs from the lip, so it scales down from there */}
      <group ref={fall} position={[0, BUCKET_Y + 0.2, 1.0]} visible={false}>
        <mesh position-y={-(BUCKET_Y + 0.2) / 2} material={WATER}>
          <cylinderGeometry args={[0.55, 0.9, BUCKET_Y + 0.2, 16, 1, true]} />
        </mesh>
      </group>
      <mesh
        ref={ring}
        position={[0, 0.03, 1.0]}
        rotation-x={-Math.PI / 2}
        visible={false}
      >
        <ringGeometry args={[0.7, 1.0, 32]} />
        <meshBasicMaterial color="#e8fdff" transparent opacity={0.8} />
      </mesh>
      {/* little spray jets round the frame */}
      <group ref={jets}>
        {(
          [
            [-2.2, 1.6],
            [2.3, 1.2],
            [0, 2.4],
          ] as const
        ).map(([x, z]) => (
          <mesh key={x} position={[x, 0.5, z]} material={WATER}>
            <coneGeometry args={[0.18, 1.4, 10, 1, true]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
