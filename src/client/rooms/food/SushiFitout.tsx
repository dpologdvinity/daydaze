// Shared Quaternius restaurant furnishings for the sushi and ramen counters.
import { Suspense } from "react";
import { KitSet } from "./KitSet.tsx";
import { PropSet } from "../shared/Prop.tsx";

const curtains = [-0.75, -0.25, 0.25, 0.75].map((x) => [x, 0, 0, 0] as const);
const stools = [-2.5, -1.25, 0, 1.25, 2.5].map((x) => [x, 0, 0.2, 0] as const);
const lanterns = [-2.7, 0, 2.7].map((x) => [x, 2.5, 0.1, 0] as const);
const counter = [-2.3, 0, 2.3].map((x) => [x, 0, -1.65, 0] as const);
const shoji = [-3, -1, 1, 3].map((x) => [x, 0, -1.85, 0] as const);
const tables = [
  [-2.5, 0, 3.4, 0],
  [0, 0, 4.3, 0],
  [2.5, 0, 3.4, 0],
] as const;
const chairs = tables.flatMap(([x, , z]) =>
  [-1, 1].map(
    (side) => [x + side * 0.75, 0, z, (-side * Math.PI) / 2] as const,
  ),
);
const bowls = [-2.4, -1.2, 0, 1.2, 2.4].map(
  (x) => [x, 1.13, -0.85, 0] as const,
);

export function SushiFitout({ ramen }: { ramen: boolean }) {
  return (
    <Suspense fallback={null}>
      <group position={[0, 2.5, -1.65]} rotation-x={Math.PI / 2}>
        <PropSet
          model="sushi-Decoration_Carpet"
          width={0.6}
          depth={0.8}
          height={0.1}
          at={curtains}
        />
      </group>
      <PropSet
        model="sushi-Food_Roll"
        width={0.06}
        depth={0.06}
        height={0.04}
        at={tables.map(([x, , z]) => [x, 0.8, z, 0] as const)}
      />
      <PropSet
        model="sushi-Environment_Table"
        width={1}
        depth={1}
        height={0.8}
        at={tables}
      />
      <PropSet
        model="sushi-Environment_Chair1"
        width={0.5}
        depth={0.5}
        height={0.9}
        at={chairs}
      />
      <PropSet
        model="sushi-Environment_Stool"
        width={0.6}
        depth={0.6}
        height={0.7}
        at={stools}
      />
      <PropSet
        model="sushi-Environment_Counter_Straight"
        width={2.3}
        depth={1.1}
        height={1.1}
        at={counter}
      />
      <KitSet
        model="Decoration_Light"
        width={0.45}
        depth={0.45}
        height={0.65}
        at={lanterns}
      />
      <KitSet
        model="Wall_Shoji"
        width={2}
        depth={0.5}
        height={2.5}
        at={shoji}
      />
      <KitSet
        model="Wall_Door"
        width={1.5}
        depth={0.5}
        height={2.3}
        at={[[3.2, 0, -1.85, 0]]}
      />
      <PropSet
        model="sushi-Environment_Cabinet_Shelves"
        width={1.3}
        depth={0.5}
        height={1.8}
        at={[[-3.2, 0, -1.9, 0]]}
      />
      <PropSet
        model="sushi-Environment_Oven"
        width={0.8}
        depth={0.5}
        height={0.9}
        at={[[2.2, 0, -1.8, 0]]}
      />
      <PropSet
        model="sushi-Environment_Counter_Sink"
        width={1}
        depth={0.5}
        height={0.9}
        at={[[-2, 0, -1.8, 0]]}
      />
      <PropSet
        model="sushi-Environment_Pot_1_Filled"
        width={0.45}
        depth={0.45}
        height={0.4}
        at={[[2.2, 0.9, -1.8, 0]]}
      />
      {ramen && (
        <PropSet
          model="sushi-Food_Ramen"
          width={0.35}
          depth={0.35}
          height={0.2}
          at={bowls}
        />
      )}
    </Suspense>
  );
}
