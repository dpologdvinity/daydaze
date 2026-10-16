import { useState } from "react";
import {
  FIGURES,
  BLUSHES,
  GLOSSES,
  HIGHLIGHTERS,
  LINERS,
  SHADOW_STYLES,
  STRENGTHS,
  encodeMakeup,
  makeupOf,
  type Makeup,
  BROWS,
  EYE_COLORS,
  EYESHADOWS,
  FACE_SLIDERS,
  encodeFace,
  faceOf,
  type Face,
  HAIR_COLORS,
  HAIR_STYLES,
  LIPS,
  OUTFIT_COLORS,
  OUTFITS,
  SKINS,
  SWIMSUITS,
  type Look,
  type Mood,
  type SwimLook,
} from "../../game/look.ts";
import type { DanceMoveId } from "../../game/dance/moves.ts";
import { INTENSITIES, type Intensity } from "../../game/effects/buzz.ts";
import type { RoomId } from "../../game/rooms.ts";
import {
  BODY_LABELS,
  BODY_TRAITS,
  clampTrait,
  type BodyShape,
} from "../../game/body.ts";
import { wearable } from "../../game/shop.ts";
import { drink } from "../effects/drunk.ts";
import type { MinigameId } from "../../game/hotspots.ts";
import { VIEWS, type View } from "../world/CameraRig.tsx";
import { DriveControls } from "../rooms/speedway/DriveControls.tsx";
import { RaceHud, SpeedwayMenu } from "../rooms/speedway/RaceHud.tsx";
import { CocktailIcon, RideIcon } from "./icons.tsx";
import { DancePicker } from "./DancePicker.tsx";
import { Dressing } from "./Dressing.tsx";
import { DeliveryApp } from "./phone/DeliveryApp.tsx";
import { FoodHud } from "./phone/FoodHud.tsx";
import { Chips, Segmented, Slider, Swatches } from "./controls.tsx";
import { VenueGames } from "./Minigames.tsx";

// Sit and lean need furniture, so the player only picks these.
const PLAYER_MOODS: readonly { id: Mood; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "pose", label: "Pose" },
  { id: "dance", label: "Dance" },
];

const ROOM_HINTS: Record<RoomId, string> = {
  "velvet-room": "Daydaze VIP lounge. Tap the floor or use WASD to walk.",
  pulse: "Pulse. Tap the floor to walk, tap the DJ booth to play, or use WASD.",
  "violet-hour":
    "The Violet Hour. Tap the floor to walk, or chat with the regulars.",
  plaza: "The strip after dark. Walk into a glowing door.",
  "amusement-park":
    "Night carnival. Tap a boarding ring to ride, or use WASD to walk.",
  "water-park": "Swimsuits on. Tap the slide tower to ride.",
  "filipino-joint":
    "Point and Eat Kitchen. Tap the cashier for the next dish, then eat it.",
  "boba-matcha":
    "Jade Whisk and Pearl Ledger. Tap the server for a drink, then sip it.",
  "ube-bakery": "Purple Pandesal. Tap the baker for a treat, then eat it.",
  speedway: "Pit lane. Tap a spot to race or ride the bumper cars.",
  city: "Downtown after dark. Tap the street or use WASD, then walk into a lit door.",
  apartment:
    "Your flat. Use the decorating panel to place furniture and lock the door. Tap the blue shelf to try a shoplift.",
  jail: "City Jail. Wait out the sentence, play cards with the guard, or talk to Officer Dee.",
};

const EFFECT_LEVELS = INTENSITIES.map((id) => ({
  id,
  label: id === "off" ? "Off" : id === "low" ? "Low" : "Full",
}));

