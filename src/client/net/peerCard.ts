import { cleanMutes, MUTES_KEY, toggleMute } from "../../net/mutes.ts";
import { createStore } from "../rooms/shared/store.ts";

function loadMutes(): string[] {
  try {
    return cleanMutes(localStorage.getItem(MUTES_KEY));
  } catch {
    return [];
  }
}

/** The player whose card is open (tapped in the world), and who's muted. */
export const peerCard = createStore({
  open: null as { id: string; name: string } | null,
  mutes: loadMutes(),
});

export function mute(id: string) {
  const mutes = toggleMute(peerCard.get().mutes, id);
  peerCard.set({ mutes });
  try {
    localStorage.setItem(MUTES_KEY, JSON.stringify(mutes));
  } catch {
    // private browsing: the mute lasts this visit
  }
}
