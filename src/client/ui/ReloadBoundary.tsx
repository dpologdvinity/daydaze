// The last line of defense around the whole game: a part that fails to load
// (a deploy deleted the chunk an open tab points at, and main.tsx's one
// automatic reload is spent) or throws while rendering would otherwise
// unmount everything and leave a blank page. This shows a card with a
// Reload button instead.

import { Component, type ReactNode } from "react";

export class ReloadBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("Daydaze stopped: a part of the game failed", error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <aside className="update-prompt" role="alert">
        <span>Part of Daydaze didn&apos;t load.</span>
        <button type="button" onClick={() => location.reload()}>
          Reload
        </button>
      </aside>
    );
  }
}
