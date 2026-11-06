// The Starlight yacht party: a motor yacht cruising a loop around Starboard Bay
// under string lights and a sunset/night sky. Players board from a gangway in
// the Marina, ride the cruise, dance on the teak deck, hit the hot tub and
// mocktail bar, and return to the dock. The deck bobs and rolls gently via
// deckBob / deckRoll from src/game/yacht.ts (pure logic, tested).
//
// Draw calls: yacht GLB (1) + floor (1) + bar counter (1) + hot tub (1) +
// skyline strip (1) + string-lights batch (1) + NPCs (3) = ~9 extra on this
// scene on top of the room portal/HUD base. Well within the 250-call budget.

import { Stars, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import type { JSX } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { byTier } from "../../game/age.ts";
import type { DialogueContext } from "../../game/dialogue/types.ts";
import type { Look } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { deckBob, deckRoll } from "../../game/yacht.ts";
import { CrowdFigure } from "./shared/CrowdFigure.tsx";
import { Batch } from "./shared/batch.ts";
import { stringLights } from "./shared/details.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { hdr } from "./shared/materials.ts";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Prop } from "./shared/Prop.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { surface } from "../city/worldTexture.ts";
import { useReducedMotion } from "../motion.ts";
import type { Player } from "../world/PlayerController.tsx";

// ─── palette ────────────────────────────────────────────────────────────────

/** Warm white teak decking. */
const TEAK = surface("wood_veneer", { scale: 1.4, color: "#c8a068", roughness: 0.6 });
/** Dark navy hull-painted surfaces. */
const NAVY = surface("wood_plank_wall", { scale: 1, color: "#1a2a5a" });
/** Glossy white gel-coat for railings. */
const WHITE_GLOSS = new THREE.MeshStandardMaterial({
  color: "#f4f8ff",
  metalness: 0.1,
  roughness: 0.2,
});
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
/** Stainless guard rails. */
const RAIL = new THREE.MeshStandardMaterial({
  color: "#c8d0d8",
  metalness: 0.7,
  roughness: 0.2,
});

// ─── skyline backdrop ───────────────────────────────────────────────────────

/**
 * City skyline silhouette strip behind the cruise. Generated procedurally (a
 * handful of boxes), placed far aft so it frames the dance floor view. Reuses
 * the approach from HotelRooftop's skylineGeometry.
 */
function skylineGeometry(): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  const buildings: readonly [number, number, number][] = [
    [-42, 24, 2],
    [-34, 18, 3],
    [-26, 32, 2.5],
    [-20, 14, 2],
    [-13, 20, 2],
    [-8, 10, 1.5],
    [-2, 28, 3],
    [5, 16, 2],
    [12, 22, 2],
    [18, 36, 2.5],
    [25, 18, 2],
    [32, 12, 2],
    [38, 26, 3],
    [44, 16, 2],
  ];
  for (const [x, h, w] of buildings) {
    const g = new THREE.BoxGeometry(w, h, 1);
    g.translate(x, h / 2, 0);
    pieces.push(g);
    // lit windows: tiny bright squares scattered up each building face
    const wins = new THREE.BoxGeometry(w * 0.9, h * 0.9, 0.5);
    wins.translate(x, h / 2, 0.5);
    pieces.push(wins);
  }
  return mergeGeometries(pieces);
}

// ─── static scene geometry (batch) ─────────────────────────────────────────

