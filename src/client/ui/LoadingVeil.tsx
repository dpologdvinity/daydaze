import { useSceneReady } from "../world/ready.ts";

/** Covers the canvas while a room loads and compiles, then fades away. */
export function LoadingVeil() {
  const ready = useSceneReady();
  return (
    <div className="loading-veil" data-ready={ready} aria-hidden={ready}>
      <p className="loading-veil-name">Daydaze</p>
      <p className="loading-veil-note" role="status">
        {ready ? "" : "Setting the scene…"}
      </p>
    </div>
  );
}
