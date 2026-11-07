// The Starlight yacht party: a motor yacht cruising a loop around Starboard Bay
// under string lights and a sunset/night sky. Players board from a gangway in
// the Marina, ride the cruise, dance on the teak deck, hit the hot tub and
// mocktail bar, and return to the dock. The deck bobs and rolls gently via
// deckBob / deckRoll from src/game/yacht.ts (pure logic, tested).
//
// Draw calls: yacht GLB (1) + floor (1) + bar counter (1) + hot tub (1) +
// skyline strip (1) + string-lights batch (1) + NPCs (3) = ~9 extra on this
// scene on top of the room portal/HUD base. Well within the 250-call budget.

import { Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import type { JSX } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { byTier } from "../../game/age.ts";
import type { DialogueContext } from "../../game/dialogue/types.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import {
  deckBob,
  deckRoll,
  yachtStateAt,
  type YachtState,
} from "../../game/yacht.ts";
import { CitySky } from "../city/CitySky.tsx";
import { useDaylight } from "../city/daylight.ts";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import type { Player } from "../world/PlayerController.tsx";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Batch } from "./shared/batch.ts";
import { stringLights } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { hdr } from "./shared/materials.ts";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Prop } from "./shared/Prop.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

// ─── palette ────────────────────────────────────────────────────────────────

/** Warm white teak decking. */
const TEAK = surface("wood_veneer", {
  scale: 1.4,
  color: "#c8a068",
  roughness: 0.6,
});
/** Dark navy hull-painted surfaces. */
const NAVY = surface("wood_plank_wall", { scale: 1, color: "#1a2a5a" });
/** Cobalt-blue tiles for the hot tub. */
const TUB_TILE = surface("rounded_square_tiled_wall", {
  scale: 0.6,
  color: "#1e6fba",
});
/** Warm amber LED strip emissive for the dance floor edge. */
const LED_AMBER = new THREE.MeshBasicMaterial({
  color: hdr("#ffb040", 2.2),
  toneMapped: false,
});
/** Tropical-teal bar counter top. */
const BAR_TOP = new THREE.MeshStandardMaterial({
  color: "#2a9080",
  metalness: 0.3,
  roughness: 0.3,
});
/** Hot tub water: a bright aqua glow. */
const TUB_WATER = new THREE.MeshBasicMaterial({
  color: hdr("#5fe8ff", 1.0),
  toneMapped: false,
});
/** Port and starboard navigation lights. */
const NAV_RED = new THREE.MeshBasicMaterial({
  color: hdr("#ff2a2a", 1.6),
  toneMapped: false,
});
const NAV_GREEN = new THREE.MeshBasicMaterial({
  color: hdr("#2aff6a", 1.6),
  toneMapped: false,
});
/** Stainless guard rails. */
const RAIL = new THREE.MeshStandardMaterial({
  color: "#c8d0d8",
  metalness: 0.7,
  roughness: 0.2,
});

// ─── skyline backdrop ───────────────────────────────────────────────────────

/** Skyline height scale: the camera frames only the lowest ~18 m of it. */
const SKY_SCALE = 0.55;

/**
 * City skyline strip behind the bay: tall boxes, three rows deep, with a UV
 * window grid so one lit-window texture covers every face. Merged to one mesh.
 */
function skylineGeometry(): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  // deterministic pseudo-random so the skyline never changes between visits
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let row = 0; row < 3; row++) {
    for (let x = -90; x <= 90; x += 5 + rand() * 4) {
      const h = (12 + rand() * 34 - row * 4) * SKY_SCALE;
      const w = 3 + rand() * 4;
      const g = new THREE.BoxGeometry(w, h, 3);
      g.translate(x, h / 2, row * -9);
      pieces.push(g);
    }
  }
  const merged = mergeGeometries(pieces);
  if (!merged) throw new Error("skyline: geometries differ in attributes");
  return merged;
}

