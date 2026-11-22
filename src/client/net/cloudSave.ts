// The hook that syncs a signed-in player's save with their account: pull on
// start, then push changes after a short delay.
import { useEffect, useMemo } from "react";
import type { SaveV1 } from "../../game/save.ts";
import type { Adopt } from "./progress.ts";
import { createSaveSync, mayPush } from "../../net/client/saveSync.ts";
import { account } from "./account.ts";
import { onlineSession } from "./online.ts";

/** Seconds between tries when the account's save won't load. */
const RETRY_MS = 15_000;

/**
 * Signed in, the account's save comes down first (on start-up and after a
 * login) and replaces the local one; only then does each change go up, a
 * few seconds later, and at once when the page is hidden, and the server's
 * XP and title in its reply replace ours. Guests' saves stay local.
 */
export function useCloudSave(
  save: SaveV1,
  onSave: (save: SaveV1) => void,
  onProgress: Adopt,
) {
  const { me, cloudReady, busy } = account.use();
  const sync = useMemo(
    () =>
      createSaveSync<SaveV1>({
        // the reply carries the server's XP and title, which replace ours
        put: (value) =>
          void onlineSession()
            ?.storeSave(value)
            .then((r) => r.ok && onProgress(r.value.progression)),
        delayMs: 4000,
        timers: {
          set: (fn, ms) => window.setTimeout(fn, ms),
          clear: (id) => window.clearTimeout(id),
        },
      }),
    [onProgress],
  );
  // an account whose save hasn't come down yet: fetch it, retrying
  const loadAs = me && !me.isGuest && !cloudReady && !busy ? me.name : null;
  useEffect(() => {
    if (loadAs === null) return;
    let live = true;
    const load = async () => {
      const cloud = await onlineSession()
        ?.cloudSave(loadAs)
        // a rejected fetch is retried like a failed one
        .catch(() => undefined);
      if (!live) return;
      if (cloud?.ok) {
        onSave(cloud.value);
        account.set({ cloudReady: true });
      } else timer = window.setTimeout(() => void load(), RETRY_MS);
    };
    let timer = window.setTimeout(() => void load(), 0);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [loadAs, onSave]);
  const pushing = mayPush(me, cloudReady);
  useEffect(() => {
    if (pushing) sync.push(save);
  }, [save, pushing, sync]);
  useEffect(() => {
    if (!pushing) return sync.cancel();
    const hide = () => sync.flush();
    window.addEventListener("pagehide", hide);
    return () => window.removeEventListener("pagehide", hide);
  }, [pushing, sync]);
}