function buildDeck(): THREE.Group {
  const b = new Batch();

  // hull sides: low boxes port and starboard
  const hull = new THREE.BoxGeometry(1, 0.8, 18);
  b.add(hull, NAVY, { x: -8, y: 0.4, z: -1 });
  b.add(hull, NAVY, { x: 8, y: 0.4, z: -1 });

  // bow transom
  const bow = new THREE.BoxGeometry(16, 0.8, 1);
  b.add(bow, NAVY, { x: 0, y: 0.4, z: -9.5 });

  // stern step (gangway platform)
  const stern = new THREE.BoxGeometry(4, 0.3, 1.5);
  b.add(stern, TEAK, { x: 0, y: -0.15, z: 7.2 });

  // railing posts (port + starboard, bow + midship)
  const post = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6);
  for (let z = -8; z <= 7; z += 2) {
    b.add(post, RAIL, { x: -7.5, y: 0.95, z });
    b.add(post, RAIL, { x: 7.5, y: 0.95, z });
  }
  // bow rail posts
  for (let x = -7; x <= 7; x += 2) {
    b.add(post, RAIL, { x, y: 0.95, z: -9 });
  }

  // railing top rail (port + starboard)
  const longRail = new THREE.CylinderGeometry(0.025, 0.025, 15, 6);
  longRail.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
  b.add(
    new THREE.CylinderGeometry(0.025, 0.025, 15, 6),
    RAIL,
    { x: -7.5, y: 1.5, z: -1.5 },
    new THREE.Euler(0, 0, Math.PI / 2),
  );
  b.add(
    new THREE.CylinderGeometry(0.025, 0.025, 15, 6),
    RAIL,
    { x: 7.5, y: 1.5, z: -1.5 },
    new THREE.Euler(0, 0, Math.PI / 2),
  );
  // bow rail top
  const bowRail = new THREE.CylinderGeometry(0.025, 0.025, 14.5, 6);
  bowRail.applyMatrix4(
    new THREE.Matrix4().makeRotationX(Math.PI / 2),
  );
  b.add(bowRail, RAIL, { x: 0, y: 1.5, z: -9 });

  // hot tub (starboard aft): a shallow box + tiled interior
  const tubOuter = new THREE.BoxGeometry(3.4, 0.8, 2.6);
  b.add(tubOuter, NAVY, { x: 5.2, y: 0.4, z: 4.6 });
  const tubInner = new THREE.BoxGeometry(2.6, 0.5, 2.0);
  b.add(tubInner, TUB_TILE, { x: 5.2, y: 0.55, z: 4.6 });

  // DJ booth riser (aft)
  const djRiser = new THREE.BoxGeometry(3.2, 0.3, 2.0);
  b.add(djRiser, TEAK, { x: 0, y: 0.15, z: -7.5 });

  // dance floor LED edge strip (emissive)
  const ledEdge = new THREE.BoxGeometry(8.5, 0.05, 0.08);
  b.add(ledEdge, LED_AMBER, { x: 0, y: 0.025, z: -4.0 });
  b.add(ledEdge, LED_AMBER, { x: 0, y: 0.025, z: 2.0 });
  const ledSide = new THREE.BoxGeometry(0.08, 0.05, 6.0);
  b.add(ledSide, LED_AMBER, { x: -4.25, y: 0.025, z: -1.0 });
  b.add(ledSide, LED_AMBER, { x: 4.25, y: 0.025, z: -1.0 });

  // bar counter (port aft)
  const barBack = new THREE.BoxGeometry(4.5, 1.1, 0.5);
  b.add(barBack, NAVY, { x: -5.5, y: 0.55, z: 2.5 });
  const barTopG = new THREE.BoxGeometry(4.7, 0.08, 0.6);
  b.add(barTopG, BAR_TOP, { x: -5.5, y: 1.14, z: 2.5 });

  // lounge chairs (port mid)
  const chairSeat = new THREE.BoxGeometry(0.7, 0.2, 1.4);
  const chairBack = new THREE.BoxGeometry(0.7, 0.6, 0.15);
  const chairMat = new THREE.MeshStandardMaterial({
    color: "#e8d8c0",
    roughness: 0.8,
  });
  for (let i = 0; i < 3; i++) {
    b.add(chairSeat, chairMat, { x: -6.0, y: 0.1, z: -3.5 + i * 2.0 });
    b.add(chairBack, chairMat, { x: -6.0, y: 0.5, z: -4.1 + i * 2.0 });
  }

  return b.build();
}

// ─── string-light geometry ──────────────────────────────────────────────────

function buildLights(): THREE.Group {
  const b = new Batch();
  // four lines of warm white bulbs port-to-starboard at different heights
  stringLights(b, { x0: -7.3, x1: 7.3, z: -6.0, y: 3.2 }, 10, "#ffe8c0");
  stringLights(b, { x0: -7.3, x1: 7.3, z: -1.5, y: 3.5 }, 10, "#ffe8c0");
  stringLights(b, { x0: -7.3, x1: 7.3, z: 2.5, y: 3.2 }, 10, "#ffe8c0");
  // aft anchor line, over the bar
  stringLights(b, { x0: -7.3, x1: 0, z: 5.5, y: 2.8 }, 6, "#ffdb90");
  return b.build();
}

// ─── NPC looks ──────────────────────────────────────────────────────────────

const CAPTAIN_LOOK: Look = {
  skin: "#6b4030",
  hairStyle: "short-taper",
  hairColor: "#1c1010",
  lips: "lips-nude-brown",
  brows: "brows-sculpted-espresso",
  outfit: "button-up",
  outfitColor: "#2a3a6a",
  shadow: "#a0b8ff",
};

const CREW_LOOK: Look = {
  skin: "#e0b898",
  hairStyle: "low-pony",
  hairColor: "#c8782a",
  lips: "lips-coral-satin",
  brows: "brows-feathered-honey",
  outfit: "blouse",
  outfitColor: "#ffffff",
  shadow: "#ffc080",
};

const DJ_LOOK: Look = {
  skin: "#3a2a1a",
  hairStyle: "braids-high",
  hairColor: "#1b1014",
  lips: "lips-hot-pink-glam",
  brows: "brows-y2k-thin",
  outfit: "sequin-slip",
  outfitColor: "#ffb02e",
  shadow: "#ffd1f0",
};

