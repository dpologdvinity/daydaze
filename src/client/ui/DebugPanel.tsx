import type { RoomId } from "../../game/rooms.ts";
import { drink } from "../effects/drunk.ts";

/** Room jumps for testing, shown only with `?debug=1`. */
export function DebugPanel({ onGo }: { onGo: (room: RoomId) => void }) {
  return (
    <nav className="debug" aria-label="Debug">
      <button type="button" onClick={() => onGo("plaza")}>
        Go to Plaza
      </button>
      <button type="button" onClick={() => onGo("velvet-room")}>
        Go to Velvet Room
      </button>
      <button type="button" onClick={() => onGo("pulse")}>
        Go to Pulse
      </button>
      <button type="button" onClick={() => onGo("violet-hour")}>
        Go to Violet Hour
      </button>
      <button type="button" onClick={() => onGo("karaoke")}>
        Go to Karaoke Loft
      </button>
      <button type="button" onClick={() => onGo("warehouse")}>
        Go to Bassline
      </button>
      <button type="button" onClick={() => onGo("sugar-rush")}>
        Go to Sugar Rush
      </button>
      <button type="button" onClick={() => onGo("rooftop-bar")}>
        Go to Skylark
      </button>
      <button type="button" onClick={() => onGo("amusement-park")}>
        Go to Amusement Park
      </button>
      <button type="button" onClick={() => onGo("water-park")}>
        Go to Water Park
      </button>
      <button type="button" onClick={() => onGo("apartment")}>
        Go to Apartment
      </button>
      <button type="button" onClick={() => onGo("jail")}>
        Go to Jail
      </button>
      <button type="button" onClick={() => onGo("city")}>
        Go to City
      </button>
      <button type="button" onClick={() => drink("shot")}>
        Debug: add a shot
      </button>
    </nav>
  );
}
