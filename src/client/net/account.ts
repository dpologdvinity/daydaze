import type { SaveV1 } from "../../game/save.ts";
import type { Identity } from "../../net/identity.ts";
import { createStore } from "../rooms/shared/store.ts";
import { onlineSession } from "./online.ts";

/** Who you're playing as online: a guest, or a signed-in account. */
export const account = createStore({
  me: null as Identity | null,
  busy: false,
  note: "",
});

const ERRORS: Record<string, string> = {
  "username-taken": "That name is taken. Try another.",
  "wrong-credentials": "That name and password don't match.",
  "invalid-credentials":
    "Names are 2 to 16 letters, numbers, spaces, - or _; passwords 8 or more characters.",
  network: "Can't reach the server right now.",
};

const say = (error: string) =>
  ERRORS[error] ?? "That didn't go through. Try again in a moment.";

export function refreshAccount() {
  account.set({ me: onlineSession()?.identity() ?? null });
}

/**
 * Signing up keeps the progress you made as a guest: it goes up as the new
 * account's save. Logging in loads the account's save instead.
 */
export async function signIn(
  kind: "signup" | "login",
  username: string,
  password: string,
  save: SaveV1,
  onSave: (save: SaveV1) => void,
): Promise<void> {
  const session = onlineSession();
  if (!session) return;
  account.set({ busy: true, note: "" });
  const result = await session.signIn(kind, username, password);
  if (!result.ok) {
    account.set({ busy: false, note: say(result.error) });
    return;
  }
  refreshAccount();
  const me = result.value;
  const cloud =
    kind === "signup"
      ? await session.storeSave({ ...save, name: me.name })
      : await session.cloudSave(me.name);
  if (cloud.ok) onSave(cloud.value);
  account.set({
    busy: false,
    note: cloud.ok
      ? kind === "signup"
        ? `Welcome, ${me.name}! Your progress is saved to your account.`
        : `Welcome back, ${me.name}.`
      : "Signed in, but your save didn't load. It'll sync on your next change.",
  });
}

export async function signOut(): Promise<void> {
  const session = onlineSession();
  if (!session) return;
  account.set({ busy: true, note: "" });
  await session.signOut();
  refreshAccount();
  account.set({ busy: false, note: "Logged out. Playing as a guest." });
}
