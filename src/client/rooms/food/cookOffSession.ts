// Kamayan Hall's cook-off shift: eight Filipino tickets on the shared order
// session, read by the panel (CookOffPanel.tsx) and the kitchen scene
// (kamayan/Stove.tsx).

import { COOKOFF } from "../../../game/cookOff.ts";
import { createOrderSession } from "../shared/orderSession.ts";

/** The cook-off's order session. */
export const cookOffSession = createOrderSession(COOKOFF, "cook-off");
