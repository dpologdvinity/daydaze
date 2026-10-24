import type { Dispatch, SetStateAction } from "react";
import type { SaveV1 } from "../../game/save.ts";
import type { Identity } from "../../net/identity.ts";
import { createStore } from "../rooms/shared/store.ts";
import { stillReady } from "../../net/client/saveSync.ts";
import { onlineSession } from "./online.ts";

/** Who you're playing as online: a guest, or a signed-in account. */
export const account = createStore({
  me: null as Identity | null,
  /** The account's save has loaded (or it's a brand-new account), so local
   * changes may go up. */
  cloudReady: false,
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

/** Re-reads who we are. The same account (a room change) keeps its loaded
 * save; `cloudReady` forces it, for a brand-new account. */
export function refreshAccount(cloudReady?: boolean) {
  const me = onlineSession()?.identity() ?? null;
  const was = account.get();
  account.set({
    me,
    cloudReady: cloudReady ?? stillReady(was.me, was.cloudReady, me),
  });
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
  onSave: Dispatch<SetStateAction<SaveV1>>,
): Promise<void> {
  const session = onlineSession();
  if (!session) return;
  account.set({ busy: true, note: "" });
  // signed in already: the last changes go up before switching accounts
  if (account.get().cloudReady) await session.storeSave(save);
  const result = await session.signIn(kind, username, password);
  if (!result.ok) {
    account.set({ busy: false, note: say(result.error) });
    return;
  }
  const me = result.value;
  if (kind === "login") {
    // useCloudSave loads the account's save before anything goes up
    refreshAccount(false);
    account.set({ busy: false, note: `Welcome back, ${me.name}.` });
    return;
  }
  // a brand-new account has nothing to lose: the guest's progress goes up
  refreshAccount(true);
  // local is the truth: only the account's name comes back into it
  const up = await session.storeSave({ ...save, name: me.name });
  if (up.ok) onSave((s) => ({ ...s, name: up.value.name }));
  account.set({
    busy: false,
    note: up.ok
      ? `Welcome, ${me.name}! Your progress is saved to your account.`
      : `Welcome, ${me.name}! Your progress will save on your next change.`,
  });
}

export async function signOut(save: SaveV1): Promise<void> {
  const session = onlineSession();
  if (!session) return;
  account.set({ busy: true, note: "" });
  // the last few seconds of changes go up before the session ends
  if (account.get().cloudReady && !(await session.storeSave(save)).ok) {
    account.set({
      busy: false,
      note: "Your latest changes didn't save. Try logging out again in a moment.",
    });
    return;
  }
  await session.signOut();
  refreshAccount();
  account.set({ busy: false, note: "Logged out. Playing as a guest." });
}
