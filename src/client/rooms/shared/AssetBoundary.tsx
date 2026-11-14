// An error boundary for a model or image that may fail to load (a missing file,
// a garbled WebP or GLB). Suspense covers only the wait: a failed load throws
// to the app's reload boundary and unmounts the game, so wrap each Meshy asset
// in this, around its Suspense, and the scene carries on with `fallback`.

import { Component, type ReactNode } from "react";

export class AssetBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.warn("an asset could not be loaded", error);
  }
  render() {
    return this.state.failed
      ? (this.props.fallback ?? null)
      : this.props.children;
  }
}
