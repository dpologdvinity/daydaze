import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  FIGURES,
  PIERCING_SPOTS,
  PIERCING_STYLES,
  encodePiercings,
  piercingsOf,
  EYE_SHAPES,
  FACE_SHAPES,
  LIP_SHAPES,
  NOSES,
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
import type { DanceMoveId, Holds } from "../../game/dance/moves.ts";
import { INTENSITIES, type Intensity } from "../../game/effects/buzz.ts";
import { CarPicker } from "../city/CarPicker.tsx";
import { FuelStop } from "../city/FuelStop.tsx";
import { DealershipPanel } from "../city/DealershipPanel.tsx";
import { RecordPlayer, RecordsPanel } from "../city/RecordsPanel.tsx";
import type { ParkedCar } from "../../game/city/drive.ts";
import type { RoomId, Spawn } from "../../game/rooms.ts";
import {
  BODY_LABELS,
  BODY_TRAITS,
  clampTrait,
  type BodyShape,
} from "../../game/body.ts";
import { wearable, type PurchaseResult, type ShopId } from "../../game/shop.ts";
import { drink, relieve } from "../effects/drunk.ts";
import { PRICES } from "../../game/market.ts";
import { sipTea, takeHit } from "../effects/high.ts";
import type { MinigameId } from "../../game/hotspots.ts";
import { VIEWS, type View } from "../world/CameraRig.tsx";
import { clearCityMapRequest, useCityMapRequest } from "./cityMapRequest.ts";
import { RoomPanel } from "./RoomPanels.tsx";
import { PiercingPanel } from "./PiercingPanel.tsx";
import { DanceOffHud } from "../rooms/pulse/DanceOffHud.tsx";
import { ShopPanel } from "./ShopPanel.tsx";
import { setSkates, skates, SKATE_ROOMS } from "../world/skates.ts";
import { openShop } from "./shopRequest.ts";
import { takePhoto } from "../world/Photo.tsx";
import { STORES as GALLERIA_STORES } from "../../game/galleria.ts";
import { CocktailIcon, RideIcon } from "./icons.tsx";
import { DancePicker, HoldPicker } from "./DancePicker.tsx";
import { CityMap } from "./CityMap.tsx";
import type { ChallengeSave } from "../../game/challenges.ts";
import { FireworksTicker } from "../city/FireworksTicker.tsx";
import { Dressing } from "./Dressing.tsx";
import { GAITS, gaitOf } from "../../game/gaits.ts";
import { seatsIn } from "../../game/seats.ts";
import { seatRequest } from "../world/Seats.tsx";
import { NEIGHBORHOOD_NAMES, useNeighborhood } from "../city/here.ts";
import { DeliveryApp } from "./phone/DeliveryApp.tsx";
import { FoodHud } from "./phone/FoodHud.tsx";
import { Chips, Segmented, Slider, Swatches, Tiles } from "./controls.tsx";
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
  city: "The city after dark. Tap the street or use WASD, walk into a lit door, or head south to the beach.",
  apartment:
    "Your flat. Use the decorating panel to place furniture and lock the door. Tap the blue shelf to try a shoplift.",
  "haunted-house":
    "The Haunted House. Find your way through the dark rooms past the ghosts, then back out to the park.",
  gridiron:
    "The Gridiron. Kick five field goals, each from further out: aim into the wind, then put your leg into it.",
  "driving-range":
    "Skyline Driving Range. Get a bucket of ten: set your backswing, strike it pure, and land them on the greens.",
  salon:
    "The Blowout Bar. Book with Dani for the salon's colors, or take a chair by the mirrors.",
  "video-store":
    "Rewind Video. Browse the tapes and the new releases, then play Throwback Trivia at Tasha's counter.",
  "back-room":
    "The Back Room. A speakeasy behind an unmarked door: order a drink from Odette, then take a stool or a leather booth.",
  "hotel-rooftop":
    "The Marquise Rooftop. Swimsuits on, forty floors up: lie out on a lounger, sink into the hot tub, or get a drink from Simone at the pool bar.",
  "espresso-lab":
    "Espresso Lab. Grab a table, or take a shift at the barista station: build each ticket's drink from the recipe card, fast for tips.",
  "thrift-temple":
    "Thrift Temple. Tap Juno at the counter for vintage dyes and today's find on the pedestal, half the boutique's price.",
  "tiki-bar":
    "The Coconut Grove. Order something with an umbrella from Malia, take a stool or a lounge by the fire, and watch the sun go down.",
  "vinyl-vault":
    "Vinyl Vault. Dig the crates, play a sample of any record and buy the ones you love for the record player at home.",
  "jazz-club":
    "The Midnight Horn. A four-piece band plays under the spotlight; take a candlelit table or a stool at the bar.",
  dealership:
    "Daydaze Motors. Every road car turns on its own turntable: buy one from the price list and it waits at the curb.",
  zoo: "The Daydaze Zoo. Stroll the paths past giraffes and zebras, elephants, lions, penguins and flamingos.",
  "music-studio":
    "Loft Studios. Walk up to the piano, the drums, the marimba or the floor piano and play: tap the notes or press 1 to 8.",
  paintball:
    "Splat City. Gear up for sixty seconds of speedball: mark rivals when they lean out of their bunkers, and stay behind yours.",
  market:
    "Skyline Supply. Wander the aisles, then grab a snack or a water at Rosa's till: either takes the edge off a buzz.",
  "laser-tag":
    "Photon Zone. Suit up for a 60-second round: tag rivals when they pop out of cover, and keep cover between you when they fire.",
  "green-haze":
    "Green Haze, 18+. Light up, try an edible or sip shroom tea at the counter, then sink into a couch.",
  piercing:
    "Ink & Needle. Pick a spot and a piece of fine jewelry at the counter; Vix does the rest.",
  museum:
    "Museo ng Little Manila. Walk the hall, or pick an exhibit from the guide to read its plaque: the bahay kubo, the jeepney, the parol and more.",
  "halo-halo-cafe":
    "Halo-Halo Haus. Tap Joy at the counter for halo-halo, ube or leche flan.",
  "skate-diner":
    "Skate-Up Drive-In Diner. Tap Dottie at the pass to order, grab a booth or a stool, and mind the servers gliding by on skates.",
  "mermaid-cove":
    "Mermaid Cove. The mermaids sing on the shells at the waterline: sing it back, one note longer each round. Or sit on a log and watch them swim.",
  catwalk:
    "The Catwalk. Walk the runway for the judges: strut, pose and twirl as each cue's ring closes.",
  courtside:
    "The Courtside Club. Play seven points against the club pro: swing as the ball reaches you, and a perfect swing deep in a rally is a winner.",
  marina:
    "Starboard Marina. Fish off the end of the long dock: cast out, then strike the moment the bobber dips. Coral pours at the yacht club.",
  gym: "Flip City Gymnastics. Start the floor routine and press as each ring closes to stick your tumbles for the judges.",
  skatepark:
    "Concrete Wave Skatepark. Drop in on the half-pipe and time your tricks at the lip, or put on skates and roll around.",
  "roller-rink":
    "The Starlite Roller Disco. Put on skates (tap Roxy at the rental counter, or the dock button) and roll laps to the disco.",
  galleria:
    "The Starlight Galleria. Tap a clerk at Glitterbox, Gloss & Glow or Curl & Chrome to shop, grab food at the food court, or ride the escalators' view.",
  "kamayan-hall":
    "Lechon and Kamayan Hall. Grab a seat at the boodle table, tap Tess at the carving station for the next dish, or sing videoke with Tita Joy.",
  dome: "The Dome. Play Hot Shots: sixty seconds to score from the spots round the arc. Bree sells snacks courtside.",
  stadium:
    "Seaside Stadium. Take five penalties against the keeper: pick your spot, then strike.",
  "mini-golf":
    "Lagoon Links, three holes on the sand. Press Play a round: turn your aim, then time the power and putt. Leilani runs the hut.",
  "la-noche":
    "La Noche, the Latin club. The band's playing salsa: dance on the floor, take a table, or tap Yara for a drink.",
  "arcade-bar":
    "Player 2, the arcade bar. Step up to a lit cabinet to play, or try Last Call at the bar. Kit pours.",
  bowling:
    "Glow Bowl. Press Bowl a game for lane three: slide along the line, pick a hook, then time the aim and the power. Rent shoes from Dana.",
  karaoke:
    "The Karaoke Loft. Step up to the mic and sing along with the ball, cheer from a booth, or tap Jo for a drink.",
  warehouse:
    "Bassline, the techno warehouse down the alley. Dance under the red beams, play Bassline at the decks, or tap Ren at the pallet bar.",
  "sugar-rush":
    "Sugar Rush, the Y2K pop club. Dance on the LED floor, tap Kiki at the bar for a drink, or flop into a blow-up chair.",
  "rooftop-bar":
    "The Skylark, up on the roof. Tap the bartender for a drink, sit by the fire, or play Last Call at the end of the bar.",
  "ice-rink":
    "Park Ice Rink. Glide onto the ice, skate the ice show for the judges, then warm up with cocoa by the door.",
  aquarium:
    "Uptown Aquarium. Walk the shark tunnel, watch the jellyfish and the reef, and say hi at the desk.",
  jail: "City Jail. Wait out the sentence, play cards with the guard, or talk to Officer Dee.",
};

