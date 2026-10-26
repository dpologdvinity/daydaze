// Passengers over the room's game relay (codec and seat geometry in
// src/game/passenger.ts): a driver offers a friend a ride from their card;
// the friend gets in and is carried along. Each frame `keepSeat` (run by
// OnlinePeers) puts the passenger in the driver's passenger seat, from the
// driver's own moves; a driver who parks, leaves or stops the ride lets the
// passenger out by the door. One passenger per car.

import {
  encodeRide,
  parseRideMessage,
  passengerSeat,
  stepOut,
  type RideMessage,
} from "../../game/passenger.ts";
import { createStore } from "../rooms/shared/store.ts";
import { placePlayer, type Player } from "../world/PlayerController.tsx";
import { driving } from "../world/driving.ts";
import { friends, friendship, refreshFriends } from "./friends.ts";
import { onlineSession } from "./online.ts";
import { peerCard } from "./peerCard.ts";

type Who = { id: string; name: string };

export const ride = createStore({
  /** A friend offered you a ride. */
  offer: null as Who | null,
  /** You offered a friend a ride, waiting on their answer. */
  offered: null as Who | null,
  /** Driving: who rides with you. */
  passenger: null as Who | null,
  /** Riding: whose car you're in. */
  driver: null as Who | null,
  note: "",
});

const send = (to: string, m: RideMessage) =>
  onlineSession()?.sendGame(to, encodeRide(m)) ?? false;

const nameOf = (id: string) =>
  onlineSession()?.remotePlayers.get(id)?.name ?? "Guest";

/** Whether this player is behind the wheel of their own car in the city. */
const atTheWheel = () => driving.session?.kind === "city";

async function onOffer(from: string) {
  const s = ride.get();
  // a muted player's offers never show; anyone busy driving or riding says no
  if (
    peerCard.get().mutes.includes(from) ||
    atTheWheel() ||
    s.driver ||
    s.passenger
  ) {
    send(from, { k: "ride-stop" });
    return;
  }
  // rides are for friends: check against a fresh list
  await refreshFriends();
  if (friendship(friends.get().list, from) !== "friend") {
    send(from, { k: "ride-stop" });
    return;
  }
  ride.set({ offer: { id: from, name: nameOf(from) } });
}

/** Lets a passenger out: on the pavement by the door if the car is still
 * here, else where they are. */
function letOut(player: Player | null, note: string) {
  const s = ride.get();
  const at = s.driver && onlineSession()?.sample(s.driver.id);
  if (player && at) {
    const [x, z] = stepOut(at.x, at.z, at.yaw);
    placePlayer(player, x, z);
  }
  driving.passenger = null;
  ride.set({ driver: null, note });
}

/** The player the frame loop keeps seated; set while OnlinePeers runs. */
let seated: Player | null = null;
/** The frame loop's seat point, reused. */
const seat: [number, number] = [0, 0];

function onStop(from: string) {
  const s = ride.get();
  if (s.offer?.id === from) ride.set({ offer: null });
  if (s.offered?.id === from)
    ride.set({ offered: null, note: `${s.offered.name} said not now.` });
  if (s.passenger?.id === from)
    ride.set({ passenger: null, note: `${s.passenger.name} got out.` });
  if (s.driver?.id === from) letOut(seated, `${s.driver.name} let you out.`);
}

/** Starts listening to the room's game relay for rides; returns the
 * unsubscribe. */
export function listenForRides(): () => void {
  const session = onlineSession();
  if (!session) return () => {};
  const offs = [
    session.on("game", ({ from, data }) => {
      const m = parseRideMessage(data);
      if (!m) return;
      const s = ride.get();
      if (m.k === "ride-offer") void onOffer(from);
      else if (m.k === "ride-accept") {
        if (s.offered?.id === from && atTheWheel() && !s.passenger)
          ride.set({
            offered: null,
            passenger: s.offered,
            note: `${s.offered.name} got in.`,
          });
        else send(from, { k: "ride-stop" });
      } else onStop(from);
    }),
    session.on("leave", (id) => onStop(id)),
  ];
  return () => offs.forEach((off) => off());
}

/** Offers a friend in this room copy a ride (only from behind the wheel). */
export function offerRide(id: string, name: string): void {
  const s = ride.get();
  if (!atTheWheel()) {
    ride.set({ note: "Get in your car first, then offer a ride." });
    return;
  }
  if (s.passenger) {
    ride.set({ note: `${s.passenger.name} is already riding with you.` });
    return;
  }
  if (send(id, { k: "ride-offer" }))
    ride.set({ offered: { id, name }, note: "" });
}

/** Answers the offer on screen. */
export function answerRide(yes: boolean): void {
  const offer = ride.get().offer;
  if (!offer) return;
  ride.set({ offer: null });
  if (!yes) {
    send(offer.id, { k: "ride-stop" });
    return;
  }
  if (!send(offer.id, { k: "ride-accept" })) return;
  driving.passenger = offer.id;
  ride.set({ driver: offer, note: "" });
}

/** The passenger gets out, or the driver ends the ride. */
export function endRide(): void {
  const s = ride.get();
  if (s.driver) {
    send(s.driver.id, { k: "ride-stop" });
    letOut(seated, "You got out.");
  }
  if (s.passenger) {
    send(s.passenger.id, { k: "ride-stop" });
    ride.set({ passenger: null, note: "" });
  }
}

/**
 * Run every frame by OnlinePeers. A passenger is put in the driver's
 * passenger seat (from the driver's latest move); one whose driver parked
 * or left gets out. A driver who parked lets their passenger out.
 */
export function keepSeat(player: Player): void {
  seated = player;
  const s = ride.get();
  if (s.passenger && !atTheWheel()) {
    send(s.passenger.id, { k: "ride-stop" });
    ride.set({ passenger: null, note: "" });
  }
  if (!s.driver) return;
  const session = onlineSession();
  // carried off somewhere else (the map, a party): the ride is over; a
  // reconnect in between (no room for a moment) is not
  const where = session?.room()?.roomId;
  if (!session || (where !== undefined && where !== "city")) {
    endRide();
    return;
  }
  const at = session.sample(s.driver.id);
  // the driver parked (their action no longer a car code) or is gone
  if (!at || !at.action.startsWith("c:")) {
    letOut(player, `${s.driver.name} parked.`);
    return;
  }
  passengerSeat(at.x, at.z, at.yaw, seat);
  // shortcut: placePlayer makes one small walk.pos tuple per frame while
  // riding; mutate it in place if a profile ever shows it
  placePlayer(player, seat[0], seat[1]);
  player.walk.target = null;
  player.yaw = player.walk.yaw = player.before.yaw = at.yaw;
}
