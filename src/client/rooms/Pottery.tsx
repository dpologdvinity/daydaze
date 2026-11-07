// Clay Day: downloaded wheels and furniture, warm plaster, drying ceramics.
import { Suspense, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DEFAULT_LOOK } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { freshClay, scorePot, GLAZES } from "../../game/pottery.ts";
import { surface } from "../city/worldTexture.ts";
import type { Player } from "../world/PlayerController.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Prop } from "./shared/Prop.tsx";
import { NeonText, MARQUEE } from "./shared/Neon.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { PotMesh } from "./pottery/PotMesh.tsx";
import { pottery } from "./pottery/session.ts";
import { DryingShelf, Kiln, Wheel } from "./pottery/PotteryProps.tsx";

const WALL = surface("painted_plaster_wall", { scale: 0.7, color: "#edc5a1" });
const CLAY = freshClay();
/** Bisque tones for the unglazed ware drying on the shelves. */
const DRYING = ["#c99b73", "#ad765c", "#d6b08c"] as const;
const REGULARS = [-4, 3] as const;

export function Pottery({
  onPick,
  player,
}: {
  onPick: PickHandler;
  player: Player;
}) {
  const state = pottery.use();
  const { gl, invalidate } = useThree();
  const seat = useMemo(
    () => ({
      position: new THREE.Vector3(0, 0.07, -0.45),
      yaw: Math.PI,
      sit: true,
    }),
    [],
  );
  const throwing = state.phase === "throw";
  const collapsed = scorePot(state.clay, state.target).collapsed;
  useEffect(() => {
    if (!throwing) return;
    player.walk.target = null;
    player.seat = seat;
    player.sitting = false;
    gl.domElement.dataset.potterySeated = "true";
    invalidate();
    return () => {
      if (player.seat === seat) player.seat = null;
      delete gl.domElement.dataset.potterySeated;
      invalidate();
    };
  }, [throwing, player, seat, gl, invalidate]);
  useEffect(() => {
    invalidate();
  }, [state, invalidate]);
  useEffect(() => () => pottery.set({ phase: "idle" }), []);
  return (
    <>
      <color attach="background" args={["#392d29"]} />
      <hemisphereLight args={["#fff2d4", "#8f7e70", 2.4]} />
      <directionalLight position={[2, 6, 4]} color="#ffdda9" intensity={2} />
      <pointLight
        position={[-4, 3, -2]}
        color="#ffd3a2"
        intensity={8}
        distance={12}
      />
      <Floor
        width={12}
        depth={10}
        center={[0, 0]}
        color="#bd9275"
        texture={{ id: "herringbone_parquet", scale: 0.5 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.pottery} color="#e9c999" />
      <mesh position={[0, 2.1, -5]} material={WALL}>
        <boxGeometry args={[12, 4.2, 0.15]} />
      </mesh>
      <mesh position={[-6, 2.1, 0]} material={WALL}>
        <boxGeometry args={[0.15, 4.2, 10]} />
      </mesh>
      <mesh position={[6, 2.1, 0]} material={WALL}>
        <boxGeometry args={[0.15, 4.2, 10]} />
      </mesh>
      <NeonText
        text="CLAY DAY"
        font={MARQUEE}
        color="#ffe3bb"
        width={4.1}
        position={[-1.1, 3.35, -4.89]}
        k={0.5}
      />
      <NeonText
        text="slow hands • good company"
        font={MARQUEE}
        color="#779e8b"
        width={3.6}
        position={[-1.1, 2.8, -4.88]}
        k={0.2}
      />
      <Suspense fallback={null}>
        <PropsReady />
        {[-4, 0, 3].map((x) => (
          <group key={x}>
            <Wheel position={[x, 0, -1.8]} />
            <Prop
              model="stool"
              dir="home"
              width={0.6}
              depth={0.6}
              height={0.55}
              position={[x, 0, -0.45]}
            />
          </group>
        ))}
        {[-4.6, -2, 0.6].map((x) => (
          <group key={x}>
            <DryingShelf position={[x, 0, -4.45]} />
            {[0.58, 1.18, 1.78].map((y, i) => (
              <group
                key={y}
                position={[x + (i % 2 ? 0.45 : -0.45), y, -4.3]}
                scale={0.32}
              >
                <PotMesh
                  clay={CLAY}
                  color={DRYING[(i + x + 8) % 3]}
                  spin={false}
                />
              </group>
            ))}
          </group>
        ))}
        <Kiln position={[4.8, 0, -4]} firing={state.phase === "firing"} />
        <Prop
          model="desk"
          dir="home"
          width={2.1}
          depth={1}
          height={0.9}
          position={[4.8, 0, 1.1]}
          yaw={-Math.PI / 2}
        />
        {GLAZES.map((glaze, i) => (
          <group
            key={glaze.color}
            position={[4.8, 0.9, 0.45 + i * 0.28]}
            scale={0.13}
          >
            <PotMesh clay={CLAY} color={glaze.color} />
          </group>
        ))}
        <Prop
          model="plant-tall"
          dir="home"
          width={0.85}
          depth={0.85}
          height={1.8}
          position={[-5, 0, 3.4]}
        />
        <Prop
          model="wall-shelf"
          dir="home"
          width={2}
          depth={0.4}
          height={0.3}
          position={[-5.65, 2.5, 1]}
          yaw={Math.PI / 2}
        />
      </Suspense>
      <NeonText
        text={state.phase === "firing" ? "KILN • FIRING" : "THE KILN"}
        font={MARQUEE}
        color={state.phase === "firing" ? "#ff8a4a" : "#ffe0ae"}
        width={1.65}
        position={[4.8, 2.35, -4.8]}
      />
      <NeonText
        text="GLAZE BAR"
        font={MARQUEE}
        color="#acd3c0"
        width={1.6}
        position={[5.85, 2.1, 1.1]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <group
        position={
          state.phase === "glaze"
            ? [4.8, 0.95, 1.1]
            : state.phase === "firing"
              ? [4.8, 0.4, -4]
              : [0, 0.9, -1.8]
        }
        scale={[0.55, collapsed ? 0.08 : 0.55, 0.55]}
      >
        <PotMesh
          clay={state.clay}
          color={
            state.phase === "throw" || state.phase === "idle"
              ? "#c28a68"
              : state.glaze
          }
          spin={throwing}
        />
      </group>
      {REGULARS.map((x, i) => (
        <group key={x}>
          <group position={[x, 0.9, -1.8]} scale={0.55}>
            <PotMesh clay={CLAY} color={i ? "#c99b73" : "#ad765c"} spin />
          </group>
          <TalkingNpc
            name={i ? "June" : "Remy"}
            role="pottery-regular"
            look={{
              ...DEFAULT_LOOK,
              outfitColor: i ? "#6b7a2a" : "#b5502a",
              hairStyle: i ? "buns" : "bob",
            }}
            mood="sit"
            at={[x, 0.07, -0.45]}
            rot={Math.PI}
            seed={801 + i}
            context={{ venue: "pottery", neighborhood: "arts-district" }}
          />
        </group>
      ))}
      <TalkingNpc
        name="Mara"
        role="potter"
        look={{ ...DEFAULT_LOOK, outfitColor: "#f2e6c8", hairStyle: "buns" }}
        mood="idle"
        at={[-2.4, 0, 1]}
        rot={0.25}
        seed={803}
        greet
        context={{ venue: "pottery", neighborhood: "arts-district" }}
      />
    </>
  );
}

function PropsReady() {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    gl.domElement.dataset.pottery = "ready";
    invalidate();
    return () => {
      delete gl.domElement.dataset.pottery;
    };
  }, [gl, invalidate]);
  return null;
}
