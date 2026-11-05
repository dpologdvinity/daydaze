// Instanced place settings made from the Quaternius food pack.
import { Suspense } from "react";
import { PropSet } from "./Prop.tsx";

type Place = readonly [number, number, number, number];

export function PlatedFood({
  at,
  model,
}: {
  at: readonly Place[];
  model: string;
}) {
  return (
    <Suspense fallback={null}>
      <PropSet
        model="food-Plate"
        width={0.28}
        depth={0.28}
        height={0.04}
        at={at}
      />
      <PropSet
        model={model}
        width={0.18}
        depth={0.18}
        height={0.1}
        at={at.map(([x, y, z, yaw]) => [x, y + 0.02, z, yaw] as const)}
      />
    </Suspense>
  );
}
