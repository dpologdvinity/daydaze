// Filipino dishes made with Meshy (public/models/meshy/food/<id>.glb, the mango
// ones in meshy/mango/): the fit
// box each is scaled into on a table or counter, and whether it still needs
// the shared plate under it. Every dish so far brings its own plate, bowl,
// bag, glass or stand, so none sets `plate`. The models keep their own scale;
// only the largest footprint (`width`, meters) and `height` are given here.

export type Dish = {
  /** Largest footprint side, meters. */
  width: number;
  /** Tallest it may stand, meters. */
  height: number;
  /** Put the shared plate under it (a dish that doesn't carry its own). */
  plate?: boolean;
  /** Folder under public/models/meshy/; "food" when absent. */
  folder?: "food" | "mango";
};

export const DISHES = {
  adobo: { width: 0.3, height: 0.15 },
  sinigang: { width: 0.32, height: 0.2 },
  palabok: { width: 0.3, height: 0.15 },
  lumpia: { width: 0.28, height: 0.15 },
  "kare-kare": { width: 0.3, height: 0.18 },
  sisig: { width: 0.3, height: 0.12 },
  "lechon-kawali": { width: 0.3, height: 0.15 },
  // a whole pig on its spit: long, so the box is a long one
  lechon: { width: 0.9, height: 0.5 },
  inasal: { width: 0.3, height: 0.12 },
  "isaw-grill": { width: 0.3, height: 0.25 },
  tapsilog: { width: 0.3, height: 0.12 },
  "halo-halo": { width: 0.22, height: 0.28 },
  "leche-flan": { width: 0.24, height: 0.1 },
  "ube-halaya": { width: 0.22, height: 0.12 },
  "buko-pandan": { width: 0.2, height: 0.18 },
  turon: { width: 0.26, height: 0.14 },
  "banana-cue": { width: 0.12, height: 0.26 },
  "puto-kutsinta": { width: 0.22, height: 0.1 },
  taho: { width: 0.16, height: 0.22 },
  ensaymada: { width: 0.2, height: 0.12 },
  pandesal: { width: 0.22, height: 0.18 },
  bibingka: { width: 0.24, height: 0.14 },
  "puto-bumbong": { width: 0.24, height: 0.1 },
  "mango-float": { width: 0.26, height: 0.12, folder: "mango" },
  "mango-shake": { width: 0.2, height: 0.28, folder: "mango" },
} as const satisfies Record<string, Dish>;

export type DishId = keyof typeof DISHES;

/** Where the browser fetches a dish's model. */
export const dishUrl = (id: DishId): string => {
  const dish: Dish = DISHES[id];
  return `/models/meshy/${dish.folder ?? "food"}/${id}.glb`;
};

/** True for a dish id, false for any other model name (a Quaternius food). */
export function isDishId(value: string): value is DishId {
  return Object.hasOwn(DISHES, value);
}
