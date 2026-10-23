// Emotes for two players: one invites over the `game` relay, the other
// accepts and steps to the spot by the inviter (the lead), and both play the
// pose with mirrored roles (see couple.ts). Pure.
import { MAX_GAME_DATA } from "../../net/networkProtocol.ts";
import type { Vec2 } from "../walk.ts";
import type { CoupleRole } from "./couple.ts";
import type { DanceMoveId } from "./moves.ts";

export const TOGETHER = [
  { id: "hug", label: "Hug", move: "hug", gap: 0.32, side: false },
  {
    id: "hold-hands",
    label: "Hold hands",
    move: "hold-hands",
    gap: 0.55,
    side: true,
  },
  {
    id: "forehead-kiss",
    label: "Forehead kiss",
    move: "forehead-kiss",
    gap: 0.36,
    side: false,
  },
  {
    id: "slow-dance",
    label: "Slow dance",
    move: "slow-dance",
    gap: 0.45,
    side: false,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  move: DanceMoveId;
  /** Meters between the two. */
  gap: number;
  /** Side by side, facing the same way, instead of face to face. */
  side: boolean;
}[];

export type TogetherId = (typeof TOGETHER)[number]["id"];

export function isTogetherId(value: unknown): value is TogetherId {
  return TOGETHER.some((e) => e.id === value);
}

export function together(id: TogetherId) {
  return TOGETHER.find((e) => e.id === id) ?? TOGETHER[0];
}

/** What a player is doing with someone, as the action code carries it. */
export type Pair = { emote: TogetherId; role: CoupleRole };

/** Where the follower stands, and faces, given the lead's spot (yaw 0 faces +z). */
export function followSpot(
  id: TogetherId,
  lead: Vec2,
  yaw: number,
): { at: Vec2; yaw: number } {
  const { gap, side } = together(id);
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  // side by side: on the lead's right (forward rotated a quarter turn clockwise)
  return side
    ? { at: [lead[0] - gap * cos, lead[1] + gap * sin], yaw }
    : { at: [lead[0] + gap * sin, lead[1] + gap * cos], yaw: yaw + Math.PI };
}

export type PairMessage =
  | { k: "pair-invite"; e: TogetherId }
  | { k: "pair-accept"; e: TogetherId }
  | { k: "pair-stop" };

export const encodePair = (m: PairMessage) => JSON.stringify(m);

/** A relayed message, if it's one of ours and well formed. */
export function parsePairMessage(data: string): PairMessage | null {
  if (data.length > MAX_GAME_DATA) return null;
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const k: unknown = Reflect.get(value, "k");
  if (k === "pair-stop") return { k };
  const e: unknown = Reflect.get(value, "e");
  if ((k === "pair-invite" || k === "pair-accept") && isTogetherId(e))
    return { k, e };
  return null;
}