const CROWD: readonly Look[] = [
  {
    skin: "#f0d4c8",
    hairStyle: "mermaid",
    hairColor: "#f1d78f",
    outfit: "bikini",
    outfitColor: "#ff2f9a",
    lips: "lips-hot-pink-glam",
    brows: "brows-y2k-thin",
    shadow: "#ffd1f0",
  },
  {
    skin: "#a06840",
    hairStyle: "coils",
    hairColor: "#1b1014",
    outfit: "mini",
    outfitColor: "#3fe0d0",
    lips: "lips-burgundy-cherry",
    brows: "brows-sculpted-espresso",
    shadow: "#3fe0d0",
  },
  {
    skin: "#c88060",
    hairStyle: "sleek-bob",
    hairColor: "#a0580a",
    outfit: "shorts",
    outfitColor: "#ffb02e",
    lips: "lips-nude-pink-gloss",
    brows: "brows-feathered-honey",
    shadow: "#ffb080",
  },
  {
    skin: "#f8e4d4",
    hairStyle: "low-pony",
    hairColor: "#1c1010",
    outfit: "blouse",
    outfitColor: "#c8a0ff",
    lips: "lips-coral-satin",
    brows: "brows-sculpted-espresso",
    shadow: "#d0a0ff",
  },
];

const YACHT_CONTEXT: DialogueContext = {
  venue: "yacht",
  neighborhood: "beachside",
};

// ─── Yacht model (the hull sitting in the water below the walkable deck) ────

/** The yacht hull model from the marina. Rendered below the walkable teak. */
function YachtHull(): JSX.Element {
  const { scene } = useGLTF("/models/marina/yacht.glb");
  const model = useMemo(() => scene.clone(), [scene]);
  return (
    <group position={[0, -0.9, 0]} scale={[1, 1, 1]}>
      <primitive object={model} />
    </group>
  );
}

// ─── Skyline backdrop ────────────────────────────────────────────────────────

function Skyline(): JSX.Element {
  const geo = useMemo(skylineGeometry, []);
  return (
    <>
      {/* dark silhouette */}
      <mesh geometry={geo} position={[0, -2, -80]}>
        <meshBasicMaterial color="#0a1428" fog={false} />
      </mesh>
      {/* glowing window overlay (slightly forward) */}
      <mesh geometry={geo} position={[0, -2, -79.5]}>
        <meshBasicMaterial
          color={hdr("#ffd080", 0.8)}
          transparent
          opacity={0.35}
          fog={false}
          toneMapped={false}
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
        dance="dj-scratch"
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

/** Small bar menu sign above the counter. Renders only as 3-D text geometry
 * (a flat box with painted text texture); no DOM, no Billboard. */
function BarSign(): JSX.Element {
  // Reuse the approach from NeonText: a plain MeshBasicMaterial with a canvas
  // texture. No drei/Html dependency so it stays in the draw-call budget.
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
 * The deck bobs (deckBob) and rolls (deckRoll) gently; pure logic is in
 * src/game/yacht.ts. Players walk the teak deck, dance, use the hot tub and
 * mocktail bar, and disembark through the gangway portal.
 *
 * Uses public/models/marina/yacht.glb (CC-BY 3.0, credited in docs/assets.md
 * and src/game/credits.ts). No new asset downloads needed; the hull appears
 * below deck level.
 */
export function Yacht({ onPick, player: _ }: { onPick: PickHandler; player: Player }): JSX.Element {
  const calm = useReducedMotion();
  const deck = useMemo(buildDeck, []);
  const lights = useMemo(buildLights, []);
  const deckRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now() / 1000);

  useFrame(() => {
    if (calm || !deckRef.current) return;
    const t = Date.now() / 1000 - startTime.current;
    deckRef.current.position.y = deckBob(t);
    deckRef.current.rotation.z = deckRoll(t);
  });

  return (
    <>
      <color attach="background" args={["#060a1c"]} />
      <fog attach="fog" args={["#0a1430", 40, 130]} />

      {/* Lighting: hemisphere + warm point over dance floor + accent */}
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

      {/* Star field */}
      <Stars
        radius={90}
        depth={20}
        count={900}
        factor={3}
        fade
        speed={calm ? 0 : 0.3}
      />

      {/* City skyline silhouette behind the bow */}
      <Skyline />

      {/* Water plane (non-walkable; tap goes to nearest deck point via onPick) */}
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
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          color="#0b2a4a"
          metalness={0.5}
          roughness={0.25}
          transparent
          opacity={0.68}
          depthWrite={false}
        />
      </mesh>

      {/* Bobbing deck group – everything visible on the yacht */}
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

        {/* Yacht hull model (decorative, sits below the walkable floor) */}
        <Suspense fallback={null}>
          <YachtHull />
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
