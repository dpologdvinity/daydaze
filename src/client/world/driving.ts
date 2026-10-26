import type { CarInput } from "../../game/driving/car.ts";
import type { Session } from "../../game/speedway/session.ts";
import type { FriendTrack } from "../../game/speedway/friendRace.ts";

/** A Speedway control's request for the scene to take on its next frame. */
export type DriveRequest =
  | "race-oval"
  | "race-boardwalk"
  | "bumper-cars"
  /** The Marina's jet-ski race. */
  | "race-harbor"
  | "leave"
  /** Walk to your car in the city and get in. */
  | "city-drive"
  /** A race against a friend, as `driving.friendRace` says (net/raceFriend.ts). */
  | "race-friend";

export type Control = "throttle" | "brake" | "left" | "right";

/**
 * Driving state shared by the Speedway scene, its controls, and the walking
 * and camera rules that stand down while a car is driven. Plain mutable
 * fields, so the frame loop reads them without allocating.
 */
export const driving: {
  session: Session | null;
  request: DriveRequest | null;
  input: CarInput;
  sideView: boolean;
  /** Riding in another player's car (their id): no walking, out of sight;
   * src/client/net/ride.ts keeps the player in the passenger seat. */
  passenger: string | null;
  /** The friend race to start on "race-friend": which track, green at when. */
  friendRace: { track: FriendTrack; startAt: number } | null;
} = {
  session: null,
  request: null,
  input: { throttle: 0, brake: 0, steer: 0 },
  sideView: false,
  passenger: null,
  friendRace: null,
};

const held = new Set<Control>();

/** Keyboard and pedals both feed the car through here. Left steers positive. */
export function setControl(control: Control, on: boolean): void {
  if (on) held.add(control);
  else held.delete(control);
  driving.input.throttle = held.has("throttle") ? 1 : 0;
  driving.input.brake = held.has("brake") ? 1 : 0;
  driving.input.steer =
    (held.has("left") ? 1 : 0) - (held.has("right") ? 1 : 0);
}

export function releaseControls(): void {
  held.clear();
  setControl("throttle", false);
}
