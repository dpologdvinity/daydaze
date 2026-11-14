// The dock's contextual actions as one compact control. Each action (the El
// to a station, Hail a taxi, Drive your car, Take a seat) registers itself
// with <DockAction>; <ActionDock> shows the one that ranks first as a pill and
// folds the rest into a "More actions" disclosure beside it
// (game/dockActions.ts picks which). Every action keeps its own accessible
// name, so a screen reader and the keyboard reach all of them: the toggle is a
// button with aria-expanded, its list follows it in focus order, Escape closes
// it and hands focus back, and choosing an action closes it.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { splitActions } from "../../game/dockActions.ts";

type Spec = {
  id: string;
  priority: number;
  label: string;
  className: string;
  run: () => void;
};

type Registry = {
  add: (spec: Spec) => void;
  remove: (id: string) => void;
};

const DockContext = createContext<Registry | null>(null);

/** Holds the registered actions; renders `children` (the actions, which draw
 * nothing themselves, and any plain buttons) and then the primary pill and the
 * More menu. Put it inside the dock's action capsule. */
export function ActionDock({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const [specs, setSpecs] = useState<ReadonlyMap<string, Spec>>(new Map());
  const registry = useMemo<Registry>(
    () => ({
      add: (spec) => setSpecs((prev) => new Map(prev).set(spec.id, spec)),
      remove: (id) =>
        setSpecs((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        }),
    }),
    [],
  );
  const { primary, more } = splitActions([...specs.values()]);
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  // a menu with nothing left in it is shut
  const isOpen = open && more.length > 0;
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // the dressing room and the menu also close on Escape: this one is first
      e.stopPropagation();
      setOpen(false);
      toggle.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.target instanceof Node && !root.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [isOpen]);
  return (
    <DockContext.Provider value={registry}>
      {children}
      {primary && (
        <button
          type="button"
          className={primary.className}
          onClick={primary.run}
        >
          {primary.label}
        </button>
      )}
      {more.length > 0 && (
        <div className="dock-more" ref={root}>
          <button
            ref={toggle}
            type="button"
            className="dock-more-toggle"
            aria-label="More actions"
            aria-expanded={isOpen}
            aria-controls={listId}
            onClick={() => setOpen(!isOpen)}
          >
            <span aria-hidden="true">More</span>
            <span className="dock-more-count" aria-hidden="true">
              {more.length}
            </span>
          </button>
          <div
            id={listId}
            className="dock-more-list"
            role="group"
            aria-label="More actions"
            hidden={!isOpen}
          >
            {more.map((a) => (
              <button
                key={a.id}
                type="button"
                className={a.className}
                onClick={() => {
                  setOpen(false);
                  a.run();
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </DockContext.Provider>
  );
}

/** One contextual action, drawn by the surrounding <ActionDock>. Lower
 * `priority` ranks first; the label is the button's accessible name. */
export function DockAction({
  id,
  priority,
  label,
  className = "drink",
  onClick,
}: {
  id: string;
  priority: number;
  label: string;
  className?: string;
  onClick: () => void;
}): null {
  const registry = useContext(DockContext);
  // the latest handler, behind a stable function, so a new closure each render
  // does not re-register the action
  const latest = useRef(onClick);
  latest.current = onClick;
  const run = useCallback(() => latest.current(), []);
  useEffect(() => {
    if (!registry) return;
    registry.add({ id, priority, label, className, run });
    return () => registry.remove(id);
  }, [registry, id, priority, label, className, run]);
  return null;
}
