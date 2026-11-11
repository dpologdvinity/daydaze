// `?timescale=0.1` slows the player's walk and every doll's animation to a
// tenth, so a frame strip recorded on a slow software renderer (a frame every
// half second) still catches each stage of a half-second move. A development
// aid for screenshots; 1 (normal time) when absent or out of range.

const flag = Number(
  typeof location === "undefined"
    ? Number.NaN
    : new URLSearchParams(location.search).get("timescale"),
);

/** The factor game time runs at, 0.02 to 1. */
export const TIME_SCALE = flag >= 0.02 && flag <= 1 ? flag : 1;
