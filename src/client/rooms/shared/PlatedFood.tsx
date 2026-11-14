// Instanced place settings: a Quaternius food on the Quaternius plate, or a
// Meshy Filipino dish (game/food/dishes.ts), which brings its own plate, bowl
// or tray and gets the shared plate only if its entry asks for one.
import { Suspense, useMemo } from "react";
import { DISHES, isDishId, type Dish } from "../../../game/food/dishes.ts";
import { Dishes, type DishAt } from "./Dishes.tsx";
import { PropSet } from "./Prop.tsx";

type Place = readonly [number, number, number, number];

/** Whether a food sits on the shared plate: every Quaternius food does, a dish
 * only when its entry says so. */
function plated(model: string): boolean {
  if (!isDishId(model)) return true;
  const dish: Dish = DISHES[model];
  return dish.plate === true;
}

/** Settings at `at` (x, y, z, yaw). `model` is one food, or a list the settings
 * take in turn: the first food at the first place, the second at the next. */
export function PlatedFood({
  at,
  model,
}: {
  at: readonly Place[];
  model: string | readonly string[];
}) {
  // built once per `at` and `model`, so the instanced sets below keep their
  // arrays (and don't redo their layout) across re-renders
  const { plates, settings } = useMemo(() => {
    const models = typeof model === "string" ? [model] : model;
    const each = models.map((id, k) => {
      // a food on a plate stands 2 cm up on it
      const lift = plated(id) ? 0.02 : 0;
      const places = at
        .filter((_, i) => i % models.length === k)
        .map(([x, y, z, yaw]) => [x, y + lift, z, yaw] as const);
      const items: DishAt[] = isDishId(id)
        ? places.map(([x, y, z, yaw]) => ({ dish: id, x, y, z, yaw }))
        : [];
      return { id, places, items, plated: plated(id) };
    });
    return {
      plates: each.filter((e) => e.plated).flatMap((e) => e.places),
      settings: each,
    };
  }, [at, model]);
  return (
    <Suspense fallback={null}>
      {plates.length > 0 && (
        <PropSet
          model="food-Plate"
          width={0.28}
          depth={0.28}
          height={0.04}
          at={plates}
        />
      )}
      {settings.map(({ id, places, items }) =>
        isDishId(id) ? (
          <Dishes key={id} items={items} />
        ) : (
          <PropSet
            key={id}
            model={id}
            width={0.18}
            depth={0.18}
            height={0.1}
            at={places}
          />
        ),
      )}
    </Suspense>
  );
}