/** A tile of dark glass with scattered warm lit windows, for the skyline. */
function windowTexture(): THREE.CanvasTexture | null {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#0b1224";
  ctx.fillRect(0, 0, 32, 64);
  let seed = 11;
  for (let y = 2; y < 62; y += 4) {
    for (let x = 2; x < 30; x += 4) {
      seed = (seed * 16807) % 2147483647;
      if (seed % 100 < 38) {
        ctx.fillStyle = seed % 7 === 0 ? "#9fe8ff" : "#ffd58a";
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── hull ───────────────────────────────────────────────────────────────────

/** Half beam of the hull, m. The walkable teak (16 m wide) sits inside it. */
const HALF_BEAM = 8.4;
/** The hull's stern edge (z) and bow tip (z, toward -z). */
const STERN_Z = 9;
const BOW_Z = -27;
/** Where the straight sides end and the bow starts to taper (z). */
const BOW_START_Z = -10;

/**
 * The deck outline seen from above: a squared stern with chamfered corners,
 * straight sides, and a bow that tapers to a point. Shape y is world -z (the
 * geometry is turned flat after extruding). `inset` pulls the outline in.
 */
function hullOutline(inset: number): THREE.Vector2[] {
  const w = HALF_BEAM - inset;
  const sternY = -STERN_Z + inset;
  const startY = -BOW_START_Z;
  const tipY = -BOW_Z - inset * 2.2;
  const right: THREE.Vector2[] = [
    new THREE.Vector2(w - 0.9, sternY),
    new THREE.Vector2(w, sternY + 0.8),
    new THREE.Vector2(w, startY),
  ];
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    right.push(
      new THREE.Vector2(w * (1 - t ** 1.6), startY + (tipY - startY) * t),
    );
  }
  // left side: the mirror image, walked back from the bow to the stern
  const left = right
    .slice(0, -1)
    .reverse()
    .map((p) => new THREE.Vector2(-p.x, p.y));
  return [...right, ...left];
}

/** The hull outline pushed outward ~1 m: the foam ring around the waterline. */
function hullOutlineWide(): THREE.Vector2[] {
  return hullOutline(-1);
}

/** Extrudes an outline upward from y = 0 by `height`, lying flat. */
function slab(
  outline: THREE.Vector2[],
  height: number,
  hole?: THREE.Vector2[],
): THREE.BufferGeometry {
  const shape = new THREE.Shape(outline);
  if (hole) shape.holes.push(new THREE.Path(hole));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  });
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Hull-body paint: deep navy below the deck, white bulwark above. */
const HULL_NAVY = new THREE.MeshStandardMaterial({
  color: "#14224a",
  roughness: 0.35,
  metalness: 0.2,
});
const HULL_WHITE = new THREE.MeshStandardMaterial({
  color: "#eef1f6",
  roughness: 0.4,
});
/** Lit cabin windows. */
const GLASS = new THREE.MeshBasicMaterial({
  color: hdr("#58b4d8", 0.7),
  toneMapped: false,
});

// ─── static scene geometry (batch) ─────────────────────────────────────────

function buildDeck(): THREE.Group {
  const b = new Batch();

  // hull: navy body under the deck, foredeck teak, white bulwark ring
  const body = slab(hullOutline(0), 1.5);
  body.translate(0, -1.55, 0); // top sits under the teak so they never z-fight
  b.add(body, HULL_NAVY);
  b.add(slab(hullOutline(0.35), 0.01), TEAK, { position: [0, -0.012, 0] });
  b.add(slab(hullOutline(0), 0.7, hullOutline(0.35)), HULL_WHITE);

  // stern step (gangway platform)
  const stern = new THREE.BoxGeometry(4, 0.3, 1.5);
  b.add(stern, TEAK, { position: [0, -0.15, 7.2] });

  // forward cabin, flybridge deck above it, windows, mast and radar
  const cabin = new THREE.BoxGeometry(6.4, 1.7, 3.6);
  b.add(cabin, HULL_WHITE, { position: [0, 0.85, -13.0] });
  const frontWindows = new THREE.BoxGeometry(5.6, 0.6, 0.06);
  b.add(frontWindows, GLASS, { position: [0, 1.0, -11.17] });
  const sideWindows = new THREE.BoxGeometry(0.06, 0.6, 2.6);
  b.add(sideWindows, GLASS, { position: [-3.23, 1.0, -13.0] });
  b.add(sideWindows, GLASS, { position: [3.23, 1.0, -13.0] });
  const flybridge = new THREE.BoxGeometry(5.6, 0.15, 3.0);
  b.add(flybridge, TEAK, { position: [0, 1.78, -13.0] });
  const fbWall = new THREE.BoxGeometry(5.6, 0.7, 0.1);
  b.add(fbWall, HULL_WHITE, { position: [0, 2.2, -11.6] });
  const mast = new THREE.CylinderGeometry(0.06, 0.09, 2.6, 8);
  b.add(mast, RAIL, { position: [0, 3.1, -14.0] });
  const radar = new THREE.BoxGeometry(1.2, 0.1, 0.25);
  b.add(radar, RAIL, { position: [0, 4.4, -14.0] });
  // bow anchor light (red port, green starboard)
  const navLight = new THREE.SphereGeometry(0.12, 8, 6);
  b.add(navLight, NAV_RED, { position: [-2.7, 2.6, -11.6] });
  b.add(navLight, NAV_GREEN, { position: [2.7, 2.6, -11.6] });

  // railing posts (port + starboard, bow + midship)
  const post = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6);
  for (let z = -8; z <= 7; z += 2) {
    b.add(post, RAIL, { position: [-7.5, 0.95, z] });
    b.add(post, RAIL, { position: [7.5, 0.95, z] });
  }
  // railing top rail (port + starboard)
  const longRail = new THREE.CylinderGeometry(0.025, 0.025, 15, 6);
  b.add(longRail, RAIL, {
    position: [-7.5, 1.5, -0.5],
    rotation: [Math.PI / 2, 0, 0],
  });
  b.add(longRail, RAIL, {
    position: [7.5, 1.5, -0.5],
    rotation: [Math.PI / 2, 0, 0],
  });

  // hot tub (starboard aft): a round tiled tub brimming with glowing water
  const tubRim = new THREE.CylinderGeometry(1.7, 1.7, 0.8, 28);
  b.add(tubRim, TUB_TILE, { position: [5.2, 0.4, 4.6] });
  const tubWater = new THREE.CylinderGeometry(1.4, 1.4, 0.02, 28);
  b.add(tubWater, TUB_WATER, { position: [5.2, 0.8, 4.6] });

  // DJ booth riser (bow)
  const djRiser = new THREE.BoxGeometry(3.2, 0.3, 2.0);
  b.add(djRiser, TEAK, { position: [0, 0.15, -7.5] });

  // dance floor LED edge strip (emissive)
  const ledEdge = new THREE.BoxGeometry(8.5, 0.05, 0.08);
  b.add(ledEdge, LED_AMBER, { position: [0, 0.025, -4.0] });
  b.add(ledEdge, LED_AMBER, { position: [0, 0.025, 2.0] });
  const ledSide = new THREE.BoxGeometry(0.08, 0.05, 6.0);
  b.add(ledSide, LED_AMBER, { position: [-4.25, 0.025, -1.0] });
  b.add(ledSide, LED_AMBER, { position: [4.25, 0.025, -1.0] });

  // bar counter (port aft)
  const barBack = new THREE.BoxGeometry(4.5, 1.1, 0.5);
  b.add(barBack, NAVY, { position: [-5.5, 0.55, 2.5] });
  const barTopG = new THREE.BoxGeometry(4.7, 0.08, 0.6);
  b.add(barTopG, BAR_TOP, { position: [-5.5, 1.14, 2.5] });

  return b.build();
}

// ─── string-light geometry ──────────────────────────────────────────────────

function buildLights(): THREE.Group {
  const b = new Batch();
  // four lines of warm white bulbs port-to-starboard at different heights
  stringLights(b, [-7.3, 3.2, -6.0], [7.3, 3.2, -6.0], 10, "#ffe8c0");
  stringLights(b, [-7.3, 3.5, -1.5], [7.3, 3.5, -1.5], 10, "#ffe8c0");
  stringLights(b, [-7.3, 3.2, 2.5], [7.3, 3.2, 2.5], 10, "#ffe8c0");
  // aft anchor line, over the bar
  stringLights(b, [-7.3, 2.8, 5.5], [0, 2.8, 5.5], 6, "#ffdb90");
  return b.build();
}

// ─── NPC looks ──────────────────────────────────────────────────────────────

const CAPTAIN_LOOK: Look = {
  skin: "#94603f",
  hairStyle: "crop",
  hairColor: "#1b1014",
  lips: "lips-90s-caramel-ombre",
  brows: "brows-sculpted-espresso",
  outfit: "denim-shirt",
  outfitColor: "#3a5a8a",
  shadow: "#8a5a3c",
};

const CREW_LOOK: Look = {
  skin: "#e6b48e",
  hairStyle: "low-pony",
  hairColor: "#b77a3e",
  lips: "lips-coral-pop",
  brows: "brows-feathered-honey",
  outfit: "blouse",
  outfitColor: "#e8e2ff",
  shadow: "#ffb02e",
};

const DJ_LOOK: Look = {
  skin: "#633c29",
  hairStyle: "braids",
  hairColor: "#1b1014",
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  outfit: "sequin-slip",
  outfitColor: "#ffb02e",
  shadow: "#ffd1f0",
};

const CROWD: readonly Look[] = [
  {
    skin: "#f3d4c4",
    hairStyle: "mermaid",
    hairColor: "#f1d78f",
    outfit: "mini",
    outfitColor: "#ff2f9a",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    shadow: "#ffd1f0",
  },
  {
    skin: "#94603f",
    hairStyle: "coils",
    hairColor: "#1b1014",
    outfit: "mini",
    outfitColor: "#3fe0d0",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    shadow: "#3fe0d0",
  },
  {
    skin: "#c48d68",
    hairStyle: "sleek-bob",
    hairColor: "#b77a3e",
    outfit: "shorts",
    outfitColor: "#ffb02e",
    lips: "lips-nude-pink-gloss",
    brows: "brows-feathered-honey",
    shadow: "#ffb02e",
  },
  {
    skin: "#f3d4c4",
    hairStyle: "low-pony",
    hairColor: "#1b1014",
    outfit: "blouse",
    outfitColor: "#9b5cff",
    lips: "lips-coral-pop",
    brows: "brows-sculpted-espresso",
    shadow: "#d23cff",
  },
];

const YACHT_CONTEXT: DialogueContext = {
  venue: "yacht",
  neighborhood: "beachside",
};

// ─── Skyline backdrop ────────────────────────────────────────────────────────

function Skyline(): JSX.Element {
  const geo = useMemo(skylineGeometry, []);
  const map = useMemo(windowTexture, []);
  return (
    <mesh geometry={geo} position={[0, -1, -95]}>
      <meshBasicMaterial map={map} fog={false} toneMapped={false} />
    </mesh>
  );
}

// ─── Lounge seating ──────────────────────────────────────────────────────────

/** Sofas from the Quaternius house pack (CC0) around the dance floor. */
function Lounge(): JSX.Element {
  return (
    <>
      <Prop
        model="sofa-small"
        dir="home"
        width={1.7}
        depth={2.6}
        height={1.1}
        yaw={Math.PI / 2}
        position={[-6.5, 0, -5.8]}
      />
      <Prop
        model="sofa-small"
        dir="home"
        width={1.7}
        depth={2.6}
        height={1.1}
        yaw={Math.PI / 2}
        position={[-6.5, 0, -3.0]}
      />
      <Prop
        model="sofa"
        dir="home"
        width={1.8}
        depth={3.2}
        height={1.1}
        yaw={-Math.PI / 2}
        position={[6.5, 0, -4.5]}
      />
      <Prop
        model="coffee-table"
        dir="home"
        width={1.0}
        depth={1.6}
        height={0.5}
        position={[-5.2, 0, -4.4]}
      />
    </>
  );
}

// ─── Water and wake ──────────────────────────────────────────────────────────

/** The hull's foam line on the water, pulsing softly; a moon path glitters. */
function Wake({ calm }: { calm: boolean }): JSX.Element {
  const foamMat = useRef<THREE.MeshBasicMaterial>(null);
  const pathMat = useRef<THREE.MeshBasicMaterial>(null);
  const foam = useMemo(() => {
    const shape = new THREE.Shape(hullOutlineWide());
    shape.holes.push(new THREE.Path(hullOutline(0.15)));
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (calm) return;
    const t = clock.elapsedTime;
    if (foamMat.current)
      foamMat.current.opacity = 0.32 + Math.sin(t * 1.3) * 0.1;
    if (pathMat.current)
      pathMat.current.opacity = 0.16 + Math.sin(t * 2.1) * 0.05;
  });
  return (
    <>
      <mesh geometry={foam} position={[0, -0.6, 0]}>
        <meshBasicMaterial
          ref={foamMat}
          color="#e8f6ff"
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      </mesh>
      {/* the moon over the skyline, and its glitter path across the bay */}
      <mesh position={[-24, 20, -120]}>
        <circleGeometry args={[4.5, 32]} />
        <meshBasicMaterial
          color={hdr("#fff4dc", 1.4)}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-16, -0.6, -60]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[4, 90]} />
        <meshBasicMaterial
          ref={pathMat}
          color="#fff4dc"
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

// ─── Deck NPCs ───────────────────────────────────────────────────────────────

/** Captain at the helm (aft), crew at the bar, DJ at the booth, dancers. */
function YachtNpcs(): JSX.Element {
  return (
    <>
      {/* Captain – helm, aft starboard */}
      <TalkingNpc
        name="Captain"
        role="captain"
        look={CAPTAIN_LOOK}
        mood="idle"
        at={[5.8, 0, -8.0]}
        rot={Math.PI}
        seed={301}
        greet
        context={YACHT_CONTEXT}
        data-testid="npc-captain"
      />
      {/* Crew – bar port aft */}
      <TalkingNpc
        name="Mia"
        role="crew"
        look={CREW_LOOK}
        mood="dance"
        dance="bartending"
        at={[-5.5, 0, 2.0]}
        rot={Math.PI / 2}
        seed={302}
        situation="action-ordering"
        context={YACHT_CONTEXT}
        data-testid="npc-crew"
      />
      {/* DJ – at the booth, bow */}
      <TalkingNpc
        name="DJ Prism"
        role="dj"
        look={DJ_LOOK}
        mood="dance"
        dance="raise-the-roof"
        at={[0, 0, -7.5]}
        rot={Math.PI}
        seed={303}
        context={YACHT_CONTEXT}
        data-testid="npc-dj"
      />
      {/* Dancing crowd on the dance floor */}
      {CROWD.map((look, i) => (
        <group
          key={i}
          position={[(-1.5 + i) * 2.0, 0, -1.5 + (i % 2 === 0 ? -0.8 : 0.8)]}
          rotation-y={(i * Math.PI) / 2.5}
          data-testid={`dancer-${i}`}
        >
          <CrowdFigure look={look} dance seed={304 + i} />
        </group>
      ))}
      {/* Two guests chilling in hot tub area */}
      <group position={[4.4, 0, 4.0]} rotation-y={Math.PI / 3}>
        <CrowdFigure look={CROWD[0]} seed={308} />
      </group>
      <group position={[6.0, 0, 5.2]} rotation-y={-Math.PI / 4}>
        <CrowdFigure look={CROWD[1]} seed={309} />
      </group>
    </>
  );
}

// ─── Mocktail bar label ──────────────────────────────────────────────────────

function BarSign(): JSX.Element {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#1a2a5a";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#3fe0d0";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MOCKTAIL BAR", 128, 28);
    ctx.fillStyle = "#ffe8c0";
    ctx.font = "13px sans-serif";
    ctx.fillText(byTier("Ask Mia · all ages", "Ask Mia · all ages"), 128, 50);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  if (!texture) return <></>;
  return (
    <mesh position={[-5.5, 1.6, 2.1]}>
      <planeGeometry args={[1.8, 0.45]} />
      <meshBasicMaterial map={texture} fog={false} transparent />
    </mesh>
  );
}

// ─── Main exported scene ─────────────────────────────────────────────────────

/**
 * Starlight Yacht Party: a motor yacht cruising a loop around Starboard Bay.
 * The deck bobs (deckBob) and rolls (deckRoll) gently; pure route logic is in
 * src/game/yacht.ts. Players walk the teak deck, dance, use the hot tub and
 * mocktail bar, and disembark through the gangway portal.
 *
 * Uses public/models/marina/yacht.glb (CC-BY 3.0, credited in docs/assets.md
 * and src/game/credits.ts).
 */
export function Yacht({
  onPick,
  player: _,
}: {
  onPick: PickHandler;
  player: Player;
}): JSX.Element {
  const calm = useReducedMotion();
  const daylight = useDaylight();
  const deck = useMemo(buildDeck, []);
  const lights = useMemo(buildLights, []);
  const deckRef = useRef<THREE.Group>(null);
  const skylineRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now() / 1000);
  const gl = useThree((s) => s.gl);

  const stateRef = useRef<YachtState>({
    x: 0,
    z: 0,
    heading: 0,
    atDock: true,
    loopProgress: 0,
    leg: 0,
  });
  const prevCruise = useRef("");
  const prevLeg = useRef(-1);

  useFrame(() => {
    const t = Date.now() / 1000 - startTime.current;
    yachtStateAt(t, stateRef.current);
    const cruise = stateRef.current;
    const cruiseStatus = cruise.atDock ? "docked" : "cruising";

    if (prevCruise.current !== cruiseStatus) {
      prevCruise.current = cruiseStatus;
      gl.domElement.dataset.yachtCruise = cruiseStatus;
    }
    if (prevLeg.current !== cruise.leg) {
      prevLeg.current = cruise.leg;
      gl.domElement.dataset.yachtLeg = String(cruise.leg);
    }

    if (skylineRef.current) {
      // Perspective shifts as yacht circles the bay
      skylineRef.current.position.x = -cruise.x * 0.35;
      skylineRef.current.position.z = -cruise.z * 0.35;
      skylineRef.current.rotation.y = -cruise.heading * 0.25;
    }

    if (!calm && deckRef.current) {
      deckRef.current.position.y = deckBob(t);
      deckRef.current.rotation.z = deckRoll(t);
    }
  });

  return (
    <>
      <color attach="background" args={["#060a1c"]} />
      <fog attach="fog" args={["#0a1430", 40, 140]} />

      {/* City sunset/night sky dome with clouds & horizon glow */}
      <CitySky night={daylight.neon} />

      {/* Lighting: hemisphere + warm point over dance floor + mocktail accent */}
      <hemisphereLight args={["#9fb8ff", "#0b2a4a", 0.85]} />
      <pointLight
        position={[0, 4.0, -1.5]}
        color="#ffe3b0"
        intensity={8}
        distance={20}
      />
      <pointLight
        position={[-5.5, 2.5, 2.5]}
        color="#3fe0d0"
        intensity={4}
        distance={12}
      />

      {/* Twinkling star field */}
      <Stars
        radius={90}
        depth={20}
        count={900}
        factor={3}
        fade
        speed={calm ? 0 : 0.3}
      />

      {/* City skyline silhouette in the distance behind the bay */}
      <group ref={skylineRef}>
        <Skyline />
      </group>

      <Wake calm={calm} />

      {/* Water plane around the yacht */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -0.65, 0]}
        onClick={(e) => {
          if (e.delta <= 6) {
            e.stopPropagation();
            onPick([e.point.x, e.point.z]);
          }
        }}
        data-testid="water-plane"
      >
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial
          color="#103a66"
          metalness={0.5}
          roughness={0.25}
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </mesh>

      {/* Bobbing deck group – everything on the yacht */}
      <group ref={deckRef} data-testid="yacht-deck">
        {/* Teak walking deck */}
        <Floor
          width={16}
          depth={18}
          center={[0, -1]}
          color="#c8a068"
          texture={{ id: "wood_veneer", scale: 1.4 }}
          roughness={0.65}
          low={{ metalness: 0, roughness: 0.75 }}
          onPick={onPick}
        />

        {/* Hull, railings, bar, hot tub geometry */}
        <primitive object={deck} />

        {/* String lights */}
        <primitive object={lights} />

        {/* DJ booth prop */}
        <Suspense fallback={null}>
          <Prop
            model="dj-booth"
            width={2.4}
            depth={1.4}
            height={1.1}
            position={[0, 0.3, -7.5]}
            data-testid="dj-booth"
          />
        </Suspense>

        {/* Sofas and a coffee table around the dance floor */}
        <Suspense fallback={null}>
          <Lounge />
        </Suspense>

        {/* Mocktail bar sign */}
        <BarSign />

        {/* NPCs: captain, crew, DJ, dancers */}
        <YachtNpcs />
      </group>

      {/* Portal pads (gangway exit on the stern) */}
      <PortalPads room={ROOMS.yacht} color="#3fe0d0" />
    </>
  );
}
