import { isValidDisplayName } from "../game/save.ts";
import { isNetworkId } from "./networkProtocol.ts";

/** Who a session belongs to, as the server reports it. */
export type Identity = {
  id: string;
  name: string;
  isGuest: boolean;
  isAdmin: boolean;
};

export function parseIdentity(value: unknown): Identity | null {
  const f = new Map(
    typeof value === "object" && value !== null ? Object.entries(value) : [],
  );
  const id = f.get("id");
  const name = f.get("name");
  const isGuest = f.get("isGuest");
  const isAdmin = f.get("isAdmin");
  return isNetworkId(id) &&
    isValidDisplayName(name) &&
    typeof isGuest === "boolean" &&
    typeof isAdmin === "boolean"
    ? { id, name, isGuest, isAdmin }
    : null;
}
