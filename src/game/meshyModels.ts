// Meshy models (public/models/meshy/<folder>/<name>.glb) the client loads by a
// hard-coded name, other than the dishes (food/dishes.ts): the folder of each,
// so a test can check every file exists. Add a prop here before using it.

export const MESHY_PROPS = {
  boodle: "food",
  "mango-crate": "mango",
  "bahay-kubo": "museum",
  jeepney: "museum",
  banig: "museum",
  "sari-sari": "museum",
} as const satisfies Record<string, "food" | "mango" | "museum">;

export type MeshyProp = keyof typeof MESHY_PROPS;

/** The `dir` the Prop helpers take for `name`'s GLB. */
export const meshyDir = (name: MeshyProp): string =>
  `meshy/${MESHY_PROPS[name]}`;