const EFFECT_LEVELS = INTENSITIES.map((id) => ({
  id,
  label: id === "off" ? "Off" : id === "low" ? "Low" : "Full",
}));

export const MIRROR_TABS = [
  { id: "face", label: "Face" },
  { id: "makeup", label: "Makeup" },
  { id: "hair", label: "Hair" },
  { id: "body", label: "Body" },
  { id: "outfit", label: "Outfit" },
] as const;
export type MirrorTab = (typeof MIRROR_TABS)[number]["id"];

function Mirror({
  tab,
  setTab,
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
  tab: MirrorTab;
  setTab: (tab: MirrorTab) => void;
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
  const piercings = piercingsOf(look);
  const setMakeup = (next: Makeup) =>
    setLook({ ...look, makeup: encodeMakeup(next) });
  const setFace = (next: Face) => setLook({ ...look, face: encodeFace(next) });
  const tabs: Record<MirrorTab, ReactNode> = {
    face: (
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
          <h3>Face shape</h3>
          <Tiles
            label="Face shape"
            options={FACE_SHAPES}
            value={face.faceShape}
            onPick={(faceShape) => setFace({ ...face, faceShape })}
            tiles="face"
          />
        </section>
        <section>
          <h3>Eyes</h3>
          <Tiles
            label="Eye shape"
            options={EYE_SHAPES}
            value={face.eyeShape}
            onPick={(eyeShape) => setFace({ ...face, eyeShape })}
            tiles="eye"
          />
          <Swatches
            label="Eye color"
            options={EYE_COLORS}
            value={face.eyeColor}
            onPick={(eyeColor) => setFace({ ...face, eyeColor })}
          />
        </section>
        <section>
          <h3>Nose</h3>
          <Tiles
            label="Nose"
            options={NOSES}
            value={face.noseShape}
            onPick={(noseShape) => setFace({ ...face, noseShape })}
            tiles="nose"
          />
        </section>
        <section>
          <h3>Lips</h3>
          <Tiles
            label="Lip shape"
            options={LIP_SHAPES}
            value={face.lipShape}
            onPick={(lipShape) => setFace({ ...face, lipShape })}
            tiles="lips"
          />
        </section>
        <section>
          <h3>Fine tune</h3>
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
      </>
    ),
    makeup: (
      <>
        <section>
          <h3>Lipstick</h3>
          <Swatches
            label="Lipstick"
            options={wearable(LIPS, wardrobe)}
            value={look.lips}
            onPick={(lips) => setLook({ ...look, lips })}
          />
          <Tiles
            label="Lip finish"
            options={GLOSSES}
            value={makeup.gloss}
            onPick={(gloss) => setMakeup({ ...makeup, gloss })}
            tiles="gloss"
          />
        </section>
        <section>
          <h3>Eyes</h3>
          <Swatches
            label="Eyeshadow"
            options={wearable(EYESHADOWS, wardrobe)}
            value={look.shadow}
            onPick={(shadow) => setLook({ ...look, shadow })}
          />
          <Tiles
            label="Eyeshadow style"
            options={SHADOW_STYLES}
            value={makeup.shadowStyle}
            onPick={(shadowStyle) => setMakeup({ ...makeup, shadowStyle })}
            tiles="shadow"
          />
          <Tiles
            label="Eyeliner"
            options={LINERS}
            value={makeup.liner}
            onPick={(liner) => setMakeup({ ...makeup, liner })}
            tiles="liner"
          />
          <Chips
            label="Brows"
            options={BROWS}
            value={look.brows}
            onPick={(brows) => setLook({ ...look, brows })}
            thumbs
          />
        </section>
        <section>
          <h3>Cheeks</h3>
          <Swatches
            label="Blush"
            options={BLUSHES}
            value={makeup.blush}
            onPick={(blush) => setMakeup({ ...makeup, blush })}
          />
          <Segmented
            label="Blush strength"
            options={STRENGTHS}
            value={makeup.blushStrength}
            onPick={(blushStrength) => setMakeup({ ...makeup, blushStrength })}
            className="strength"
          />
          <Swatches
            label="Highlighter"
            options={HIGHLIGHTERS}
            value={makeup.highlight}
            onPick={(highlight) => setMakeup({ ...makeup, highlight })}
          />
        </section>
        <section>
          <h3>Piercings</h3>
          {PIERCING_SPOTS.map((spot) => (
            <Fragment key={spot.id}>
              <p className="tiles-label">{spot.label}</p>
              <Tiles
                label={`${spot.label} piercing`}
                options={wearable(PIERCING_STYLES, wardrobe)}
                value={piercings[spot.id]}
                onPick={(style) =>
                  setLook({
                    ...look,
                    piercings: encodePiercings({
                      ...piercings,
                      [spot.id]: style,
                    }),
                  })
                }
                tiles={`pierce-${spot.id}`}
              />
            </Fragment>
          ))}
        </section>
      </>
    ),
    hair: (
      <>
        <section>
          <h3>Style</h3>
          <Tiles
            label="Hair style"
            options={wearable(HAIR_STYLES, wardrobe)}
            value={look.hairStyle}
            onPick={(hairStyle) => setLook({ ...look, hairStyle })}
            tiles="hair"
          />
        </section>
        <section>
          <h3>Color</h3>
          <Swatches
            label="Hair color"
            options={wearable(HAIR_COLORS, wardrobe)}
            value={look.hairColor}
            onPick={(hairColor) => setLook({ ...look, hairColor })}
          />
        </section>
      </>
    ),
    body: (
      <>
        <section>
          <h3>Walk</h3>
          <Chips
            label="Walk style"
            options={GAITS}
            value={gaitOf(look.gait).id}
            onPick={(gait) => setLook({ ...look, gait })}
          />
        </section>
        <section>
          <h3>Figure</h3>
          <Tiles
            label="Figure"
            options={FIGURES}
            value={face.figure}
            onPick={(figure) => setFace({ ...face, figure })}
            tiles="figure"
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
      </>
    ),
    outfit: (
      <>
        <section>
          <h3>Outfit</h3>
          <Tiles
            label="Outfit"
            tiles="outfit"
            options={wearable(OUTFITS, wardrobe)}
            value={look.outfit}
            onPick={(outfit) => setLook({ ...look, outfit })}
          />
          <Swatches
            label="Outfit color"
            options={wearable(OUTFIT_COLORS, wardrobe)}
            value={look.outfitColor}
            onPick={(outfitColor) => setLook({ ...look, outfitColor })}
          />
        </section>
        <section>
          <h3>Swimsuit</h3>
          <Tiles
            label="Swimsuit"
            tiles="swim"
            options={SWIMSUITS}
            value={swim.style}
            onPick={(style) => setSwim({ ...swim, style })}
          />
          <Swatches
            label="Swimsuit color"
            options={wearable(OUTFIT_COLORS, wardrobe)}
            value={swim.color}
            onPick={(color) => setSwim({ ...swim, color })}
          />
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
    ),
  };
  return (
    <>
      <div className="mirror-tabs" role="tablist" aria-label="Closet">
        {MIRROR_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`mirror-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="mirror-panel"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        id="mirror-panel"
        className="mirror-panel"
        role="tabpanel"
        aria-labelledby={`mirror-tab-${tab}`}
      >
        {tabs[tab]}
      </div>
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
  onBuy,
  body,
  setBody,
  onRide,
  onPlayGame,
  onCityTravel,
  muted,
  setMuted,
  mood,
  setMood,
  dance,
  setDance,
  holds,
  setHolds,
  effects,
  setEffects,
  view,
  setView,
  panelOpen,
  setPanelOpen,
  challenges,
  car,
  setCar,
  onSpend,
  garage,
  onBuyCar,
  records,
  onBuyRecord,
}: {
  room: RoomId;
  roomName: string;
  look: Look;
  setLook: (look: Look) => void;
  swim: SwimLook;
  setSwim: (swim: SwimLook) => void;
  coins: number;
  wardrobe: readonly string[];
  onBuy: (id: string, store?: ShopId, day?: number) => PurchaseResult;
  body: BodyShape;
  setBody: (body: BodyShape) => void;
  onRide: () => void;
  onPlayGame: (game: MinigameId) => void;
  /** Fast travel within the city, from the city map. */
  onCityTravel: (spawn: Spawn) => void;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  mood: Mood;
  setMood: (mood: Mood) => void;
  dance: DanceMoveId;
  setDance: (move: DanceMoveId) => void;
  holds: Holds;
  setHolds: (holds: Holds) => void;
  effects: Intensity;
  setEffects: (effects: Intensity) => void;
  view: View;
  setView: (view: View) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  challenges: ChallengeSave;
  /** Your car in the city, and its picker's changes. */
  car: ParkedCar;
  setCar: (car: ParkedCar) => void;
  /** Takes coins for a purchase; false when there aren't enough. */
  onSpend: (price: number) => boolean;
  /** The road cars you own, and buying one at the dealership. */
  garage: readonly string[];
  onBuyCar: (id: string) => void;
  /** Records you own, and buying one at Vinyl Vault. */
  records: readonly string[];
  onBuyRecord: (id: string) => void;
}) {
  const neighborhood = useNeighborhood();
  const [phone, setPhone] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  // skates come off indoors, where rolling isn't allowed
  const { on: skating } = skates.use();
  useEffect(() => {
    if (!SKATE_ROOMS.has(room)) setSkates(false);
  }, [room]);
  // the bus stop's map board asks for the map from inside the world
  const mapRequested = useCityMapRequest();
  useEffect(() => {
    if (!mapRequested) return;
    clearCityMapRequest();
    setMapOpen(true);
  }, [mapRequested]);
  const [tab, setTab] = useState<MirrorTab>("face");
  // the creator frames the doll for the tab: close on the face for face and
  // makeup, the full look for the rest; closing it restores the old view
  const before = useRef<View | null>(null);
  useEffect(() => {
    if (panelOpen) {
      before.current ??= view;
      setView(tab === "face" || tab === "makeup" ? "face" : "full");
    } else if (before.current) {
      setView(before.current);
      before.current = null;
    }
  }, [panelOpen, tab]);
  return (
    <>
      <header className="venue">
        <div aria-live="polite" aria-atomic="true">
          <h1 className="venue-name">
            {room === "city" ? NEIGHBORHOOD_NAMES[neighborhood] : roomName}
          </h1>
        </div>
        <p className="venue-sub">{ROOM_HINTS[room]}</p>
        {room === "city" && <FireworksTicker />}
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
          tab={tab}
          setTab={setTab}
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

      <ShopPanel
        coins={coins}
        wardrobe={wardrobe}
        look={look}
        setLook={setLook}
        onBuy={onBuy}
      />
      <RoomPanel room={room} />
      {room === "city" && <FuelStop coins={coins} onSpend={onSpend} />}
      {room === "vinyl-vault" && (
        <RecordsPanel coins={coins} records={records} onBuy={onBuyRecord} />
      )}
      {room === "dealership" && (
        <DealershipPanel coins={coins} garage={garage} onBuy={onBuyCar} />
      )}
      {room === "piercing" && (
        <PiercingPanel
          look={look}
          setLook={setLook}
          wardrobe={wardrobe}
          onBuy={onBuy}
        />
      )}
      {room === "pulse" && <DanceOffHud dancing={mood === "dance"} />}

      {mapOpen && room === "city" && (
        <CityMap
          onGo={(spawn) => {
            setMapOpen(false);
            onCityTravel(spawn);
          }}
          onClose={() => setMapOpen(false)}
          challenges={challenges}
        />
      )}
      <div className="dock">
        {mood === "dance" && <DancePicker move={dance} onPick={setDance} />}
        {(mood === "pose" || mood === "sit") && (
          <HoldPicker
            kind={mood}
            hold={holds[mood]}
            onPick={(id) => setHolds({ ...holds, [mood]: id })}
          />
        )}
        <div className="dock-actions" role="group" aria-label="Room actions">
          <button
            type="button"
            className="drink"
            aria-pressed={!muted}
            onClick={() => setMuted(!muted)}
          >
            {muted ? "Sound off" : "Sound on"}
          </button>
          <button
            type="button"
            className="drink"
            onClick={() =>
              takePhoto(
                room === "city" ? NEIGHBORHOOD_NAMES[neighborhood] : roomName,
              )
            }
          >
            Take a photo
          </button>
          {SKATE_ROOMS.has(room) && (
            <button
              type="button"
              className="drink"
              aria-pressed={skating}
              onClick={() => setSkates(!skating)}
            >
              {skating ? "Take off skates" : "Put on skates"}
            </button>
          )}
          {room === "city" && (
            <button
              type="button"
              className="drink"
              onClick={() => setMapOpen(true)}
            >
              City map
            </button>
          )}
          {room === "apartment" && <RecordPlayer records={records} />}
          {room === "city" && (
            <CarPicker car={car} garage={garage} onChange={setCar} />
          )}
          {(seatsIn(room).length > 0 || room === "apartment") && (
            <button
              type="button"
              className="drink"
              onClick={() => (seatRequest.nearest = true)}
            >
              Take a seat
            </button>
          )}
          {room === "water-park" && (
            <button type="button" className="ride" onClick={onRide}>
              <RideIcon />
              Ride a slide
            </button>
          )}
          {(room === "velvet-room" ||
            room === "back-room" ||
            room === "tiki-bar" ||
            room === "hotel-rooftop") && (
            <button
              type="button"
              className="drink"
              onClick={() => drink("cocktail")}
            >
              <CocktailIcon />
              Have a drink
            </button>
          )}
          {room === "market" && (
            <>
              <button
                type="button"
                className="drink"
                onClick={() => {
                  if (onSpend(PRICES.snack)) relieve("food");
                }}
              >
                Buy a snack ({PRICES.snack} coins)
              </button>
              <button
                type="button"
                className="drink"
                onClick={() => {
                  if (onSpend(PRICES.water)) relieve("drink");
                }}
              >
                Buy a water ({PRICES.water} coins)
              </button>
            </>
          )}
          {room === "green-haze" && (
            <>
              <button
                type="button"
                className="drink"
                onClick={() => takeHit("joint")}
              >
                Light a joint
              </button>
              <button
                type="button"
                className="drink"
                onClick={() => takeHit("edible")}
              >
                Eat an edible
              </button>
              <button type="button" className="drink" onClick={sipTea}>
                Sip shroom tea
              </button>
            </>
          )}
          <VenueGames room={room} onPlay={onPlayGame} />
          {room === "thrift-temple" && (
            <button
              type="button"
              className="drink"
              onClick={() => openShop("thrift", "Thrift Temple")}
            >
              Shop at Thrift Temple
            </button>
          )}
          {room === "salon" && (
            <button
              type="button"
              className="drink"
              onClick={() => openShop("salon", "The Blowout Bar")}
            >
              Shop at the Blowout Bar
            </button>
          )}
          {room === "galleria" && (
            <nav className="venue-games" aria-label="Shops in this mall">
              {GALLERIA_STORES.map((store) =>
                store.shop ? (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() =>
                      store.shop && openShop(store.shop, store.name)
                    }
                  >
                    Shop at {store.name}
                  </button>
                ) : null,
              )}
            </nav>
          )}
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
