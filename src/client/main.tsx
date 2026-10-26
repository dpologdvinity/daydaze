import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setConsoleFunction } from "three";
import { loadDialogue } from "../game/dialogue/pick.ts";
import { afterSceneReady } from "./world/ready.ts";
import { App } from "./App.tsx";
import { registerServiceWorker } from "./serviceWorker.ts";
import "./styles.css";

// R3F 9 builds a THREE.Clock for `state.clock`, and three r183+ warns that
// Clock is deprecated. Our code reads R3F's clock and never makes one, so the
// warning is noise until R3F moves to THREE.Timer.
setConsoleFunction((type, message, ...params) => {
  if (
    type === "warn" &&
    message.includes("Clock: This module has been deprecated")
  )
    return;
  console[type](message, ...params);
});

// Rooms load as their own chunks. A deploy can delete the chunks an open tab
// still points at; reload once to pick up the new build instead of leaving
// the room unloaded. A second failure within a minute is left to show.
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(sessionStorage.getItem("daydaze:chunk-reload"));
    if (Number.isFinite(last) && Date.now() - last < 60_000) return;
    sessionStorage.setItem("daydaze:chunk-reload", String(Date.now()));
  } catch {
    return; // no storage to guard a reload loop with
  }
  event.preventDefault();
  location.reload();
});

// NPC lines are a separate chunk: fetch them once the first room shows and
// the page is idle, so they never share the bandwidth the room loads over
// (NPCs say "..." until then)
const idle = window.requestIdleCallback ?? ((run) => window.setTimeout(run, 1));
afterSceneReady(
  () =>
    idle(() => {
      // a failed fetch is retried by the next NPC that speaks
      loadDialogue().catch((error: unknown) =>
        console.warn("NPC lines failed to load", error),
      );
    }),
  8000,
);

// return visits load the game's files from the service worker's cache
registerServiceWorker();

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing #root.");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
