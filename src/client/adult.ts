import { readFlags } from "./flags.ts";

/**
 * Whether this client may enter the 18+ rooms. No production build may:
 * until the server-side age check ships (roadmap M10), only a development
 * build opened with ?adult=1 lets them in.
 */
export const ADULT_OK: boolean =
  import.meta.env.DEV && readFlags(location.search).adult;

export const ADULT_NOTICE =
  "That's an 18+ venue. It opens once age checks are live.";
