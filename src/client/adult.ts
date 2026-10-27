import { activeTier, allows, contentTier, setActiveTier } from "../game/age.ts";
import { readFlags } from "./flags.ts";

// No production build may run the adult tier: until the server-side age check
// ships (roadmap M10), only a development build opened with ?adult=1 does.
// main.tsx imports this module first, so the tier is set before any module
// that builds tier-dependent data loads (see age.ts).
setActiveTier(
  contentTier(import.meta.env.DEV && readFlags(location.search).adult),
);

/** Whether this client may enter the 18+ rooms: derived from the tier gate. */
export const ADULT_OK: boolean = allows(activeTier(), "adult-venues");

export const ADULT_NOTICE =
  "That's an 18+ venue. It opens once age checks are live.";
