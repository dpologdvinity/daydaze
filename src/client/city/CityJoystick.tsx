import { useRef, type JSX, type PointerEvent } from "react";
import { stick } from "../world/joystick.ts";

// How far the knob can travel from the center, in CSS pixels.
const RANGE = 48;
// Inside this fraction of the range the stick reads as centered.
const DEADZONE = 0.15;

/** On-screen stick for touch: walks like the arrow keys, camera-relative. */
export function CityJoystick(): JSX.Element {
  const knob = useRef<HTMLDivElement>(null);
  const holding = useRef(false);

  const aim = (e: PointerEvent<HTMLDivElement>) => {
    if (!holding.current) return;
    const box = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (box.left + box.width / 2);
    let dy = e.clientY - (box.top + box.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > RANGE) {
      dx *= RANGE / length;
      dy *= RANGE / length;
    }
    const x = dx / RANGE;
    const y = dy / RANGE;
    const still = Math.hypot(x, y) < DEADZONE;
    // screen y grows downwards; forward is up
    stick.x = still ? 0 : x;
    stick.z = still ? 0 : -y;
    if (knob.current)
      knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const release = () => {
    holding.current = false;
    stick.x = 0;
    stick.z = 0;
    if (knob.current) knob.current.style.transform = "";
  };

  return (
    <div
      className="joystick"
      aria-hidden="true"
      onPointerDown={(e) => {
        holding.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        aim(e);
      }}
      onPointerMove={aim}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="joystick-knob" ref={knob} />
    </div>
  );
}
