import type { RoomId } from "../../game/rooms.ts";
import { drink } from "../effects/drunk.ts";
import { ADULT_OK } from "../adult.ts";

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
      <button type="button" onClick={() => onGo("gridiron")}>
        Go to the Gridiron
      </button>
      <button type="button" onClick={() => onGo("driving-range")}>
        Go to the Driving Range
      </button>
      <button type="button" onClick={() => onGo("mermaid-cove")}>
        Go to Mermaid Cove
      </button>
      <button type="button" onClick={() => onGo("laser-tag")}>
        Go to Photon Zone
      </button>
      {ADULT_OK && (
        <button type="button" onClick={() => onGo("green-haze")}>
          Go to Green Haze
        </button>
      )}
      <button type="button" onClick={() => onGo("courtside")}>
        Go to the Courtside Club
      </button>
      <button type="button" onClick={() => onGo("catwalk")}>
        Go to the Catwalk
      </button>
      <button type="button" onClick={() => onGo("marina")}>
        Go to the Marina
      </button>
      <button type="button" onClick={() => onGo("gym")}>
        Go to the Gym
      </button>
      <button type="button" onClick={() => onGo("skatepark")}>
        Go to the Skatepark
      </button>
      <button type="button" onClick={() => onGo("roller-rink")}>
        Go to the Roller Disco
      </button>
      <button type="button" onClick={() => onGo("galleria")}>
        Go to the Galleria
      </button>
      <button type="button" onClick={() => onGo("kamayan-hall")}>
        Go to Kamayan Hall
      </button>
      <button type="button" onClick={() => onGo("dome")}>
        Go to the Dome
      </button>
      <button type="button" onClick={() => onGo("stadium")}>
        Go to the Stadium
      </button>
      <button type="button" onClick={() => onGo("mini-golf")}>
        Go to Lagoon Links
      </button>
      <button type="button" onClick={() => onGo("la-noche")}>
        Go to La Noche
      </button>
      <button type="button" onClick={() => onGo("arcade-bar")}>
        Go to Player 2
      </button>
      <button type="button" onClick={() => onGo("bowling")}>
        Go to Glow Bowl
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
