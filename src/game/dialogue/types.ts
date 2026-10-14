export const ROLE_IDS = [
  "bartender",
  "bouncer",
  "dj",
  "club-dancer",
  "coat-check",
  "server",
  "regular",
  "cashier",
  "stylist",
  "nail-tech",
  "lifeguard",
  "snack-cashier",
  "swimmer",
  "ride-operator",
  "ticket-cashier",
  "carnival-barker",
  "pit-crew",
  "cotton-candy-vendor",
] as const;

export type DialogueRole = (typeof ROLE_IDS)[number];

export const SITUATION_IDS = [
  "greeting-first",
  "greeting-regular",
  "greeting-returning",
  "tapped",
  "idle",
  "morning",
  "afternoon",
  "evening",
  "late-night",
  "weather",
  "outfit-swimsuit",
  "outfit-glam",
  "outfit-new-item",
  "outfit-matching",
  "state-drunk",
  "state-high",
  "state-tripping",
  "state-released-from-jail",
  "state-caught-shoplifting",
  "event-pride-night",
  "event-dance-off",
  "event-ride-ended",
  "action-dancing-nearby",
  "action-ordering",
  "action-tipping",
  "action-leaving-without-paying",
  "goodbye",
] as const;

export type DialogueSituation = (typeof SITUATION_IDS)[number];

export const TIME_OF_DAY_IDS = [
  "morning",
  "afternoon",
  "evening",
  "late-night",
] as const;

export type TimeOfDay = (typeof TIME_OF_DAY_IDS)[number];

export const NEIGHBORHOOD_IDS = [
  "downtown",
  "nightlife-row",
  "little-manila",
  "chinatown-koreatown",
  "arts-district",
  "suburbia",
  "beachside",
  "uptown",
  "fairground",
  "hillside-winter-town",
] as const;

export type NeighborhoodId = (typeof NEIGHBORHOOD_IDS)[number];

export const PLACEHOLDER_IDS = ["name", "item", "place", "drink"] as const;

export type PlaceholderId = (typeof PLACEHOLDER_IDS)[number];

// A line matches only when every condition it sets matches the context.
// A condition with no matching context value never matches.
export type LineConditions = {
  neighborhood?: NeighborhoodId | readonly NeighborhoodId[];
  venue?: string | readonly string[];
  time?: TimeOfDay | readonly TimeOfDay[];
};

export type Line = {
  text: string;
  weight?: number;
  when?: LineConditions;
};

// Plain strings are the common case; use the object form for weights or conditions.
export type LineEntry = string | Line;

export type RoleBank = Partial<Record<DialogueSituation, readonly LineEntry[]>>;

export type DialogueContext = {
  name?: string;
  item?: string;
  place?: string;
  drink?: string;
  neighborhood?: NeighborhoodId;
  venue?: string;
  time?: TimeOfDay;
};
