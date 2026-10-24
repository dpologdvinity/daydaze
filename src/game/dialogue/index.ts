// Registry of every NPC role's handwritten line bank, keyed by role id. Adding
// a role means a new role file, its id in ROLE_IDS (types.ts) and an entry
// here; the Record type makes a missing bank a type error.

import { bartenderBank } from "./bartender.ts";
import { bouncerBank } from "./bouncer.ts";
import { djBank } from "./dj.ts";
import { clubDancerBank } from "./club-dancer.ts";
import { coatCheckBank } from "./coat-check.ts";
import { serverBank } from "./server.ts";
import { regularBank } from "./regular.ts";
import { cashierBank } from "./cashier.ts";
import { stylistBank } from "./stylist.ts";
import { nailTechBank } from "./nail-tech.ts";
import { lifeguardBank } from "./lifeguard.ts";
import { snackCashierBank } from "./snack-cashier.ts";
import { swimmerBank } from "./swimmer.ts";
import { rideOperatorBank } from "./ride-operator.ts";
import { ticketCashierBank } from "./ticket-cashier.ts";
import { carnivalBarkerBank } from "./carnival-barker.ts";
import { pitCrewBank } from "./pit-crew.ts";
import { cottonCandyVendorBank } from "./cotton-candy-vendor.ts";
import { guardBank } from "./guard.ts";
import { policeBank } from "./police.ts";
import type { DialogueRole, RoleBank } from "./types.ts";

/**
 * Each dialogue role's line bank; pickLine reads from here unless a test passes
 * its own bank.
 */
export const LINE_BANKS: Record<DialogueRole, RoleBank> = {
  bartender: bartenderBank,
  bouncer: bouncerBank,
  dj: djBank,
  "club-dancer": clubDancerBank,
  "coat-check": coatCheckBank,
  server: serverBank,
  regular: regularBank,
  cashier: cashierBank,
  stylist: stylistBank,
  "nail-tech": nailTechBank,
  lifeguard: lifeguardBank,
  "snack-cashier": snackCashierBank,
  swimmer: swimmerBank,
  "ride-operator": rideOperatorBank,
  "ticket-cashier": ticketCashierBank,
  "carnival-barker": carnivalBarkerBank,
  "pit-crew": pitCrewBank,
  "cotton-candy-vendor": cottonCandyVendorBank,
  guard: guardBank,
  police: policeBank,
};
