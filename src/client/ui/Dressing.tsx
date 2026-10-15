import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { CloseIcon, MirrorIcon } from "./icons.tsx";

/**
 * The dressing room: a toggle and a drawer that slides in from the right
 * (a bottom sheet on phones). Esc closes it; focus moves in on open and back
 * to the toggle on close.
 */
export function Dressing({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const toggle = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  // Focus moves after the drawer is visible, so it waits one frame for React.
  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      requestAnimationFrame(() =>
        (next ? title.current : toggle.current)?.focus(),
      );
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      <button
        ref={toggle}
        type="button"
        className="dressing-toggle"
        aria-expanded={open}
        aria-controls="dressing"
        onClick={() => setOpen(!open)}
      >
        <MirrorIcon />
        Dressing room
      </button>

      <section
        id="dressing"
        className="dressing"
        data-open={open}
        aria-labelledby="dressing-title"
      >
        <div className="dressing-glass">
          <header className="dressing-head">
            <h2 id="dressing-title" ref={title} tabIndex={-1}>
              Get the look
            </h2>
            <button
              type="button"
              className="dressing-close"
              aria-label="Close dressing room"
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </header>
          {children}
        </div>
      </section>
    </>
  );
}
