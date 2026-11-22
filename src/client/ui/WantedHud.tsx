// A live five-star readout for the player's active police response.
import { MAX_STARS } from "../../game/wanted/wanted.ts";
import { wantedHud } from "../world/heat.ts";

export function WantedHud({ inCity }: { inCity: boolean }) {
  const { stars, inSight } = wantedHud.use();
  if (stars === 0) return null;
  return (
    <p className="wanted-hud" role="status" aria-label="Wanted level">
      <strong aria-hidden="true">
        {"★".repeat(stars)}
        {"☆".repeat(MAX_STARS - stars)}
      </strong>
      <span className="wanted-label">
        {stars} of {MAX_STARS} stars
      </span>
      <span>
        {inCity ? (inSight ? "Police pursuit" : "Police searching") : "Wanted"}
      </span>
    </p>
  );
}
