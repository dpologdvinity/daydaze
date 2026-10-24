// Skyline Driving Range's life: golfers in the other bays with their balls
// flying downrange (one instanced mesh), the ball picker circling with its
// beacon, and Imani the attendant. Under reduced motion the balls sit on the
// tee and the picker stays put.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type JSX } from "react";
import * as THREE from "three";
import type { DialogueContext } from "../../../game/dialogue/types.ts";
import {
  BAY_XS,
  FLOOR_BOUNDS,
  rangeToRoom,
  TEE_Z,
} from "../../../game/drivingRange.ts";
import type { Look } from "../../../game/look.ts";
import { useReducedMotion } from "../../motion.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { hdr } from "../shared/materials.ts";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "driving-range",
  neighborhood: "arts-district",
};

const ATTENDANT_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "low-pony",
  hairColor: "#1b1014",
  lips: "lips-nude-pink-gloss",
  brows: "brows-sculpted-espresso",
  outfit: "blouse",
  outfitColor: "#3fe0d0",
  shadow: "#3fe0d0",
};

/** Golfers in the other bays, each driving off on her own rhythm. */
const GOLFERS = (
  [
    { skin: "#f3d4c4", hairStyle: "sleek-bob", hairColor: "#f1d78f" },
    { skin: "#633c29", hairStyle: "afro", hairColor: "#1b1014" },
    { skin: "#c48d68", hairStyle: "mid-wavy", hairColor: "#4a2a1c" },
    { skin: "#e6b48e", hairStyle: "pixie", hairColor: "#7b4dff" },
  ] satisfies Pick<Look, "skin" | "hairStyle" | "hairColor">[]
).map((l, i): Look => ({
  ...l,
  lips: "lips-burgundy-cherry",
  brows: "brows-feathered-honey",
  outfit: i % 2 ? "jeans" : "shorts",
  outfitColor: (["#ff2f9a", "#e8e2ff", "#9b5cff", "#ffb02e"] as const)[i],
  shadow: "#ffd1f0",
}));
const OTHER_BAYS = BAY_XS.filter((x) => x !== 0);
/** Seconds between one golfer's drives, and each ball's flight. */
const EVERY = 5.5;
const FLIGHT = 4.2;

/** The other bays' balls, one each, on their arcs downrange. */
function Drives({ calm }: { calm: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    const balls = mesh.current;
    if (!balls) return;
    const t = clock.elapsedTime;
    OTHER_BAYS.forEach((x, i) => {
      const k = (t + i * 1.7) / EVERY;
      const f = calm ? 0 : ((k % 1) * EVERY) / FLIGHT;
      // each drive goes a different length, hooking a little
      const drive = Math.floor(k) * 4 + i;
      const carry = 70 + ((drive * 37) % 110);
      const side = (((drive * 13) % 9) - 4) * 2;
      const [rx, rz] = rangeToRoom([x + side * f, carry * Math.min(1, f)]);
      const y = f > 1 ? 0.05 : 0.05 + Math.sin(f * Math.PI) * carry * 0.16;
      m.makeTranslation(f > 1.4 ? x : rx, y, f > 1.4 ? TEE_Z : rz);
      balls.setMatrixAt(i, m);
    });
    balls.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, OTHER_BAYS.length]}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.06, 10, 8]} />
      <meshBasicMaterial color={hdr("#ffffff", 1.6)} toneMapped={false} />
    </instancedMesh>
  );
}

/** The ball picker out on the range, its amber beacon turning. */
function Picker({ calm }: { calm: boolean }) {
  const cart = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const g = cart.current;
    if (!g || calm) return;
    const a = clock.elapsedTime * 0.06;
    g.position.set(Math.sin(a) * 34, 0, TEE_Z - 90 + Math.cos(a) * 30);
    g.rotation.y = a + Math.PI / 2;
    if (beacon.current)
      beacon.current.color.setScalar(
        Math.sin(clock.elapsedTime * 8) > 0 ? 2.2 : 0.4,
      );
  });
  return (
    <group ref={cart} position={[0, 0, TEE_Z - 120]}>
      <mesh position-y={0.7}>
        <boxGeometry args={[1.6, 1, 2.4]} />
        <meshStandardMaterial color="#d8d8e0" metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.3, 1.6]}>
        <boxGeometry args={[2.6, 0.5, 0.8]} />
        <meshStandardMaterial color="#3a3a48" />
      </mesh>
      <mesh position-y={1.35}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshBasicMaterial ref={beacon} color="#ffb02e" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** The range's life: golfers in the other bays and their drives, the ball
 * picker trundling round the greens, and the attendant at the back. */
export function RangeNpcs(): JSX.Element {
  const calm = useReducedMotion();
  return (
    <>
      {OTHER_BAYS.map((x, i) => (
        <group
          key={x}
          position={[x - 0.5, 0, TEE_Z + 0.2]}
          rotation-y={Math.PI / 2}
        >
          <CrowdFigure look={GOLFERS[i]} seed={191 + i} />
        </group>
      ))}
      <Drives calm={calm} />
      <Picker calm={calm} />
      <TalkingNpc
        name="Imani"
        role="ticket-cashier"
        look={ATTENDANT_LOOK}
        mood="idle"
        at={[FLOOR_BOUNDS.x1 - 0.9, 0, 4.6]}
        rot={-Math.PI / 2}
        seed={196}
        greet
        context={CONTEXT}
      />
    </>
  );
}
