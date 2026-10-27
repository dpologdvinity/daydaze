import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  LADDER,
  LIFE,
  WRECK,
  atWreck,
  canSee,
  depthAt,
  lifePose,
  reefPlan,
  terrainY,
  stepAir,
  type Life,
} from "../../game/dive.ts";
import { ROOMS } from "../../game/rooms.ts";
import { scuba } from "../avatar/human/afloat.ts";
import { Creature } from "../creatures/Creature.tsx";
import { useReducedMotion } from "../motion.ts";
import { placePlayer, type Player } from "../world/PlayerController.tsx";
import { Scatter, Single } from "./ocean/ReefProps.tsx";
import {
  endDive,
  readings,
  sighted,
  startDive,
  wreckFound,
} from "./ocean/session.ts";
import type { PickHandler } from "./shared/Floor.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";
import { dive } from "./ocean/session.ts";

const FOG = "#0b6d8e";
/** The reef.glb rock nodes, in the plan's `kind` order. */
const ROCKS = ["rock-pillar", "rock-flat", "rock-moss", "rock-spires"] as const;
const clock = () => performance.now() / 1000;

const SEABED_Z = -21;

/** The seabed mesh: a grid lifted by terrainY, so the dunes, ripples and
 * mounds are real shape the diver swims over. */
function seabedGeometry(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(60, 80, 70, 92);
  g.rotateX(-Math.PI / 2);
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++)
    pos.setY(i, terrainY(pos.getX(i), pos.getZ(i) + SEABED_Z));
  g.computeVertexNormals();
  return g;
}

/** The seabed: warm sand with moving caustics, the light the surface throws
 * down, folded into the emissive term so it costs no extra draw. */
function Seabed({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: "#d8c08a",
      roughness: 0.95,
      emissive: "#0a3a4a",
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "varying vec2 vSea;\nvoid main() {")
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvSea = (modelMatrix * vec4(transformed, 1.0)).xz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "void main() {",
          "uniform float uTime;\nvarying vec2 vSea;\nvoid main() {",
        )
        .replace(
          "#include <emissivemap_fragment>",
          [
            "#include <emissivemap_fragment>",
            // two crossing wave fields: where they peak together, the net of
            // bright lines a rippling surface focuses on the bottom
            "vec2 p = vSea * 0.9;",
            "float a = sin(p.x * 1.7 + sin(p.y * 1.3 + uTime * 0.8) * 1.6 + uTime * 0.6);",
            "float b = sin(p.y * 1.9 + sin(p.x * 1.1 - uTime * 0.7) * 1.5 - uTime * 0.5);",
            "float net = pow(max(0.0, 1.0 - abs(a * b) * 1.6), 3.0);",
            "totalEmissiveRadiance += vec3(0.28, 0.62, 0.7) * net;",
          ].join("\n"),
        );
    };
    return m;
  }, [uniforms]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock: c }) => {
    uniforms.uTime.value = calm ? 0 : c.elapsedTime;
  });
  const geometry = useMemo(seabedGeometry, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    onPick([e.point.x, e.point.z]);
  };
  return (
    <mesh
      position={[0, 0, SEABED_Z]}
      onClick={click}
      name="floor"
      material={material}
      geometry={geometry}
    />
  );
}

/** Slanting shafts of sunlight from the surface: additive cones, no depth
 * writes. */
function Shafts() {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#9fe8ff",
        transparent: true,
        opacity: 0.07,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <>
      {[-14, -6, 4, 12, 18].map((x, i) => (
        <mesh
          key={x}
          material={mat}
          position={[x, 5.5, -6 - i * 8]}
          rotation={[0.1, 0, 0.28]}
        >
          <cylinderGeometry
            args={[0.6 + (i % 3) * 0.5, 2.6, 13, 12, 1, true]}
          />
        </mesh>
      ))}
    </>
  );
}

const BUBBLES = 30;

/** Bubbles rising from her regulator, and a few drifting up from the reef. */
function Bubbles({ player }: { player: Player }) {
  const calm = useReducedMotion();
  const { geometry, material, seeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(BUBBLES * 3), 3),
    );
    // a soft round bubble, so the points are not squares
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
      grad.addColorStop(0, "rgba(255,255,255,0.15)");
      grad.addColorStop(0.8, "rgba(235,252,255,0.55)");
      grad.addColorStop(0.92, "rgba(255,255,255,1)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    const m = new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(c),
      color: "#e8fbff",
      size: 0.2,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      sizeAttenuation: true,
    });
    return {
      geometry: g,
      material: m,
      seeds: Float32Array.from({ length: BUBBLES }, (_, i) => i * 0.618),
    };
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ clock: c }) => {
    if (calm) return;
    const attr = geometry.getAttribute("position");
    const t = c.elapsedTime;
    for (let i = 0; i < BUBBLES; i++) {
      // each bubble's life: 0..1 up a 6 m column, restarting at her mouth
      const life = (t * 0.28 + (seeds[i] ?? 0)) % 1;
      const wob = Math.sin(t * 2 + i) * 0.12 * life;
      attr.setXYZ(
        i,
        player.pos.x + wob,
        player.pos.y + 1.15 + life * 6,
        player.pos.z + Math.cos(t * 1.7 + i) * 0.12 * life,
      );
    }
    attr.needsUpdate = true;
  });
  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  );
}

/** One swimmer of a life: the shared clock and the pure path put it where the
 * spotter also looks. */
