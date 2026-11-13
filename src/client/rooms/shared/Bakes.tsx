// Baked goods from Pasha's CC-BY Bakery pack (public/models/bakery/, cut and
// decimated by art/bread/build_bread.py): trays of rolls and donuts, pies,
// tarts and cakes. One instanced draw per material of each model, however many
// of it stand in a room; a model's size is its own (a tray about half a meter,
// a pie 0.3 m), fitted to the box given for it.

import { Suspense, useMemo, type JSX } from "react";
import { PropSet } from "./Prop.tsx";

/** One baked good: which model, and where it stands (y is its base). */
export type Bake = {
  model: string;
  x: number;
  y: number;
  z: number;
  yaw?: number;
};

/** Fit box (meters) each model is scaled to: width x, depth z, height y. */
export const BAKE_SIZE: Readonly<
  Record<string, readonly [number, number, number]>
> = {
  croissants: [0.42, 0.52, 0.1],
  buns: [0.42, 0.52, 0.12],
  rolls: [0.42, 0.52, 0.12],
  cookies: [0.44, 0.55, 0.12],
  donuts: [0.44, 0.55, 0.14],
  baguettes: [0.65, 0.44, 0.16],
  "tart-choc": [0.3, 0.3, 0.12],
  "cake-strawberry": [0.3, 0.3, 0.14],
  "pie-berry": [0.3, 0.3, 0.1],
  "tart-fruit": [0.3, 0.3, 0.12],
  "pie-cream": [0.3, 0.3, 0.12],
  "pie-lattice": [0.3, 0.3, 0.08],
};

/** Every bake in `items`, grouped by model into instanced sets. */
export function Bakes({ items }: { items: readonly Bake[] }): JSX.Element {
  const groups = useMemo(() => {
    const by = new Map<string, [number, number, number, number][]>();
    for (const { model, x, y, z, yaw = 0 } of items) {
      const list = by.get(model) ?? [];
      list.push([x, y, z, yaw]);
      by.set(model, list);
    }
    return [...by];
  }, [items]);
  return (
    <Suspense fallback={null}>
      {groups.map(([model, at]) => {
        const [width, depth, height] = BAKE_SIZE[model] ?? [0.3, 0.3, 0.12];
        return (
          <PropSet
            key={model}
            model={model}
            dir="bakery"
            width={width}
            depth={depth}
            height={height}
            at={at}
            allParts
          />
        );
      })}
    </Suspense>
  );
}
