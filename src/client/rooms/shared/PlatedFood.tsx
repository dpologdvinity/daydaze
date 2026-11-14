// Instanced place settings: a Quaternius food on the Quaternius plate, or a
// Meshy Filipino dish (game/food/dishes.ts), which brings its own plate, bowl
// or tray and gets the shared plate only if its entry asks for one.
import { Suspense } from "react";
import { DISHES, isDishId, type Dish } from "../../../game/food/dishes.ts";
import { Dishes } from "./Dishes.tsx";
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
  const models = typeof model === "string" ? [model] : model;
  const settings = models.map((m, k) => ({
    model: m,
    at: at.filter((_, i) => i % models.length === k),
  }));
  const plates = settings.filter((s) => plated(s.model)).flatMap((s) => s.at);
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
      {settings.map(({ model: id, at: here }) => {
        // a food on a plate stands 2 cm up on it
        const lift = plated(id) ? 0.02 : 0;
        const places = here.map(
          ([x, y, z, yaw]) => [x, y + lift, z, yaw] as const,
        );
        if (isDishId(id))
          return (
            <Dishes
              key={id}
              items={places.map(([x, y, z, yaw]) => ({
                dish: id,
                x,
                y,
                z,
                yaw,
              }))}
            />
          );
        return (
          <PropSet
            key={id}
            model={id}
            width={0.18}
            depth={0.18}
            height={0.1}
            at={places}
          />
        );
      })}
    </Suspense>
  );
}
