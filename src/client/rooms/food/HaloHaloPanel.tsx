// The halo-halo counter game's panel: the shared OrderPanel over a halo-halo
// order session. The session is created once at module load, so a round in
// progress survives the panel unmounting.

import type { JSX } from "react";
import { HALO_HALO } from "../../../game/haloHalo.ts";
import { createOrderSession } from "../shared/orderSession.ts";
import { OrderPanel } from "../shared/OrderPanel.tsx";

const session = createOrderSession(HALO_HALO, "halo-halo");

/** The halo-halo counter: build each glass the ticket asks for. */
export function HaloHaloPanel(): JSX.Element {
  return (
    <OrderPanel
      session={session}
      title="Halo-halo counter"
      intro="Build halo-halo to order: eight tickets, the sweets, the ice and milk, the toppings. Tips for speed."
      startLabel="Build some halo-halo"
    />
  );
}
