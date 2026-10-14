import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { MangoDecks } from "./mangoDecks/MangoDecks.tsx";
import type { Result } from "./mangoDecks/engine.ts";

// Standalone test bench until the 3D world launches minigames from hotspots.
function Fixture() {
  const [open, setOpen] = useState(false);
  const [payouts, setPayouts] = useState<Result[]>([]);
  const muted = new URLSearchParams(location.search).has("muted");
  return (
    <main style={{ padding: 24, background: "#07020b", minHeight: "100dvh" }}>
      <button type="button" onClick={() => setOpen(true)}>
        Open DJ booth
      </button>
      <output aria-label="Mango Decks payouts" style={{ color: "#f7e7c6" }}>
        {JSON.stringify(payouts)}
      </output>
      {open && (
        <MangoDecks
          muted={muted}
          reducedMotion={matchMedia("(prefers-reduced-motion: reduce)").matches}
          onClose={(result) => {
            setOpen(false);
            if (result) setPayouts((list) => [...list, result]);
          }}
        />
      )}
    </main>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Fixture />
    </StrictMode>,
  );
}
