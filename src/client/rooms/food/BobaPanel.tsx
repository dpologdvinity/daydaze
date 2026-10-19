import type { JSX } from "react";
import { BOBA } from "../../../game/boba.ts";
import { createOrderSession } from "../shared/orderSession.ts";
import { OrderPanel } from "../shared/OrderPanel.tsx";

const session = createOrderSession(BOBA, "boba");

/** The boba bar: read the ticket, build the cup, hand it over. */
export function BobaPanel(): JSX.Element {
  return (
    <OrderPanel
      session={session}
      title="Boba bar"
      intro="Work the boba bar: eight tickets, tea, milk, toppings, ice. Tips for speed."
      startLabel="Shake some boba"
    />
  );
}
