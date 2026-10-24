import { useEffect, useMemo } from "react";
import type { SaveV1 } from "../../game/save.ts";
import { createSaveSync, mayPush } from "../../net/client/saveSync.ts";
import { account } from "./account.ts";
import { onlineSession } from "./online.ts";

/** Seconds between tries when the account's save won't load. */
const RETRY_MS = 15_000;

/**
 * Signed in, the account's save comes down first (on start-up and after a
 * login) and replaces the local one; only then does each change go up, a
 * few seconds later, and at once when the page is hidden. Guests' saves
 * stay local.
 */
export function useCloudSave(save: SaveV1, onSave: (save: SaveV1) => void) {
  const { me, cloudReady, busy } = account.use();
  const sync = useMemo(
    () =>
      createSaveSync<SaveV1>({
        put: (value) => void onlineSession()?.storeSave(value),
        delayMs: 4000,
        timers: {
          set: (fn, ms) => window.setTimeout(fn, ms),
          clear: (id) => window.clearTimeout(id),
        },
      }),
    [],
  );
  // an account whose save hasn't come down yet: fetch it, retrying
  const loadAs = me && !me.isGuest && !cloudReady && !busy ? me.name : null;
  useEffect(() => {
    if (loadAs === null) return;
    let live = true;
    const load = async () => {
      const cloud = await onlineSession()?.cloudSave(loadAs);
      if (!live) return;
      if (cloud?.ok) {
        onSave(cloud.value);
        account.set({ cloudReady: true });
      } else timer = window.setTimeout(load, RETRY_MS);
    };
    let timer = window.setTimeout(load, 0);
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
