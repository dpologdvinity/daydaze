import { useEffect, useMemo } from "react";
import type { SaveV1 } from "../../game/save.ts";
import { createSaveSync } from "../../net/client/saveSync.ts";
import { account } from "./account.ts";
import { onlineSession } from "./online.ts";

/** Pushes a signed-in player's save up a few seconds after each change, and
 * at once when the page is hidden. Guests' saves stay local. */
export function useCloudSave(save: SaveV1) {
  const { me } = account.use();
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
  const signedIn = !!me && !me.isGuest;
  useEffect(() => {
    if (signedIn) sync.push(save);
  }, [save, signedIn, sync]);
  useEffect(() => {
    if (!signedIn) return sync.cancel();
    const hide = () => sync.flush();
    window.addEventListener("pagehide", hide);
    return () => window.removeEventListener("pagehide", hide);
  }, [signedIn, sync]);
}
