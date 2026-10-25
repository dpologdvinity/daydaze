// A small card when a new version of the game is installed and waiting: the
// player picks when to reload into it, so nothing restarts mid-game.

import { applyUpdate, update } from "../serviceWorker.ts";

export function UpdatePrompt() {
  const { waiting } = update.use();
  if (!waiting) return null;
  return (
    <aside className="update-prompt" role="status">
      <span>A new version of Daydaze is ready.</span>
      <button type="button" onClick={applyUpdate}>
        Reload
      </button>
    </aside>
  );
}
