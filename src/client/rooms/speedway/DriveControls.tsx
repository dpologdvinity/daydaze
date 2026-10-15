import { useEffect, useState, type JSX, type PointerEvent } from "react";
import { driving, setControl, type Control } from "../../world/driving.ts";
import { ignoresKeys } from "../../world/keyTargets.ts";
import { useHud } from "./RaceHud.tsx";

// Keys by physical position. Left steers positive, as the car model expects.
const KEYS: Partial<Record<string, Control>> = {
  KeyW: "throttle",
  ArrowUp: "throttle",
  KeyS: "brake",
  ArrowDown: "brake",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

/** Keys and on-screen pedals for the car, with side view and leave. */
export function DriveControls(): JSX.Element | null {
  const hud = useHud();
  const [sideView, setSideView] = useState(driving.sideView);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!driving.session || e.altKey || e.ctrlKey || e.metaKey) return;
      if (ignoresKeys(e.target, e.code)) return;
      if (e.code === "Escape") {
        driving.request = "leave";
        return;
      }
      const control = KEYS[e.code];
      if (!control) return;
      e.preventDefault();
      setControl(control, true);
    };
    const up = (e: KeyboardEvent) => {
      const control = KEYS[e.code];
      if (control) setControl(control, false);
    };
    const blur = () => {
      setControl("throttle", false);
      setControl("brake", false);
      setControl("left", false);
      setControl("right", false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const inCar = hud !== null;
  // the walk-mode mood and view bars give way to the pedals while driving
  useEffect(() => {
    if (!inCar) return;
    document.body.classList.add("driving");
    return () => document.body.classList.remove("driving");
  }, [inCar]);

  if (!hud) return null;

  const pedal = (control: Control, label: string, className: string) => ({
    "aria-label": label,
    className,
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setControl(control, true);
    },
    onPointerUp: () => setControl(control, false),
    onPointerCancel: () => setControl(control, false),
    onLostPointerCapture: () => setControl(control, false),
  });

  return (
    <section className="drive-controls" aria-label="Driving">
      <div className="drive-top">
        <button
          type="button"
          aria-pressed={sideView}
          onClick={() => {
            driving.sideView = !driving.sideView;
            setSideView(driving.sideView);
          }}
        >
          Side view
        </button>
        <button
          type="button"
          onClick={() => {
            driving.request = "leave";
          }}
        >
          Leave the car
        </button>
      </div>
      <div className="drive-steer">
        <button type="button" {...pedal("left", "Steer left", "steer")}>
          ◀
        </button>
        <button type="button" {...pedal("right", "Steer right", "steer")}>
          ▶
        </button>
      </div>
      <div className="drive-pedals">
        <button
          type="button"
          {...pedal("brake", "Brake or reverse", "pedal brake")}
        >
          Brake
        </button>
        <button type="button" {...pedal("throttle", "Throttle", "pedal gas")}>
          Gas
        </button>
      </div>
    </section>
  );
}
