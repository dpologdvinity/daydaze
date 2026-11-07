// The downloaded car bodies (public/models/cars/, built by scripts/import-cars.sh
// from the CC0 Quaternius Realistic Car Pack and Public Transport Pack) and
// which roster car wears which. Pure data: no three.js, so the traffic
// simulation, the dealership and the tests can all read it.
//
// Each body ships as <key>.glb (near, about 3,000 triangles with wheels) and
// <key>-lo.glb (a distance twin under 1,000). A GLB holds one mesh per
// material bucket (BODY_BUCKETS), named after the bucket, so the client can
// paint, tint and re-rim a car without UVs.

/** Every body shipped under public/models/cars/. */
export const BODY_KEYS = [
  "sedan",
  "hatch",
  "suv",
  "coupe",
  "sports",
  "cop",
  "taxi",
  "ambulance",
  "schoolbus",
] as const;
export type BodyKey = (typeof BODY_KEYS)[number];

/** The mesh names inside a body's GLB: paint takes the car's color (and wrap),
 * glass its tint, rim its rim style; lamps carry their own hue. */
export const BODY_BUCKETS = [
  "paint",
  "glass",
  "trim",
  "tyre",
  "rim",
  "light",
] as const;
export type BodyBucket = (typeof BODY_BUCKETS)[number];

/** A body's length in meters, as built by art/cars/import.py (nose toward +z,
 * centered, wheels on y = 0). A car is scaled by its spec's length over this. */
export const BODY_LENGTH: Readonly<Record<BodyKey, number>> = {
  sedan: 4.5,
  hatch: 3.9,
  suv: 4.7,
  coupe: 4.4,
  sports: 4.5,
  cop: 4.8,
  taxi: 4.6,
  ambulance: 6,
  schoolbus: 8,
};

/** Where a body's GLB is served from (a path under public/). */
export function bodyUrl(key: BodyKey, lo = false): string {
  return `/models/cars/${key}${lo ? "-lo" : ""}.glb`;
}

/**
 * The body each roster road car wears. The ids are the saved ones (a save
 * stores `carId`), so every car a player owns still loads. Karts, the stock
 * car, bumper cars and the jet ski are not road cars and keep their own
 * models (src/client/rooms/speedway/).
 */
export const ROSTER_BODY: Readonly<Record<string, BodyKey>> = {
  "quill-lite": "sedan",
  pebble: "hatch",
  "trail-mate": "suv",
  "arc-s": "sports",
  "halden-7": "sedan",
  "vespera-gt": "coupe",
  ridgeback: "suv",
  "atlas-van": "ambulance",
  "kestrel-rs": "coupe",
  "strada-v8": "sports",
  "nova-spyder": "coupe",
  "zenith-x": "sports",
};

/** The body for a roster car id, or null when it is not a road car. */
export function bodyOfCar(id: string): BodyKey | null {
  return ROSTER_BODY[id] ?? null;
}

/** Bodies whose paint is part of the vehicle (a taxi is yellow, a cop car
 * white), so traffic never recolors them. */
export const FIXED_PAINT: Readonly<Partial<Record<BodyKey, string>>> = {
  cop: "#f4f6ff",
  taxi: "#ffc61a",
  ambulance: "#f4f6ff",
  schoolbus: "#f2b705",
};

/** The bodies that mix into traffic, with their share of the cars: sedans
 * and hatches most, a few SUVs, sports cars, taxis, cop cars. */
export const TRAFFIC_MIX: readonly (readonly [BodyKey, number])[] = [
  ["sedan", 26],
  ["hatch", 20],
  ["suv", 16],
  ["sports", 10],
  ["coupe", 10],
  ["taxi", 12],
  ["cop", 6],
];

/** The heavy vehicles of traffic. */
export const HEAVY_MIX: readonly (readonly [BodyKey, number])[] = [
  ["ambulance", 1],
  ["schoolbus", 1],
];

/** Picks from a weighted list with `u` in [0, 1). */
export function pickBody(
  mix: readonly (readonly [BodyKey, number])[],
  u: number,
): BodyKey {
  const total = mix.reduce((n, [, w]) => n + w, 0);
  let at = Math.min(Math.max(u, 0), 0.999999) * total;
  for (const [key, weight] of mix) {
    if (at < weight) return key;
    at -= weight;
  }
  return mix[mix.length - 1]?.[0] ?? "sedan";
}
