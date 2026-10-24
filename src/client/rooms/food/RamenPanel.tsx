// Ramen Rush's panel: the shared OrderPanel over a ramen order session, drawn
// as a bowl. The session is created once at module load, so a round in progress
// survives the panel unmounting.

import type { JSX } from "react";
import { RAMEN } from "../../../game/ramen.ts";
import { createOrderSession } from "../shared/orderSession.ts";
import { OrderPanel } from "../shared/OrderPanel.tsx";

const session = createOrderSession(RAMEN, "ramen");

/** Ramen Rush: build each bowl the ticket calls, broth first. */
export function RamenPanel(): JSX.Element {
  return (
    <OrderPanel
      session={session}
      title="Ramen Rush"
      intro="Work the ramen counter: eight tickets, broth first, then noodles, then toppings in the order called. Tips for speed."
      startLabel="Work the counter"
      vessel="bowl"
    />
  );
}