function Swimmer({ life, i }: { life: Life; i: number }) {
  const calm = useReducedMotion();
  const walk = life.species === "crab";
  const scratch = useRef({ x: 0, z: 0, above: 0, yaw: 0 });
  return (
    <Creature
      kind={life.species}
      drive={(_, pose) => {
        const p = lifePose(life, i, calm ? 0 : clock(), scratch.current);
        pose.x = p.x;
        pose.z = p.z;
        pose.y = p.above + terrainY(p.x, p.z);
        pose.yaw = p.yaw;
        pose.clip = walk ? "walk" : "swim";
      }}
    />
  );
}

/** Everything that happens as she dives: the tank drains, creatures in front
 * of her are spotted, the wreck is found, and an empty tank brings her up. */
function Diving({ player }: { player: Player }) {
  const state = useRef({ air: dive.get().air, since: 0, out: 0 });
  useEffect(() => {
    startDive();
    state.current.air = dive.get().air;
    scuba.set({ wearing: true });
    // she can leave by any travel (an arrest, a visit, a party), not only
    // the ladder: the gear comes off with the dive
    return () => {
      endDive();
      scuba.set({ wearing: false });
    };
  }, []);
  const mouth = useRef<[number, number]>([0, 0]);
  // reused for each creature's spot as the sightings are checked
  const seen = useRef<[number, number]>([0, 0]);
  const scratch = useRef({ x: 0, z: 0, above: 0, yaw: 0 });
  useFrame((_, dt) => {
    const s = state.current;
    const x = player.pos.x;
    const z = player.pos.z;
    s.air = stepAir(s.air, depthAt(x, z), Math.min(dt, 0.25));
    s.since += dt;
    if (s.since < 0.25) return;
    s.since = 0;
    readings(s.air, depthAt(x, z));
    mouth.current[0] = x;
    mouth.current[1] = z;
    for (const life of LIFE)
      for (let i = 0; i < life.count; i++) {
        const p = lifePose(life, i, clock(), scratch.current);
        seen.current[0] = p.x;
        seen.current[1] = p.z;
        if (
          canSee(mouth.current, player.yaw, seen.current, undefined, undefined)
        )
          sighted(life.species);
      }
    if (atWreck(mouth.current)) wreckFound();
    // out of air: an emergency ascent, once: she is brought beside the
    // ladder and swims the last stroke into it, which takes her up
    if (s.air <= 0 && s.out <= 1.5) {
      s.out += 0.25;
      if (s.out > 1.5) {
        placePlayer(player, LADDER[0], LADDER[1] - 1.6);
        player.walk.target = LADDER;
      }
    }
  });
  return null;
}

/**
 * The reef: a warm seabed under blue water, coral ridges and kelp, a wreck to
 * explore, fourteen kinds of sea life to spot, bubbles, caustics and a ladder
 * back up. The diver's air, sightings and score live in ocean/session.ts.
 */
export function ReefDive({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}) {
  const plan = useMemo(() => reefPlan(), []);
  const byKind = useMemo(
    () =>
      Array.from({ length: 6 }, (_, k) =>
        plan.coral.filter((c) => c.kind === k),
      ),
    [plan],
  );
  const kelp = plan.kelp;
  const rocksByKind = useMemo(
    () => ROCKS.map((_, k) => plan.rocks.filter((r) => r.kind === k)),
    [plan],
  );
  // jellies drift well above the floor
  const jellies = useMemo(
    () => plan.jellies.map((j) => ({ ...j, lift: 3 + (j.at[0] % 3) })),
    [plan],
  );
  return (
    <>
      <color attach="background" args={[FOG]} />
      <fog attach="fog" args={[FOG, 6, 42]} />
      <hemisphereLight args={["#8fe4ff", "#16485c", 1.6]} />
      <directionalLight position={[2, 22, 4]} intensity={2.2} color="#c8f4ff" />
      <Seabed onPick={onPick} />
      <Shafts />
      <PortalPads room={ROOMS["reef-dive"]} color="#ffd166" />
      {/* the ladder's line up to the dive buoy */}
      <mesh position={[LADDER[0], 5, LADDER[1] + 0.3]}>
        <cylinderGeometry args={[0.04, 0.04, 10, 6]} />
        <meshStandardMaterial color="#f4f0e0" />
      </mesh>
      {byKind.map((items, k) => (
        <Scatter
          key={k}
          name={`coral-${k + 1}`}
          items={items}
          floorY={terrainY}
          sink={0.05}
        />
      ))}
      <Scatter name="fan" items={plan.fans} floorY={terrainY} sink={0.1} />
      <Scatter
        name="branch"
        items={plan.branches}
        floorY={terrainY}
        sink={0.1}
      />
      <Scatter name="seaweed" items={kelp} floorY={terrainY} sink={0.1} />
      {ROCKS.map((name, k) => (
        <Scatter
          key={name}
          name={name}
          items={rocksByKind[k] ?? []}
          floorY={terrainY}
          sink={0.3}
        />
      ))}
      <Scatter name="jelly" items={jellies} floorY={terrainY} far={30} />
      <Single
        name="wreck"
        position={[
          WRECK.at[0],
          terrainY(WRECK.at[0], WRECK.at[1]) - 0.5,
          WRECK.at[1],
        ]}
        rotation={[0.08, WRECK.yaw, 0.14]}
      />
      <Single
        name="anchor"
        position={[WRECK.at[0] + 7, 0.1, WRECK.at[1] + 3]}
        rotation={[0, 0.7, 0]}
        scale={1.4}
      />
      {LIFE.flatMap((life, li) =>
        Array.from({ length: life.count }, (_, i) => (
          <Swimmer key={`${li}-${i}`} life={life} i={i} />
        )),
      )}
      <Sparkles
        count={90}
        scale={[30, 8, 40]}
        position={[0, 4, -18]}
        size={2.2}
        speed={0.15}
        color="#bff4ff"
        opacity={0.5}
      />
      <Bubbles player={player} />
      <Diving player={player} />
    </>
  );
}
