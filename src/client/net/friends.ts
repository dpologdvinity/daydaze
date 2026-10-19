import type { Friends } from "../../net/friends.ts";
import { createStore } from "../rooms/shared/store.ts";
import { onlineSession } from "./online.ts";

/** The friends list as last fetched, and whether its panel is open. */
export const friends = createStore({
  list: null as Friends | null,
  open: false,
});

export async function refreshFriends(): Promise<void> {
  const r = await onlineSession()?.friends();
  if (r?.ok) friends.set({ list: r.value });
}

/** Where someone stands with you, for their card's friend button. */
export function friendship(
  list: Friends | null,
  id: string,
): "friend" | "incoming" | "sent" | "none" {
  if (list?.friends.some((f) => f.id === id)) return "friend";
  if (list?.incoming.some((f) => f.id === id)) return "incoming";
  if (list?.sent.some((f) => f.id === id)) return "sent";
  return "none";
}
