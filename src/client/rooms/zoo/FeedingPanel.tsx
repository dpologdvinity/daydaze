import type { JSX } from "react";
import { FEEDING } from "../../../game/feeding.ts";
import { createOrderSession } from "../shared/orderSession.ts";
import { OrderPanel } from "../shared/OrderPanel.tsx";

const session = createOrderSession(FEEDING, "feeding");

/** Feeding time: fill each hungry enclosure's bucket. */
export function FeedingPanel(): JSX.Element {
  return (
    <OrderPanel
      session={session}
      title="Feeding time"
      intro="Eight hungry enclosures. Fill the bucket with what each one eats, in the order the keeper's card says. Quick feeds earn a bonus."
      startLabel="Start feeding time"
      vessel="bucket"
      serveLabel="Feed them"
      wrong={(name) => `Wrong food for ${name}`}
      tipWord="bonus"
      tipsWord="bonus points"
    />
  );
}
