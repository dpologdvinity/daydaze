import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * While the character creator covers the right of the screen, shift the
 * picture so the doll stands in the middle of the part still visible: the
 * camera keeps aiming at her, the frame slides by half the panel's width.
 * On a phone the creator is a bottom sheet, so the shift is upward instead.
 */
export function CreatorFrame() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const panel = document.querySelector<HTMLElement>(
      '.dressing[data-open="true"]',
    );
    const rect = panel?.getBoundingClientRect();
    const { width: w, height: h } = size;
    let dx = 0;
    let dy = 0;
    if (rect && rect.width < w * 0.9) dx = rect.width / 2;
    else if (rect) dy = (h - rect.top) / 2;
    const current = camera.view;
    const same =
      current?.enabled &&
      current.offsetX === dx &&
      current.offsetY === dy &&
      current.fullWidth === w;
    if (dx === 0 && dy === 0) {
      if (current?.enabled) camera.clearViewOffset();
    } else if (!same) camera.setViewOffset(w, h, dx, dy, w, h);
  });
  return null;
}
