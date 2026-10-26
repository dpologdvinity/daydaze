// The party on screen: a friend's invite to answer, who's in your party (you
// follow the leader through doors), and a way out. Invites go out from a
// friend's card (PeerCard). Listens to the relay while mounted.

import { useEffect, type JSX } from "react";
import type { RoomId } from "../../game/rooms.ts";
import { answerParty, leaveParty, listenForParty, party } from "./party.ts";

export function PartyPanel({
  onGo,
}: {
  /** Takes the player to a room, as a door would (App's travel). */
  onGo: (room: RoomId) => void;
}): JSX.Element | null {
  const s = party.use();
  // the latest onGo without re-subscribing every render
  useEffect(() => listenForParty((room) => onGo(room)), [onGo]);
  if (s.invite)
    return (
      <section className="game-panel" aria-label="Party invite">
        <p className="game-call">
          {s.invite.name} invited you to their party. You'll follow them through
          doors.
        </p>
        <div className="game-row">
          <button
            type="button"
            className="game-main"
            onClick={() => answerParty(true)}
          >
            Join
          </button>
          <button type="button" onClick={() => answerParty(false)}>
            Not now
          </button>
        </div>
      </section>
    );
  if (s.leader !== null) {
    const leading = s.members.every((m) => m.id !== s.leader);
    const names = s.members.map((m) => m.name).join(", ");
    return (
      <section className="game-panel" aria-label="Party">
        <p className="game-call" role="status">
          {leading
            ? `Your party: ${names}. They follow you through doors.`
            : `In ${names}'s party: you follow them through doors.`}
        </p>
        {s.note && <p className="notice">{s.note}</p>}
        <button type="button" onClick={leaveParty}>
          Leave party
        </button>
      </section>
    );
  }
  if (s.asked.length)
    return (
      <p className="notice" role="status">
        Waiting for {s.asked.map((a) => a.name).join(", ")} to answer…
      </p>
    );
  return s.note ? (
    <p className="notice" role="status">
      {s.note}
    </p>
  ) : null;
}