function Mirror({
  look,
  setLook,
  swim,
  setSwim,
  wardrobe,
  body,
  setBody,
  effects,
  setEffects,
}: {
  look: Look;
  setLook: (look: Look) => void;
  swim: SwimLook;
  setSwim: (swim: SwimLook) => void;
  wardrobe: readonly string[];
  body: BodyShape;
  setBody: (body: BodyShape) => void;
  effects: Intensity;
  setEffects: (effects: Intensity) => void;
}) {
  const face = faceOf(look);
  const makeup = makeupOf(look);
  const setMakeup = (next: Makeup) =>
    setLook({ ...look, makeup: encodeMakeup(next) });
  const setFace = (next: Face) => setLook({ ...look, face: encodeFace(next) });
  return (
    <>
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
        <h3>Face</h3>
        <Swatches
          label="Eye colour"
          options={EYE_COLORS}
          value={face.eyeColor}
          onPick={(eyeColor) => setFace({ ...face, eyeColor })}
        />
        {FACE_SLIDERS.map((s) => (
          <Slider
            key={s.id}
            label={s.label}
            value={face[s.id]}
            min={-1}
            max={1}
            step={0.1}
            onChange={(v) => setFace({ ...face, [s.id]: v })}
          />
        ))}
      </section>
      <section>
        <h3>Hair</h3>
        <Chips
          label="Hair style"
          options={wearable(HAIR_STYLES, wardrobe)}
          value={look.hairStyle}
          onPick={(hairStyle) => setLook({ ...look, hairStyle })}
        />
        <Swatches
          label="Hair colour"
          options={wearable(HAIR_COLORS, wardrobe)}
          value={look.hairColor}
          onPick={(hairColor) => setLook({ ...look, hairColor })}
        />
      </section>
      <section>
        <h3>Lips</h3>
        <Swatches
          label="Lipstick"
          options={wearable(LIPS, wardrobe)}
          value={look.lips}
          onPick={(lips) => setLook({ ...look, lips })}
        />
        <Chips
          label="Lip finish"
          options={GLOSSES}
          value={makeup.gloss}
          onPick={(gloss) => setMakeup({ ...makeup, gloss })}
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
          options={wearable(EYESHADOWS, wardrobe)}
          value={look.shadow}
          onPick={(shadow) => setLook({ ...look, shadow })}
        />
      </section>
      <section>
        <h3>Makeup</h3>
        <Chips
          label="Eyeliner"
          options={LINERS}
          value={makeup.liner}
          onPick={(liner) => setMakeup({ ...makeup, liner })}
        />
        <Chips
          label="Eyeshadow style"
          options={SHADOW_STYLES}
          value={makeup.shadowStyle}
          onPick={(shadowStyle) => setMakeup({ ...makeup, shadowStyle })}
        />
        <Swatches
          label="Blush"
          options={BLUSHES}
          value={makeup.blush}
          onPick={(blush) => setMakeup({ ...makeup, blush })}
        />
        <Chips
          label="Blush strength"
          options={STRENGTHS}
          value={makeup.blushStrength}
          onPick={(blushStrength) => setMakeup({ ...makeup, blushStrength })}
        />
        <Swatches
          label="Highlighter"
          options={HIGHLIGHTERS}
          value={makeup.highlight}
          onPick={(highlight) => setMakeup({ ...makeup, highlight })}
        />
      </section>
      <section>
        <h3>Outfit</h3>
        <Chips
          label="Outfit"
          options={wearable(OUTFITS, wardrobe)}
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
      <section>
        <h3>Swimsuit</h3>
        <Chips
          label="Swimsuit"
          options={SWIMSUITS}
          value={swim.style}
          onPick={(style) => setSwim({ ...swim, style })}
        />
        <Swatches
          label="Swimsuit colour"
          options={OUTFIT_COLORS}
          value={swim.color}
          onPick={(color) => setSwim({ ...swim, color })}
        />
      </section>
      <section>
        <h3>Body</h3>
        <Chips
          label="Figure"
          options={FIGURES}
          value={face.figure}
          onPick={(figure) => setFace({ ...face, figure })}
        />
        {BODY_TRAITS.map((trait) => (
          <Slider
            key={trait}
            label={BODY_LABELS[trait]}
            value={body[trait]}
            onChange={(value) =>
              setBody({ ...body, [trait]: clampTrait(value) })
            }
          />
        ))}
      </section>
      <section>
        <h3>Drunk effects</h3>
        <Chips
          label="Drunk effects"
          options={EFFECT_LEVELS}
          value={effects}
          onPick={setEffects}
        />
      </section>
    </>
  );
}

export function Overlay({
  room,
  roomName,
  look,
  setLook,
  swim,
  setSwim,
  coins,
  wardrobe,
  body,
  setBody,
  onRide,
  onPlayGame,
  mood,
  setMood,
  dance,
  setDance,
  effects,
  setEffects,
  view,
  setView,
  panelOpen,
  setPanelOpen,
}: {
  room: RoomId;
  roomName: string;
  look: Look;
  setLook: (look: Look) => void;
  swim: SwimLook;
  setSwim: (swim: SwimLook) => void;
  coins: number;
  wardrobe: readonly string[];
  body: BodyShape;
  setBody: (body: BodyShape) => void;
  onRide: () => void;
  onPlayGame: (game: MinigameId) => void;
  mood: Mood;
  setMood: (mood: Mood) => void;
  dance: DanceMoveId;
  setDance: (move: DanceMoveId) => void;
  effects: Intensity;
  setEffects: (effects: Intensity) => void;
  view: View;
  setView: (view: View) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
}) {
  const [phone, setPhone] = useState(false);
  return (
    <>
      <header className="venue">
        <div aria-live="polite" aria-atomic="true">
          <h1 className="venue-name">{roomName}</h1>
        </div>
        <p className="venue-sub">{ROOM_HINTS[room]}</p>
        <p className="coins" aria-label={`${coins} coins`}>
          {coins} coins
        </p>
      </header>

      <button
        type="button"
        className="phone-open"
        aria-haspopup="dialog"
        onClick={() => setPhone(true)}
      >
        Plate Rush
      </button>
      {phone && <DeliveryApp onClose={() => setPhone(false)} />}
      <FoodHud />

      <Dressing open={panelOpen} onOpenChange={setPanelOpen}>
        <Mirror
          look={look}
          setLook={setLook}
          swim={swim}
          setSwim={setSwim}
          wardrobe={wardrobe}
          body={body}
          setBody={setBody}
          effects={effects}
          setEffects={setEffects}
        />
      </Dressing>

      {room === "speedway" && (
        <>
          <SpeedwayMenu />
          <RaceHud />
          <DriveControls />
        </>
      )}

      <div className="dock">
        {mood === "dance" && <DancePicker move={dance} onPick={setDance} />}
        <div className="dock-actions" role="group" aria-label="Room actions">
          {room === "water-park" && (
            <button type="button" className="ride" onClick={onRide}>
              <RideIcon />
              Ride a slide
            </button>
          )}
          {room === "velvet-room" && (
            <button
              type="button"
              className="drink"
              onClick={() => drink("cocktail")}
            >
              <CocktailIcon />
              Have a drink
            </button>
          )}
          <VenueGames room={room} onPlay={onPlayGame} />
        </div>
        <div className="dock-modes">
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
        </div>
      </div>
    </>
  );
}
