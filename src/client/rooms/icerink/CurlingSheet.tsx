import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import { BUTTON_X, HACK_X, STONES } from "../../../game/curling.ts";
import { useReducedMotion } from "../../motion.ts";
import { cameraHold } from "../../world/cameraHold.ts";
import { placePlayer, type Player } from "../../world/PlayerController.tsx";
import { curling, stoneNow, tick } from "./curling.ts";

const ICE_Y = 0.07;
/** The house, outside in: blue 12-foot, white 8-foot, red 4-foot, button. */
const HOUSE = [
  { r: 1.83, color: "#2a5aff" },
  { r: 1.2, color: "#f4f8ff" },
  { r: 0.6, color: "#e0283a" },
  { r: 0.15, color: "#f4f8ff" },
] as const;
const FACE_X = Math.PI / 2;
const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
const m = new THREE.Matrix4();

/**
 * The curling sheet laid along the rink: the house painted under the ice at
 * the far end, the hack at the near one, and the stones. While an end is on,
 * the player stands at the hack, then sweeps along behind the stone, and the
 * camera looks down the sheet.
 */
export function CurlingSheet({ player }: { player: Player }): JSX.Element {
  const calm = useReducedMotion();
  const camera = useThree((st) => st.camera);
  const stones = useRef<THREE.InstancedMesh>(null);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const holding = useRef(false);
  const granite = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#5a5a66", roughness: 0.5 }),
    [],
  );
  useEffect(
    () => () => {
      curling.set({ phase: "off" });
      if (holding.current) player.seat = null;
      if (cameraHold.by === "curling") cameraHold.by = null;
    },
    [player],
  );
  useFrame((_, dt) => {
    const now = performance.now();
    tick(now);
    const s = curling.get();
    const inst = stones.current;
    if (inst) {
      let i = 0;
      for (const st of s.end.stones) {
        m.makeTranslation(st.x, ICE_Y + 0.055, st.z);
        inst.setMatrixAt(i++, m);
      }
      const live = stoneNow(now);
      const at =
        live ??
        (s.phase === "aim" || s.phase === "weight"
          ? { x: HACK_X + 0.6, z: 0 }
          : null);
      if (at) {
        m.makeTranslation(at.x, ICE_Y + 0.055, at.z);
        inst.setMatrixAt(i++, m);
      }
      for (; i <= STONES; i++) inst.setMatrixAt(i, hidden);
      inst.instanceMatrix.needsUpdate = true;
    }
    if (s.phase === "off") {
      if (holding.current) {
        holding.current = false;
        player.seat = null;
        placePlayer(player, HACK_X, 1.5);
        if (cameraHold.by === "curling") cameraHold.by = null;
      }
      return;
    }
    holding.current = true;
    cameraHold.by = "curling";
    const live = stoneNow(now);
    // at the hack to throw; then sweeping along just behind the stone
    const px = live && !live.stopped ? live.x - 0.9 : HACK_X - 0.3;
    const pz = live ? live.z + 0.35 : 0;
    player.seat ??= { position: new THREE.Vector3(), yaw: 0 };
    player.seat.position.set(px, ICE_Y, pz);
    player.seat.yaw = FACE_X;
    player.seat.sit = false;
    player.seat.stride = s.phase === "sliding";
    const cx = Math.max(HACK_X, Math.min(BUTTON_X - 2, px));
    eye.set(cx - 4.5, 3, 0);
    look.set(cx + 4, 0, 0);
    camera.position.lerp(eye, calm ? 1 : 1 - Math.exp(-dt * 2.5));
    camera.lookAt(look);
  });
  return (
    <group>
      {HOUSE.map((ring, i) => (
        <mesh
          key={ring.r}
          position={[BUTTON_X, ICE_Y + 0.001 * i, 0]}
          rotation-x={-Math.PI / 2}
        >
          <circleGeometry args={[ring.r, 40]} />
          <meshStandardMaterial
            color={ring.color}
            roughness={0.2}
            polygonOffset
            polygonOffsetFactor={-1 - i}
          />
        </mesh>
      ))}
      {/* the hack, and the tee line through the house */}
      <mesh position={[HACK_X, ICE_Y + 0.01, 0]}>
        <boxGeometry args={[0.12, 0.03, 0.4]} />
        <meshStandardMaterial color="#141018" />
      </mesh>
      <mesh position={[BUTTON_X, ICE_Y + 0.005, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.03, 4]} />
        <meshBasicMaterial color="#141018" />
      </mesh>
      <instancedMesh
        ref={stones}
        args={[undefined, granite, STONES + 1]}
        // its bounds come from the first frame, when no stone is out yet
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.145, 0.15, 0.11, 18]} />
      </instancedMesh>
    </group>
  );
}
