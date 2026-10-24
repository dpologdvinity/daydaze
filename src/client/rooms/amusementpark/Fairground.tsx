// Fairground dressing for the amusement park: food carts with striped awnings
// and balloons, lamp posts along the midway and the path out to the Starlight,
// and the cobbled path strip. Everything is instanced through Copies and
// Segments; cart parts are built in each cart's own frame and turned by its
// `rot`.

import { useMemo } from "react";
import * as THREE from "three";
import { surface } from "../../city/worldTexture.ts";
import type { Vec3 } from "../../../game/amusementPark.ts";
import { LACQUER } from "../shared/materials.ts";
import { Copies, Segments, type Copy, type Segment } from "./Instanced.tsx";
import { ball, cube, cylinder, merged } from "./models.ts";
import { useStripes } from "./Rides.tsx";

const UP = new THREE.Vector3(0, 1, 0);

// Food carts stand at the back corners of the midway. Their front faces +z in
// their own frame, turned by `rot` like the booths.
const CARTS: readonly {
  at: readonly [number, number];
  rot: number;
  color: string;
}[] = [
  { at: [-11.5, -9.5], rot: Math.PI / 2, color: "#ff6ac8" },
  { at: [11.5, -9.5], rot: -Math.PI / 2, color: "#3fe0d0" },
];

/** A point in a cart's frame, in world space. */
function inCart(cart: (typeof CARTS)[number], local: Vec3): Vec3 {
  const p = new THREE.Vector3(...local).applyAxisAngle(UP, cart.rot);
  return [cart.at[0] + p.x, p.y, cart.at[1] + p.z];
}

const CART_PAINT = merged([
  { g: cube(), size: [1.6, 1, 1.1], at: [0, 0.8, 0] },
]);
const CART_TRIM = merged([
  // counter on a block, two awning posts, and wheels
  { g: cube(), size: [1.7, 0.44, 0.36], at: [0, 0.22, 0.72] },
  { g: cube(), size: [1.7, 0.08, 0.4], at: [0, 0.46, 0.75] },
  ...[-0.75, 0.75].map((x) => ({
    g: cylinder(6),
    size: [0.04, 1.4, 0.04] as const,
    at: [x, 1.2, 0.85] as const,
  })),
  ...[-0.85, 0.85].flatMap((x) =>
    [-0.4, 0.4].map((z) => ({
      g: cylinder(10),
      size: [0.22, 0.1, 0.22] as const,
      rot: [0, 0, Math.PI / 2] as const,
      at: [x, 0.22, z] as const,
    })),
  ),
]);
// Glowing serving window and the sign above the awning.
const CART_GLOW = merged([
  { g: cube(), size: [1, 0.42, 0.04], at: [0, 0.95, 0.57] },
  { g: cube(), size: [1.5, 0.26, 0.05], at: [0, 2.24, 0.86] },
]);
const CART_AWNING = merged([
  { g: cube(), size: [1.9, 0.12, 1.2], rot: [-0.2, 0, 0], at: [0, 1.95, 0.8] },
]);

const PAINT = new THREE.MeshStandardMaterial({ roughness: 0.5 });
const TRIM = new THREE.MeshStandardMaterial({
  color: "#2b1238",
  roughness: 0.6,
});
const GLOW = new THREE.MeshBasicMaterial({ toneMapped: false });
// the fairground's cobbled path
const COBBLES = surface("cobblestone_floor_04", {
  scale: 0.8,
  color: "#b090c0",
  roughness: 0.9,
});

