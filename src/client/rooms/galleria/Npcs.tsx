// The Starlight Galleria's people: clerks at the doors of the stores that sell
// (a tap opens the shop), food court cashiers (a tap hands over the next menu
// item), two shoppers strolling an ellipse round the hall, one on the balcony
// and diners at the tables.

import { useFrame } from "@react-three/fiber";
import { useRef, type JSX } from "react";
import type * as THREE from "three";
import type {
  DialogueContext,
  DialogueRole,
} from "../../../game/dialogue/types.ts";
import { FOOD_VENUES } from "../../../game/food/venues.ts";
import {
  clerkSpot,
  DINER_SEATS,
  STALL_X,
  STALLS,
  STORES,
  TABLE_SEATS,
} from "../../../game/galleria.ts";
import type { Look } from "../../../game/look.ts";
import { Doll } from "../../avatar/Doll.tsx";
import { holdItem } from "../../food/store.ts";
import { useReducedMotion } from "../../motion.ts";
import { openShop } from "../../ui/shopRequest.ts";
import { CrowdFigure } from "../shared/CrowdFigure.tsx";
import { TalkingNpc } from "../shared/TalkingNpc.tsx";

const CONTEXT: DialogueContext = {
  venue: "galleria",
  neighborhood: "beachside",
};

const CLERK_ROLES: Record<string, DialogueRole> = {
  glitterbox: "cashier",
  "gloss-glow": "nail-tech",
  "curl-chrome": "stylist",
  "platform-palace": "cashier",
  "track-99": "dj",
};

const LOOKS: readonly Look[] = [
  {
    skin: "#f3d4c4",
    hairStyle: "mermaid",
    hairColor: "#f1d78f",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "baby-tee-mini",
    outfitColor: "#ff2f9a",
    shadow: "#ff2f9a",
  },
  {
    skin: "#633c29",
    hairStyle: "coils",
    hairColor: "#1b1014",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    outfit: "jeans",
    outfitColor: "#3fe0d0",
    shadow: "#3fe0d0",
  },
  {
    skin: "#e6b48e",
    hairStyle: "low-pony",
    hairColor: "#4a2a1c",
    lips: "lips-nude-pink-gloss",
    brows: "brows-feathered-honey",
    outfit: "blouse",
    outfitColor: "#e8e2ff",
    shadow: "#ffd1f0",
  },
  {
    skin: "#c48d68",
    hairStyle: "shag",
    hairColor: "#7b4dff",
    lips: "lips-90s-caramel-ombre",
    brows: "brows-fox-snatched",
    outfit: "flares",
    outfitColor: "#ffb02e",
    shadow: "#ffb02e",
  },
  {
    skin: "#94603f",
    hairStyle: "top-knot",
    hairColor: "#1b1014",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "tracksuit-y2k",
    outfitColor: "#9b5cff",
    shadow: "#7b4dff",
  },
  {
    skin: "#f3d4c4",
    hairStyle: "pigtails",
    hairColor: "#ff4fb3",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "shorts",
    outfitColor: "#e8e2ff",
    shadow: "#ffd1f0",
  },
];

const STROLL = { x: 2, z: 2.6, rx: 5, rz: 3.2 } as const;
const WALKING = { current: { speed: 1.1 } };

/** A shopper doing laps of the hall, round the ellipse at her own pace. */
function Stroller({
  look,
  phase,
  pace,
}: {
  look: Look;
  phase: number;
  pace: number;
}) {
  const calm = useReducedMotion();
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const a = phase + (calm ? 0 : clock.elapsedTime * pace);
    g.position.set(
      STROLL.x + Math.sin(a) * STROLL.rx,
      0,
      STROLL.z + Math.cos(a) * STROLL.rz,
    );
    // walking along the ellipse: its tangent
    g.rotation.y = Math.atan2(
      Math.cos(a) * STROLL.rx,
      -Math.sin(a) * STROLL.rz,
    );
  });
  return (
    <group ref={ref}>
      <Doll
        look={look}
        mood="idle"
        walk={WALKING}
        seed={Math.round(phase * 100)}
      />
    </group>
  );
}

/** The clerks at the store doors (tap one at a selling store to shop), the
 * food court's staff, shoppers strolling the hall and more on the balcony. */
/** Shoppers taking a break at the food court tables. */
const DINER_LOOKS: readonly Look[] = [
  {
    skin: "#94603f",
    hairStyle: "long-curly",
    hairColor: "#1b1014",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    outfit: "blouse",
    outfitColor: "#e8e2ff",
    shadow: "#d23cff",
  },
  {
    skin: "#f3d4c4",
    hairStyle: "bob",
    hairColor: "#ff4fb3",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    outfit: "baby-tee-mini",
    outfitColor: "#3fe0d0",
    shadow: "#3fe0d0",
  },
];

/**
 * Every NPC in the mall. Stores without a shop get no clerk; a food stall whose
 * venue is missing from FOOD_VENUES is skipped. Each stall cycles through its
 * menu, one item per tap, for as long as this stays mounted.
 */
export function GalleriaNpcs(): JSX.Element {
  const served = useRef<Record<string, number>>({});
  return (
    <>
      {STORES.map((store, i) => {
        const [x, z] = clerkSpot(store);
        const shop = store.shop;
        // only the stores that sell have a clerk at the door
        if (!shop) return null;
        return (
          <TalkingNpc
            key={store.id}
            name={store.name}
            role={CLERK_ROLES[store.id] ?? "cashier"}
            look={LOOKS[i % LOOKS.length]}
            mood="idle"
            at={[x + 0.9, 0, z]}
            rot={0}
            seed={181 + i}
            greet={i === 0}
            context={CONTEXT}
            onTap={() => openShop(shop, store.name)}
          />
        );
      })}
      {STALLS.map((stall, i) => {
        const venue = FOOD_VENUES.find((v) => v.id === stall.venue);
        if (!venue) return null;
        return (
          <TalkingNpc
            key={stall.venue}
            name={venue.name}
            role="snack-cashier"
            look={LOOKS[(i + 3) % LOOKS.length]}
            mood="idle"
            at={[STALL_X + 0.3, 0, stall.z]}
            rot={-Math.PI / 2}
            seed={190 + i}
            situation="action-ordering"
            context={CONTEXT}
            onTap={() => {
              const n = served.current[venue.id] ?? 0;
              holdItem(venue.menu[n % venue.menu.length]);
              served.current[venue.id] = n + 1;
            }}
          />
        );
      })}
      {[0, 3.1].map((phase, i) => (
        <Stroller
          key={phase}
          look={LOOKS[(i * 2 + 1) % LOOKS.length]}
          phase={phase}
          pace={0.09 + i * 0.015}
        />
      ))}
      {/* shoppers leaning on the balcony rail over the stores */}
      {[-2].map((x, i) => (
        <group key={x} position={[x, 4.35, -8.2]} rotation-y={0}>
          <CrowdFigure look={LOOKS[(i + 2) % LOOKS.length]} seed={195 + i} />
        </group>
      ))}
      {DINER_SEATS.map((seat, i) => {
        const { at, facing } = TABLE_SEATS[seat];
        return (
          <group
            key={seat}
            // a chair's height, less where a sitting doll's thighs come to
            position={[at[0], 0.45 - 0.48, at[1]]}
            rotation-y={Math.atan2(facing[0] - at[0], facing[1] - at[1])}
          >
            <Doll
              look={DINER_LOOKS[i % DINER_LOOKS.length]}
              mood="sit"
              seed={241 + i}
            />
          </group>
        );
      })}
    </>
  );
}
