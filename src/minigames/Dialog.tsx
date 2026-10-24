import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import "./Dialog.css";

/**
 * Modal minigame dialog on the native <dialog>: showModal() traps focus and
 * makes the page behind inert, Escape fires `cancel`, and focus returns to
 * the opener on unmount. Ported from Club Lion.
 */
export function Dialog({
  title,
  subtitle,
  onClose,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const subtitleId = useId();
  // Capture the opener before a directly launched activity focuses its controls.
  const returnFocus = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  // Layout effect so showModal()'s autofocus runs before children focus their own controls.
  useLayoutEffect(() => {
    const el = ref.current;
    const opener = returnFocus.current;
    el?.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el?.close();
      document.body.style.overflow = oldOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`mg-dialog ${className}`}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="mg-dialog-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p id={subtitleId}>{subtitle}</p>}
        </div>
        <button
          type="button"
          className="mg-dialog-close"
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>
      {children}
    </dialog>
  );
}