const BALLOON_COLORS = ["#ff2f9a", "#3fe0d0", "#ffb02e", "#9b5cff", "#3dff9a"];
// Five balloons above each cart, in the cart's frame, tied to the awning.
const BALLOON_LOCAL: readonly Vec3[] = [
  [-0.7, 2.9, 0.2],
  [0, 3.2, -0.1],
  [0.7, 2.8, 0.3],
  [-0.3, 2.6, 0.8],
  [0.5, 3.0, 0.9],
];
const BALLOON = merged([
  { g: ball(12, 9), size: [0.2, 0.24, 0.2] },
  { g: ball(6, 4), size: [0.03, 0.03, 0.03], at: [0, -0.26, 0] },
]);
const BALLOON_ITEMS: readonly Copy[] = CARTS.flatMap((cart, c) =>
  BALLOON_LOCAL.map((local, i): Copy => ({
    position: inCart(cart, local),
    color: BALLOON_COLORS[(c + i) % BALLOON_COLORS.length],
  })),
);
const BALLOON_STRINGS: readonly Segment[] = CARTS.flatMap((cart) =>
  BALLOON_LOCAL.map((local): Segment => {
    const [x, y, z] = inCart(cart, local);
    return {
      from: [x, y - 0.26, z],
      to: inCart(cart, [local[0] * 0.8, 1.9, 0.3]),
      radius: 0.008,
    };
  }),
);

// Lamp posts along the midway's side edges, just outside the walkable floor.
const LAMPS: readonly [number, number][] = [
  [-9.4, -6.5],
  [-9.4, -1],
  [-9.4, 4.5],
  [9.4, -6.5],
  [9.4, -1],
  [9.4, 4.5],
  // along the path past the rides, through the carnival arch to the Starlight
  ...[-26, -33].flatMap((z): [number, number][] => [
    [-2.2, z],
    [2.2, z],
  ]),
];

// the lit path itself, a strip of warm paving on the dark fairground
const PATH = { x: 1.4, z: -21, width: 1.6, length: 26 };
const LAMP_POLES: readonly Segment[] = LAMPS.map(([x, z]): Segment => ({
  from: [x, 0, z],
  to: [x, 3.4, z],
  radius: 0.05,
}));
const LAMP_ITEMS: readonly Copy[] = LAMPS.map(([x, z]) => ({
  position: [x, 0, z],
}));
const LAMP_CAP = merged([
  {
    g: new THREE.ConeGeometry(1, 1, 8),
    size: [0.26, 0.18, 0.26],
    at: [0, 3.5, 0],
  },
]);
const LAMP_GLOBE = merged([
  { g: ball(8, 6), size: [0.16, 0.18, 0.16], at: [0, 3.3, 0] },
]);
const LAMP_GLOW = new THREE.MeshBasicMaterial({
  color: "#ffd27a",
  toneMapped: false,
});

/** Food carts with striped awnings, balloons tied to them, and lamp posts along the midway. */
export function Fairground() {
  const awning = useStripes("#ff2f9a", "#fff1c8");
  const awningMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ map: awning, roughness: 0.5 }),
    [awning],
  );
  const cartItems: readonly Copy[] = CARTS.map((cart) => ({
    position: [cart.at[0], 0, cart.at[1]],
    yaw: cart.rot,
    color: cart.color,
  }));
  return (
    <group>
      <Copies geometry={CART_PAINT} material={PAINT} items={cartItems} />
      <Copies geometry={CART_TRIM} material={TRIM} items={cartItems} />
      <Copies geometry={CART_GLOW} material={GLOW} items={cartItems} />
      <Copies
        geometry={CART_AWNING}
        material={awningMaterial}
        items={cartItems}
      />
      <Copies geometry={BALLOON} material={PAINT} items={BALLOON_ITEMS} />
      <Segments items={BALLOON_STRINGS} color="#1a0d1d" />
      <Segments items={LAMP_POLES} color="#2a1d3a" />
      <Copies geometry={LAMP_CAP} material={LACQUER} items={LAMP_ITEMS} />
      <Copies geometry={LAMP_GLOBE} material={LAMP_GLOW} items={LAMP_ITEMS} />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[PATH.x, 0.005, PATH.z]}
        material={COBBLES}
      >
        <planeGeometry args={[PATH.width, PATH.length]} />
      </mesh>
    </group>
  );
}
