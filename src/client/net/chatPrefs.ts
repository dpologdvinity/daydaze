import { filterChat } from "../../../server/src/chatFilter.ts";
import { createStore } from "../rooms/shared/store.ts";

/** Chat settings, mirrored from the save by App. */
export const chatPrefs = createStore({ strict: false });

/** Others' chat as you see it: the server already masks slurs; the strict
 * filter masks swearing too. */
export const shownChat = (text: string) =>
  chatPrefs.get().strict ? filterChat(text, { strict: true }) : text;
