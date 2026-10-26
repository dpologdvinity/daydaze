import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { photoCaption, photoFileName } from "../../game/photo.ts";
import { keepSnap } from "../albumSnaps.ts";
import { createStore } from "../rooms/shared/store.ts";

/** A pending snapshot: the overlay's button bumps `n`, the scene takes it. */
export const photoRequest = createStore({ n: 0, place: "" });

export function takePhoto(place: string) {
  photoRequest.set({ n: photoRequest.get().n + 1, place });
}

/**
 * Takes the requested snapshot: renders the view once more, frames it like
 * an instant photo with the place and date underneath, saves it, and files a
 * small copy in the album.
 * shortcut: the re-render skips the high tier's post effects (bloom); render
 * through the composer if photos should glow like the live view.
 */
export function Photo() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const { n, place } = photoRequest.use();
  useEffect(() => {
    if (n === 0) return;
    gl.render(scene, camera);
    const shot = gl.domElement;
    const at = new Date();
    const pad = Math.round(shot.width * 0.03);
    const foot = Math.round(shot.width * 0.09);
    const out = document.createElement("canvas");
    out.width = shot.width + pad * 2;
    out.height = shot.height + pad + foot;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fffaf4";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(shot, pad, pad);
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#3a2a3a";
    ctx.font = `italic ${Math.round(foot * 0.34)}px Georgia, serif`;
    ctx.fillText(photoCaption(place, at), pad, shot.height + pad + foot / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ff2f9a";
    ctx.font = `bold ${Math.round(foot * 0.3)}px sans-serif`;
    ctx.fillText("daydaze", out.width - pad, shot.height + pad + foot / 2);
    // a small copy goes in the album (on this device)
    const thumb = document.createElement("canvas");
    thumb.width = 240;
    thumb.height = Math.round((out.height / out.width) * 240);
    thumb.getContext("2d")?.drawImage(out, 0, 0, thumb.width, thumb.height);
    keepSnap({
      src: thumb.toDataURL("image/jpeg", 0.78),
      place,
      at: at.getTime(),
    });
    const a = document.createElement("a");
    a.href = out.toDataURL("image/png");
    a.download = photoFileName(place, at);
    a.click();
  }, [n, place, gl, scene, camera]);
  return null;
}
