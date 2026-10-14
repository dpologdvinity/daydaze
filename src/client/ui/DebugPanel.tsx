import type { RoomId } from "../../game/rooms.ts";

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
      <button type="button" onClick={() => onGo("amusement-park")}>
        Go to Amusement Park
      </button>
      <button type="button" onClick={() => onGo("water-park")}>
        Go to Water Park
      </button>
      <button type="button" onClick={() => onGo("city")}>
        Go to City
      </button>
    </nav>
  );
}
