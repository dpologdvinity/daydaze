// The Espresso Lab barista shift panel: the shared order panel bound to the
// ESPRESSO menu. The order session is module-level, so a shift survives the
// panel closing and reopening.

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
