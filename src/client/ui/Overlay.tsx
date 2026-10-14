import { useState } from "react";
import {
  BROWS,
  EYESHADOWS,
  HAIR_COLORS,
  HAIR_STYLES,
  LIPS,
  OUTFIT_COLORS,
  OUTFITS,
  SKINS,
  type Look,
  type Mood,
} from "../../game/look.ts";
import type { RoomId } from "../../game/rooms.ts";
import { VIEWS, type View } from "../world/CameraRig.tsx";
import { Chips, Segmented, Swatches } from "./controls.tsx";

// Sit and lean need furniture, so the player only picks these.
const PLAYER_MOODS: readonly { id: Mood; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "pose", label: "Pose" },
  { id: "dance", label: "Dance" },
];

const ROOM_HINTS: Record<RoomId, string> = {
  "velvet-room": "Daydaze VIP lounge. Tap the floor or use WASD to walk.",
  plaza: "The strip after dark. Walk into a glowing door.",
  "amusement-park":
    "Night carnival. Tap a boarding ring to ride, or use WASD to walk.",
};

function Mirror({
  look,
  setLook,
}: {
  look: Look;
  setLook: (look: Look) => void;
}) {
  return (
    <div className="mirror-glass">
      <h2 className="mirror-title">Get the look</h2>
      <section>
        <h3>Skin</h3>
        <Swatches
          label="Skin tone"
          options={SKINS}
          value={look.skin}
          onPick={(skin) => setLook({ ...look, skin })}
        />
      </section>
      <section>
        <h3>Hair</h3>
        <Chips
          label="Hair style"
          options={HAIR_STYLES}
          value={look.hairStyle}
          onPick={(hairStyle) => setLook({ ...look, hairStyle })}
        />
        <Swatches
          label="Hair colour"
          options={HAIR_COLORS}
          value={look.hairColor}
          onPick={(hairColor) => setLook({ ...look, hairColor })}
        />
      </section>
      <section>
        <h3>Lips</h3>
        <Chips
          label="Lips"
          options={LIPS}
          value={look.lips}
          onPick={(lips) => setLook({ ...look, lips })}
          thumbs
        />
      </section>
      <section>
        <h3>Brows and lids</h3>
        <Chips
          label="Brows"
          options={BROWS}
          value={look.brows}
          onPick={(brows) => setLook({ ...look, brows })}
          thumbs
        />
        <Swatches
          label="Eyeshadow"
          options={EYESHADOWS}
          value={look.shadow}
          onPick={(shadow) => setLook({ ...look, shadow })}
        />
      </section>
      <section>
        <h3>Outfit</h3>
        <Chips
          label="Outfit"
          options={OUTFITS}
          value={look.outfit}
          onPick={(outfit) => setLook({ ...look, outfit })}
        />
        <Swatches
          label="Outfit colour"
          options={OUTFIT_COLORS}
          value={look.outfitColor}
          onPick={(outfitColor) => setLook({ ...look, outfitColor })}
        />
      </section>
    </div>
  );
}

export function Overlay({
  room,
  roomName,
  look,
  setLook,
  mood,
  setMood,
  view,
  setView,
}: {
  room: RoomId;
  roomName: string;
  look: Look;
  setLook: (look: Look) => void;
  mood: Mood;
  setMood: (mood: Mood) => void;
  view: View;
  setView: (view: View) => void;
}) {
  const [open, setOpen] = useState(
    () => !window.matchMedia("(max-width: 720px)").matches,
  );
  return (
    <>
      <header className="venue">
        <div aria-live="polite" aria-atomic="true">
          <h1 className="venue-name">{roomName}</h1>
        </div>
        <p className="venue-sub">{ROOM_HINTS[room]}</p>
      </header>

      <button
        type="button"
        className="mirror-toggle"
        aria-expanded={open}
        aria-controls="mirror"
        onClick={() => setOpen(!open)}
      >
        {open ? "Close mirror" : "Dressing room"}
      </button>

      <section
        id="mirror"
        className="mirror"
        data-open={open}
        aria-label="Dressing room"
      >
        <Mirror look={look} setLook={setLook} />
      </section>

      <Segmented
        className="moods"
        label="Mood"
        value={mood}
        onPick={setMood}
        options={PLAYER_MOODS}
      />
      <Segmented
        className="views"
        label="Camera"
        value={view}
        onPick={setView}
        options={VIEWS}
      />
    </>
  );
}
