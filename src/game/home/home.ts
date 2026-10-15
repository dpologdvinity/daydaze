import { validateFurniture, type Furniture } from "./decor.ts";

// The apartment save. Doors start locked; the owner opens them to invite
// friends once multiplayer lands.
export type HomeSave = {
  locked: boolean;
  furniture: Furniture[];
};

export const DEFAULT_HOME: HomeSave = { locked: true, furniture: [] };

export function toggleLock(home: HomeSave): HomeSave {
  return { ...home, locked: !home.locked };
}

// Saves from before the apartment have no home field; anything malformed
// falls back to the defaults.
export function validateHome(value: unknown): HomeSave {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_HOME, furniture: [] };
  }
  const { locked, furniture } = value as Record<string, unknown>;
  return {
    locked: typeof locked === "boolean" ? locked : DEFAULT_HOME.locked,
    furniture: validateFurniture(furniture),
  };
}
