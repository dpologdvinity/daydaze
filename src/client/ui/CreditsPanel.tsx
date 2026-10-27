// The source ledger in a scrollable menu sheet; the native dialog owns keyboard focus.
import { useEffect, useRef, type JSX } from "react";
import { CREDITS } from "../../game/credits.ts";

export function CreditsPanel({
  onClose,
}: {
  onClose: () => void;
}): JSX.Element {
  const panel = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = panel.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const close = () => {
    panel.current?.close();
    onClose();
  };
  return (
    <dialog
      ref={panel}
      className="game-menu credits-panel"
      aria-label="Credits"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="game-menu-head">
        <h2>Credits</h2>
        <button type="button" aria-label="Close credits" onClick={close}>
          Close
        </button>
      </div>
      <div className="credits-list">
        <p>Made possible by these artists and open-source communities.</p>
        <p>Procedural music and generated sound effects</p>
        <p>Mixamo animations (Adobe), used under Mixamo&apos;s terms</p>
        {CREDITS.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h3>{group.title}</h3>
            <ul>
              {group.entries.map((entry) => (
                <li key={entry.title}>
                  <a href={entry.url} target="_blank" rel="noopener noreferrer">
                    {entry.title}
                  </a>
                  <p className="credits-byline">
                    {entry.author} · {entry.license}
                  </p>
                  <p>{entry.usedFor}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </dialog>
  );
}
