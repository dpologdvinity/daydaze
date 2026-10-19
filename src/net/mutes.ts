// Players you've muted: their chat bubbles stay hidden on your screen. Kept
// in this browser only (the server's blocks are the stronger tool).
import { isNetworkId } from "./networkProtocol.ts";

export const MUTES_KEY = "daydaze-muted-v1";
/** The most mutes kept; the oldest go first. */
const MAX = 200;

/** A stored mute list: known-shaped ids only, each once, newest kept. */
export function cleanMutes(value: unknown): string[] {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return [...new Set(parsed.filter(isNetworkId))].slice(-MAX);
}

export function toggleMute(mutes: readonly string[], id: string): string[] {
  return mutes.includes(id)
    ? mutes.filter((m) => m !== id)
    : cleanMutes([...mutes, id]);
}
