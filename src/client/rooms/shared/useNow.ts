import { useEffect, useState } from "react";

/** performance.now(), re-read every animation frame while `running`, so a
 * panel's meters and clocks move. */
export function useNow(running: boolean): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!running) return;
    let id = requestAnimationFrame(function tick(t) {
      setNow(t);
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [running]);
  return now;
}

/** Keys that shouldn't drive a game while typing in chat. */
export function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  );
}

/** Space or Enter press the game's one button (unless a button has focus,
 * which presses itself), Escape leaves. */
export function usePressKeys(
  active: boolean,
  press: (now: number) => void,
  leave: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      if (typing(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.code === "Space" || e.code === "Enter") {
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        press(performance.now());
      } else if (e.code === "Escape") leave();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, press, leave]);
}
