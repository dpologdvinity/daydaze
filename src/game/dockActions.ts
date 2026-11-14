// The dock's contextual actions: in the city up to five pill buttons (the El
// to each other station, a taxi, your car, a seat) crowded the bottom of the
// screen. This picks the one action to show as a pill, the primary, and the
// rest for a "More actions" menu. Pure: the React side (ui/ActionDock.tsx)
// only registers the actions and draws the result.

/** One contextual action: a stable id and where it ranks (lower is first). */
export type DockAction = { readonly id: string; readonly priority: number };

/** The primary action (the lowest priority number; ties keep the order given)
 * and the others in priority order. */
export function splitActions<T extends DockAction>(
  actions: readonly T[],
): { primary: T | null; more: T[] } {
  // a stable sort: equal priorities stay in registration order
  const ranked = actions
    .map((action, order) => ({ action, order }))
    .sort((x, y) => x.action.priority - y.action.priority || x.order - y.order)
    .map((x) => x.action);
  const [primary = null, ...more] = ranked;
  return { primary, more };
}
