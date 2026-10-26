// Rides on screen: a friend's offer to answer, who you're riding with (and
// the way out), who rides with you while you drive. Offers go out from a
// friend's card (PeerCard) while you're behind the wheel. Listens to the
// relay while mounted.

import { useEffect, type JSX } from "react";
import { answerRide, endRide, listenForRides, ride } from "./ride.ts";

export function RidePanel(): JSX.Element | null {
  const s = ride.use();
  useEffect(() => listenForRides(), []);
  if (s.offer)
    return (
      <section className="game-panel" aria-label="Ride offer">
        <p className="game-call">{s.offer.name} offers you a ride.</p>
        <div className="game-row">
          <button
            type="button"
            className="game-main"
            onClick={() => answerRide(true)}
          >
            Get in
          </button>
          <button type="button" onClick={() => answerRide(false)}>
            Not now
          </button>
        </div>
      </section>
    );
  if (s.driver || s.passenger)
    return (
      <section className="game-panel" aria-label="Ride">
        <p className="game-call" role="status">
          {s.driver
            ? `Riding with ${s.driver.name}.`
            : `${s.passenger?.name} is riding with you.`}
        </p>
        <button type="button" onClick={endRide}>
          {s.driver ? "Get out" : "Let them out"}
        </button>
      </section>
    );
  if (s.offered)
    return (
      <p className="notice" role="status">
        Waiting for {s.offered.name} to answer…
      </p>
    );
  return s.note ? (
    <p className="notice" role="status">
      {s.note}
    </p>
  ) : null;
}
