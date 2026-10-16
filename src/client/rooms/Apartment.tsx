import { ROOMS } from "../../game/rooms.ts";
import { footprint, type Furniture } from "../../game/home/decor.ts";
import type { HomeSave } from "../../game/home/home.ts";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";

// Grid origin: the floor runs x -4..4 and z -3..3, one cell per metre.
const ORIGIN = { x: -4, z: -3 };

const HEIGHT = {
  sofa: 0.5,
  bed: 0.6,
  table: 0.8,
  lamp: 1.6,
  rug: 0.04,
  plant: 1.0,
  bookshelf: 1.4,
  tv: 0.7,
} as const;

const COLOR = {
  sofa: "#c2185b",
  bed: "#ffd6e7",
  table: "#8d5a3b",
  lamp: "#ffe08a",
  rug: "#4a1f6b",
  plant: "#2e8b57",
  bookshelf: "#5b3a7a",
  tv: "#222233",
} as const;

// The rented flat: a rug-and-sofa living room with the stub shop shelf on
// the right wall. Furniture comes from the saved home layout.
export function Apartment({
  onPick,
  home,
  onShelf,
}: {
  onPick: PickHandler;
  home: HomeSave;
  onShelf: () => void;
}) {
  return (
    <>
      <color attach="background" args={["#120a1c"]} />
      <hemisphereLight args={["#ffe3f4", "#6a4a78", 1.5]} />
      <pointLight
        position={[0, 2.8, 0]}
        color="#ffd08a"
        intensity={6}
        distance={11}
      />
      <Floor
        width={8}
        depth={6}
        center={[0, 0]}
        color="#d9b8a0"
        texture={{ id: "herringbone_parquet", scale: 0.5 }}
        mirror={0.3}
        low={{ metalness: 0, roughness: 0.9 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.apartment} color="#ffd166" />
      <Walls />
      {home.furniture.map((item, index) => (
        <Piece key={`${item.id}-${index}`} item={item} />
      ))}
      {/* a window on the back wall, glowing sunset */}
      <mesh position={[-1.5, 1.7, -2.93]}>
        <boxGeometry args={[2, 1.2, 0.05]} />
        <meshStandardMaterial color="#ffb37a" emissive="#ff8a4a" />
      </mesh>
      <mesh
        position={[3.4, 1.1, -2.2]}
        onClick={onShelf}
        aria-label="Test shop shelf (stub)"
      >
        <boxGeometry args={[0.9, 2.2, 0.5]} />
        <meshStandardMaterial color="#6fd3ff" emissive="#1c5f7a" />
      </mesh>
    </>
  );
}

function Piece({ item }: { item: Furniture }) {
  const size = footprint(item.id, item.rotation);
  const x = ORIGIN.x + item.cell[0] + size.w / 2;
  const z = ORIGIN.z + item.cell[1] + size.d / 2;
  const height = HEIGHT[item.id];
  return (
    <mesh position={[x, height / 2, z]}>
      <boxGeometry args={[size.w * 0.92, height, size.d * 0.92]} />
      <meshStandardMaterial color={COLOR[item.id]} />
    </mesh>
  );
}

function Walls() {
  const wall = "#7a5a8c";
  return (
    <>
      <mesh position={[-4, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, 6]} />
        <meshStandardMaterial color={wall} />
      </mesh>
      <mesh position={[4, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, 6]} />
        <meshStandardMaterial color={wall} />
      </mesh>
      <mesh position={[0, 1.5, -3]}>
        <boxGeometry args={[8, 3, 0.1]} />
        <meshStandardMaterial color={wall} />
      </mesh>
    </>
  );
}
