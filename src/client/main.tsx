import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setConsoleFunction } from "three";
import { App } from "./App.tsx";
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

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing #root.");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
