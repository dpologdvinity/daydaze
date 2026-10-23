import type { SessionStatus } from "./OnlineSession.ts";

const CLOSED: Record<number, string> = {
  4000: "The server turned this connection away. Playing offline.",
  4001: "This room is full. Playing offline.",
  4002: "You were removed from this room. Playing offline.",
  4003: "You're banned from online play.",
  4009: "You're signed in from another tab or device. Playing offline here.",
};

/** The HUD line for the connection, or null while all is well. */
export function connectionNote(
  status: SessionStatus,
  closeCode: number | null,
): string | null {
  if (status === "reconnecting") return "Reconnecting…";
  if (status === "offline")
    return "Playing offline: the server can't be reached.";
  if (status === "closed")
    return (
      (closeCode !== null && CLOSED[closeCode]) ||
      "Disconnected. Playing offline."
    );
  return null;
}
