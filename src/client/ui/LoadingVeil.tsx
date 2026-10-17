import { useEffect, useState } from "react";
import { useSceneReady } from "../world/ready.ts";

/** How long the CSS fade runs before the veil leaves the page. */
const FADE_MS = 600;

/** Covers the canvas while a room loads and compiles, then fades away and
 * unmounts, so no idle full-screen layer stays over the canvas. */
export function LoadingVeil() {
  const ready = useSceneReady();
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!ready) {
      setGone(false);
      return;
    }
    const t = setTimeout(() => setGone(true), FADE_MS);
    return () => clearTimeout(t);
  }, [ready]);
  if (gone) return null;
  return (
    <div className="loading-veil" data-ready={ready} aria-hidden={ready}>
      <p className="loading-veil-name">Daydaze</p>
      <p className="loading-veil-note" role="status">
        {ready ? "" : "Setting the scene…"}
      </p>
    </div>
  );
}
