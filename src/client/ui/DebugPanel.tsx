import type { RoomId } from "../../game/rooms.ts";

/** Room jumps for testing, shown only with `?debug=1`. */
export function DebugPanel({ onGo }: { onGo: (room: RoomId) => void }) {
  return (
    <nav className="debug" aria-label="Debug">
      <button type="button" onClick={() => onGo("plaza")}>
        Go to Plaza
      </button>
      <button type="button" onClick={() => onGo("mango-room")}>
        Go to Mango Room
      </button>
    </nav>
  );
}
