import type { JSX } from "react";
import { ESPRESSO } from "../../../game/barista.ts";
import { createOrderSession } from "../shared/orderSession.ts";
import { OrderPanel } from "../shared/OrderPanel.tsx";

const session = createOrderSession(ESPRESSO, "barista");

/** The barista station: read the ticket, build the drink, hand it over. */
export function BaristaPanel(): JSX.Element {
  return (
    <OrderPanel
      session={session}
      title="Barista station"
      intro="Take a shift behind the bar: eight tickets, tips for speed."
      startLabel="Start a shift"
    />
  );
}
