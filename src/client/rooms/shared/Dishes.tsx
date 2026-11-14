// Filipino dishes from the Meshy food set (public/models/meshy/food/, sizes in
// game/food/dishes.ts): trays, plates and bowls on a counter or table. One
// instanced draw per dish kind, however many of it stand in a room. Wrap in
// Suspense (or pass `fallback`) while the models load.

import { Suspense, useMemo, type JSX, type ReactNode } from "react";
import { DISHES, type Dish, type DishId } from "../../../game/food/dishes.ts";
import { PropSet } from "./Prop.tsx";

/** One dish: which, and where it stands (y is its base). */
export type DishAt = {
  dish: DishId;
  x: number;
  y: number;
  z: number;
  yaw?: number;
};

/** Every dish in `items`, grouped by kind into instanced sets. */
export function Dishes({
  items,
  fallback = null,
}: {
  items: readonly DishAt[];
  fallback?: ReactNode;
}): JSX.Element {
  const groups = useMemo(() => {
    const by = new Map<DishId, [number, number, number, number][]>();
    for (const { dish, x, y, z, yaw = 0 } of items) {
      const list = by.get(dish) ?? [];
      list.push([x, y, z, yaw]);
      by.set(dish, list);
    }
    return [...by];
  }, [items]);
  return (
    <Suspense fallback={fallback}>
      {groups.map(([id, at]) => {
        const { width, height }: Dish = DISHES[id];
        return (
          <PropSet
            key={id}
            model={id}
            dir="meshy/food"
            width={width}
            depth={width}
            height={height}
            at={at}
          />
        );
      })}
    </Suspense>
  );
}
