// The 2D HUD over the 3D world: the venue header and hint, coins, the closet
// (the Mirror tabs), shop and game panels, the city map, the phone, and the
// dock of room actions, moods and camera views. Room-specific buttons are
// switched on by room id here. Opening the closet reframes the camera and
// restores the old view on close.

import { byTier } from "../../game/age.ts";
import type { ClosetSave } from "../../game/closet.ts";
import type { ShiftsSave } from "../../game/shifts.ts";
import type { Progression } from "../../game/progression/progression.ts";
import { ProgressionHud, LadderPanel } from "./Progression.tsx";
import { ActionDock, DockAction } from "./ActionDock.tsx";
import { LazyPanel } from "./ReloadBoundary.tsx";
import { ClubNightTicker } from "./EventCalendar.tsx";
import { InviteButton } from "../net/InviteButton.tsx";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { type Look, type Mood, type SwimLook } from "../../game/look.ts";
import type { DanceMoveId, Holds } from "../../game/dance/moves.ts";
import { type Intensity } from "../../game/effects/buzz.ts";
import type { Graphics } from "../../game/graphics.ts";
import { CarPicker } from "../city/CarPicker.tsx";
import { driving } from "../world/driving.ts";
import { collectionsBook } from "./Collections.tsx";
import { openStreak } from "./Streak.tsx";
import { GameMenu, closeMenu } from "./GameMenu.tsx";
import type { CrimeSave } from "../../game/crime/record.ts";
import type { Caught } from "./ShopliftPanel.tsx";
import { VendingPanel } from "../vending/VendingPanel.tsx";
import { GasMartPanel } from "../inventory/GasMartPanel.tsx";
import { PouchPanel } from "../inventory/PouchPanel.tsx";
import { WeedShopPanel } from "../inventory/WeedShopPanel.tsx";
import { TaxiPanel } from "../city/TaxiPanel.tsx";
import { driverSays, taxiRide } from "../city/taxiStore.ts";
import { fareFor, planRoute, routeLength } from "../../game/city/taxi.ts";
import { FuelStop } from "../city/FuelStop.tsx";
import { SmokingPrompt } from "../city/SmokingPrompt.tsx";
import type { ParkedCar } from "../../game/city/drive.ts";
import type { RoomId, Spawn } from "../../game/rooms.ts";
import { type BodyShape } from "../../game/body.ts";
import { type PurchaseResult, type ShopId } from "../../game/shop.ts";
import { drink } from "../effects/drunk.ts";
import { consumeFood } from "../food/store.ts";
import { PRICES } from "../../game/market.ts";
import { take } from "../effects/high.ts";
import type { MinigameId } from "../../game/hotspots.ts";
import { VIEWS, type View } from "../world/CameraRig.tsx";
import { clearCityMapRequest, useCityMapRequest } from "./cityMapRequest.ts";
import { RoomPanel } from "./RoomPanels.tsx";
import { ShopPanel } from "./ShopPanel.tsx";
import { setSkates, skates, SKATE_ROOMS } from "../world/skates.ts";
import { openShop } from "./shopRequest.ts";
import { takePhoto } from "../world/Photo.tsx";
import { STORES as GALLERIA_STORES } from "../../game/galleria.ts";
import { CocktailIcon, RideIcon } from "./icons.tsx";
import { DancePicker, HoldPicker } from "./DancePicker.tsx";
import type { ChallengeSave } from "../../game/challenges.ts";
import { PRIDE_CLUBS } from "../../game/prideNight.ts";
import { PrideTicker } from "./PrideTicker.tsx";
import { Dressing } from "./Dressing.tsx";
import type { MirrorTab } from "./MirrorPanel.tsx";

import { seatsIn } from "../../game/seats.ts";
import { seatRequest } from "../world/Seats.tsx";
import { NEIGHBORHOOD_NAMES, useNeighborhood } from "../city/here.ts";
import { FoodHud } from "./phone/FoodHud.tsx";
import { Segmented } from "./controls.tsx";
import { VenueGames } from "./Minigames.tsx";
import { friends } from "../net/friends.ts";
import { ONLINE } from "../net/online.ts";

// Panels only some rooms show, loaded with first use so the first load stays
// small; each renders inside a Suspense that shows nothing meanwhile.
const ElPanel = lazy(() =>
  import("../city/ElPanel.tsx").then((m) => ({ default: m.ElPanel })),
);
const VolleyStop = lazy(() =>
  import("../city/VolleyStop.tsx").then((m) => ({ default: m.VolleyStop })),
);
const ParkPanel = lazy(() =>
  import("../city/ParkPanel.tsx").then((m) => ({ default: m.ParkPanel })),
);
const BandPanel = lazy(() =>
  import("../city/BandPanel.tsx").then((m) => ({ default: m.BandPanel })),
);
const BusPanel = lazy(() =>
  import("../city/BusPanel.tsx").then((m) => ({ default: m.BusPanel })),
);
const FoodVendorPanel = lazy(() =>
  import("../city/FoodVendorPanel.tsx").then((m) => ({
    default: m.FoodVendorPanel,
  })),
);
const DealershipPanel = lazy(() =>
  import("../city/DealershipPanel.tsx").then((m) => ({
    default: m.DealershipPanel,
  })),
);
const RecordPlayer = lazy(() =>
  import("../city/RecordsPanel.tsx").then((m) => ({ default: m.RecordPlayer })),
);
const RecordsPanel = lazy(() =>
  import("../city/RecordsPanel.tsx").then((m) => ({ default: m.RecordsPanel })),
);
const PiercingPanel = lazy(() =>
  import("./PiercingPanel.tsx").then((m) => ({ default: m.PiercingPanel })),
);
const DanceOffHud = lazy(() =>
  import("../rooms/pulse/DanceOffHud.tsx").then((m) => ({
    default: m.DanceOffHud,
  })),
);
const CityMap = lazy(() =>
  import("./CityMap.tsx").then((m) => ({ default: m.CityMap })),
);
const DeliveryApp = lazy(() =>
  import("./phone/DeliveryApp.tsx").then((m) => ({ default: m.DeliveryApp })),
);
const Mirror = lazy(() =>
  import("./MirrorPanel.tsx").then((m) => ({ default: m.Mirror })),
);

// Sit and lean need furniture, so the player only picks these.
const PLAYER_MOODS: readonly { id: Mood; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "pose", label: "Pose" },
  { id: "dance", label: "Dance" },
];

const ROOM_HINTS: Record<RoomId, string> = {
  pottery:
    "Clay Day · Throw a pot, choose a glaze, and fire a piece for your apartment.",
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
    "Jade Whisk and Pearl Ledger. Tap the server for a drink and sip it, or work the boba bar yourself.",
  "ube-bakery": "Purple Pandesal. Tap the baker for a treat, then eat it.",
  speedway: "Pit lane. Tap a spot to race or ride the bumper cars.",
  city: "The city after dark. Tap the street or use WASD, walk into a lit door, or head south to the beach.",
  apartment:
    "Your flat. Use the decorating panel to place furniture and lock the door. Tap the blue shelf to practice pocketing before you try a real shop.",
  "haunted-house":
    "The Haunted House. Find your way through the dark rooms past the ghosts, then back out to the park.",
  gridiron:
    "The Gridiron. Kick five field goals, each from further out: aim into the wind, then put your leg into it.",
  "driving-range":
    "Skyline Driving Range. Get a bucket of ten: set your backswing, strike it pure, and land them on the greens.",
  salon:
    "The Blowout Bar. Book with Dani for the salon's colors, take a chair by the mirrors, or work the nail station.",
  "video-store":
    "Rewind Video. Browse the tapes and the new releases, then play Throwback Trivia at Tasha's counter.",
  "back-room": byTier(
    "The Back Room. A speakeasy behind an unmarked door: order a drink from Odette, then take a stool or a leather booth.",
    "The Back Room. A hidden lounge behind an unmarked door: order a mocktail from Odette, then take a stool or a leather booth.",
  ),
  "wine-bar": byTier(
    "Cellar 214. A glass at the bar or a barrel table, or let Inès hand you the bottle: pour a flight of five to the line.",
    "Cellar 214. A sparkling juice at the bar or a barrel table, or let Inès hand you the bottle: pour a flight of five to the line.",
  ),
  "drive-in":
    "The Starlite Drive-In. Moon Girls is playing on the big screen: grab a picnic bench, or order from Dot at the window.",
  "boardwalk-arcade":
    "The Boardwalk Arcade. Roll nine balls of Skee-Ball up the middle lane: stop the aim, then the power. Firm and straight for the 50.",
  farm: "Sunny Acres Farm. Plant seeds, water the plots, harvest crops and sell fresh produce at the farm stand, or visit the animals in the pasture.",
  forest:
    "Larkspur Forest Trail. Follow the dirt path north through the woods, over the creek and up to the lookout. Deer, a fox and rabbits roam the clearings; tap a hiker to chat.",
  garden:
    "Suburbia Community Garden. Claim a raised bed, plant seeds, water thirsty soil, and harvest fresh produce with your neighbors.",
  "surf-shack":
    "Swell Surf Co. Grab a beach chair, or paddle out and ride a wave: lean to stay in the pocket, trick when you're charged.",
  gallery:
    "Gallery 44. Walk the show, sit on the bench, or paint at the easel: hang your piece and it stays on the open wall.",
  patisserie:
    "Sucre. Take a table under the chandelier, or build a macaron tower on the marble stand: drop each one dead over the last.",
  florist:
    "Petal & Stem. Pick stems from the buckets, choose a wrap and ribbon, and take a bouquet home for your apartment vase.",
  bookshop:
    "Dog-Ear Books. Browse the stacks, curl up in a wingback by the fire, and say hello to Marmalade asleep on the counter.",
  "hotel-rooftop":
    "The Marquise Rooftop. Swimsuits on, forty floors up: lie out on a lounger, sink into the hot tub, or get a drink from Simone at the pool bar.",
  "espresso-lab":
    "Espresso Lab. Grab a table, or take a shift at the barista station: build each ticket's drink from the recipe card, fast for tips.",
  "thrift-temple":
    "Thrift Temple. Tap Juno at the counter for vintage dyes and today's find on the pedestal, half the boutique's price.",
  "tiki-bar": byTier(
    "The Coconut Grove. Order something with an umbrella from Malia, take a stool or a lounge by the fire, and watch the sun go down.",
    "The Coconut Grove. Order a coconut mocktail with an umbrella from Malia, take a stool or a lounge by the fire, and watch the sun go down.",
  ),
  "vinyl-vault":
    "Vinyl Vault. Dig the crates, play a sample of any record and buy the ones you love for the record player at home.",
  "jazz-club":
    "The Midnight Horn. A four-piece band plays under the spotlight; take a candlelit table or a stool at the bar.",
  dealership:
    "Daydaze Motors. Every road car turns on its own turntable: buy one from the price list and it waits at the curb.",
  zoo: "The Daydaze Zoo. Stroll the paths past giraffes and zebras, elephants, lions and tigers, a bear and an elk, penguins and flamingos, or start a safari photo hunt or feeding time.",
  "music-studio":
    "Loft Studios. Walk up to the piano, the drums, the marimba or the floor piano and play: tap the notes or press 1 to 8.",
  paintball:
    "Splat City. Gear up for sixty seconds of speedball: mark rivals when they lean out of their bunkers, and stay behind yours.",
  market: byTier(
    "Skyline Supply. Wander the aisles, then grab a snack or a water at Rosa's till: either takes the edge off a buzz.",
    "Skyline Supply. Wander the aisles, then grab a snack or a water at Rosa's till.",
  ),
  "laser-tag":
    "Photon Zone. Suit up for a 60-second round: tag rivals when they pop out of cover, and keep cover between you when they fire.",
  "green-haze":
    "Green Haze, 18+. Light up, try an edible or sip shroom tea at the counter, then sink into a couch.",
  piercing:
    "Ink & Needle. Pick a spot and a piece of fine jewelry at the counter; Vix does the rest.",
  museum:
    "Museo ng Little Manila. Walk the hall, or pick an exhibit from the guide to read its plaque: the bahay kubo, the jeepney, the parol and more.",
  bistro: byTier(
    "Bistro Rue Vert. Tap Élodie at the zinc for steak frites, onion soup or a kir royale.",
    "Bistro Rue Vert. Tap Élodie at the zinc for steak frites, onion soup or a cassis soda.",
  ),
  lune: "Lune Tasting Room. Take a free chair at a table for two, and tap Margot at the pass for the next course.",
  "sushi-bar":
    "Belt Sushi Yard. Tap Aiko to order, or play Sushi Catch: grab plates off the belt.",
  "ramen-shop":
    "Steam Ladle Ramen. Tap Ren for a bowl, or work the counter yourself in Ramen Rush.",
  "halo-halo-cafe":
    "Halo-Halo Haus. Tap Joy at the counter for halo-halo, ube or leche flan, or work the counter yourself.",
  "skate-diner":
    "Skate-Up Drive-In Diner. Tap Dottie at the pass to order, grab a booth or a stool, and mind the servers gliding by on skates.",
  "mermaid-cove":
    "Mermaid Cove. The mermaids sing on the shells at the waterline: sing it back, one note longer each round. Or sit on a log and watch them swim.",
  catwalk:
    "The Catwalk. Walk the runway for the judges: strut, pose and twirl as each cue's ring closes.",
  "open-water":
    "Seaside Swim. Wade in and swim out among the fish: click the water to swim there. Rent scuba gear at the dive shack, then swim into the red buoy to dive.",
  "reef-dive":
    "The reef. Swim toward the sea life to spot it: find five kinds for a prize, and explore the wreck. Watch your air, and take the ladder up when it runs low.",
  courtside:
    "The Courtside Club. Play seven points against the club pro: swing as the ball reaches you, and a perfect swing deep in a rally is a winner.",
  marina:
    "Starboard Marina. Fish off the end of the long dock: cast out, then strike the moment the bobber dips. Coral pours at the yacht club.",
  yacht:
    "The Starlight. Dance under the string lights, chat with the captain, grab a mocktail from Mia, or relax in the hot tub as the yacht loops the bay.",
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
  orbit:
    "Orbit 9, a club on a space station. Dance under the window, sip a soda at the bar, play Bassline at the decks or Star Siege on the cabinet, and tap the DJ for a request.",
  "arcade-bar": byTier(
    "Player 2, the arcade bar. Step up to a lit cabinet to play, or try Last Call at the bar. Kit pours.",
    "Player 2, the arcade bar. Step up to a lit cabinet to play, or try Last Call at the bar. Kit pours the sodas.",
  ),
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
    "Park Ice Rink. Glide onto the ice, skate the ice show for the judges or throw a curling end, then warm up with cocoa by the door.",
  aquarium:
    "Uptown Aquarium. Walk the shark tunnel, watch the jellyfish, count fish at the reef in Reef Spotter, and say hi at the desk.",
  jail: "City Jail. Wait out the sentence, play cards with the guard, or talk to Officer Dee.",
};

/**
 * Everything drawn over the canvas for the current room. All game state is
 * owned by the caller and passed in with its setters; the overlay keeps only UI
 * state (phone, map, closet tab).
 */
export function Overlay({
  room,
  roomName,
  look,
  setLook,
  swim,
  setSwim,
  coins,
  progression,
  shifts,
  onTitle,
  wardrobe,
  onBuy,
  crime,
  onSteal,
  onCaught,
  body,
  setBody,
  closet,
  setCloset,
  onRide,
  onPlayGame,
  onCityTravel,
  muted,
  graphics,
  setGraphics,
  setMuted,
  mood,
  setMood,
  dance,
  setDance,
  holds,
  setHolds,
  effects,
  setEffects,
  highAudio = true,
  setHighAudio,
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
  progression: Progression;
  shifts: ShiftsSave;
  onTitle: (title: string | null) => void;
  wardrobe: readonly string[];
  onBuy: (id: string, store?: ShopId, day?: number) => PurchaseResult;
  crime: CrimeSave;
  onSteal: (id: string, storeId: string) => void;
  onCaught: (caught: Caught) => void;
  body: BodyShape;
  setBody: (body: BodyShape) => void;
  closet: ClosetSave;
  setCloset: (closet: ClosetSave) => void;
  onRide: () => void;
  onPlayGame: (game: MinigameId) => void;
  /** Fast travel within the city, from the city map. */
  onCityTravel: (spawn: Spawn) => void;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  graphics: Graphics;
  setGraphics: (graphics: Graphics) => void;
  mood: Mood;
  setMood: (mood: Mood) => void;
  dance: DanceMoveId;
  setDance: (move: DanceMoveId) => void;
  holds: Holds;
  setHolds: (holds: Holds) => void;
  effects: Intensity;
  setEffects: (effects: Intensity) => void;
  highAudio?: boolean;
  setHighAudio?: ((highAudio: boolean) => void) | undefined;
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
  // in a taxi the map picks the destination and prices each one
  const taxi = taxiRide.use();
  // sitting in the cab: no driving your own car or taking a seat
  const inCab = taxi.phase === "choosing" || taxi.phase === "riding";
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
  // the closet loads the first time it opens (the drawer is always mounted)
  const [closetOpened, setClosetOpened] = useState(false);
  if (panelOpen && !closetOpened) setClosetOpened(true);
  // the creator frames the doll for the tab: close on the face for face and
  // makeup, the full look for the rest; closing it restores the old view
  const before = useRef<View | null>(null);
  // the view as of now, remembered when the closet opens (the effect below
  // runs on opening and tab changes, not on every view change)
  const viewNow = useRef(view);
  useEffect(() => {
    viewNow.current = view;
  }, [view]);
  useEffect(() => {
    if (panelOpen) {
      before.current ??= viewNow.current;
      setView(tab === "face" || tab === "makeup" ? "face" : "full");
    } else if (before.current) {
      setView(before.current);
      before.current = null;
    }
  }, [panelOpen, tab, setView]);
  return (
    <>
      <header className="venue">
        <div aria-live="polite" aria-atomic="true">
          <h1 className="venue-name">
            {room === "city" ? NEIGHBORHOOD_NAMES[neighborhood] : roomName}
          </h1>
        </div>
        <p className="venue-sub" key={room}>
          {ROOM_HINTS[room]}
        </p>
        {PRIDE_CLUBS.has(room) && <PrideTicker />}
        <ClubNightTicker room={room} />
        <p className="coins" aria-label={`${coins} coins`}>
          {coins} coins
        </p>
        <ProgressionHud progression={progression} />
      </header>

      {phone && (
        <LazyPanel onContinue={() => setPhone(false)}>
          <DeliveryApp onClose={() => setPhone(false)} />
        </LazyPanel>
      )}
      <FoodHud />

      <Dressing open={panelOpen} onOpenChange={setPanelOpen}>
        {closetOpened && (
          // a failed download shows the Reload card; the drawer stays closable
          <LazyPanel>
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
              closet={closet}
              setCloset={setCloset}
              effects={effects}
              setEffects={setEffects}
              highAudio={highAudio}
              setHighAudio={setHighAudio}
            />
          </LazyPanel>
        )}
      </Dressing>

      <ShopPanel
        coins={coins}
        wardrobe={wardrobe}
        look={look}
        setLook={setLook}
        onBuy={onBuy}
        crime={crime}
        onSteal={onSteal}
        onCaught={onCaught}
      />
      <RoomPanel room={room} />
      {room === "city" && <FuelStop coins={coins} onSpend={onSpend} />}
      {room === "city" && (
        <>
          <LazyPanel>
            <VolleyStop />
          </LazyPanel>
          <LazyPanel>
            <ParkPanel />
          </LazyPanel>
          <LazyPanel>
            <BandPanel />
          </LazyPanel>
          <LazyPanel>
            <BusPanel />
          </LazyPanel>
          <LazyPanel>
            <FoodVendorPanel coins={coins} onSpend={onSpend} />
          </LazyPanel>
        </>
      )}
      <VendingPanel coins={coins} onSpend={onSpend} />
      <PouchPanel />
      <SmokingPrompt room={room} />
      {room === "city" && <GasMartPanel />}
      {room === "green-haze" && (
        <WeedShopPanel shop="dispensary" title="Dispensary" />
      )}
      <Suspense fallback={null}>
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
        {taxi.phase === "choosing" && room === "city" && (
          <CityMap
            fareTo={(spawn) =>
              fareFor(routeLength(planRoute(taxi.from, spawn.position)))
            }
            onGo={(spawn) => {
              const fare = fareFor(
                routeLength(planRoute(taxi.from, spawn.position)),
              );
              if (onSpend(fare)) taxiRide.set({ fare, request: { go: spawn } });
              else driverSays("action-leaving-without-paying");
            }}
            onClose={() => taxiRide.set({ request: "cancel" })}
            challenges={challenges}
          />
        )}
      </Suspense>
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
          <ActionDock>
            {room === "city" && (
              <Suspense fallback={null}>
                <ElPanel />
              </Suspense>
            )}
            {room === "city" && <TaxiPanel />}
            {room === "city" && !inCab && (
              <DockAction
                id="drive"
                priority={2}
                label="Drive your car"
                onClick={() => (driving.request = "city-drive")}
              />
            )}
            {room === "apartment" && (
              <Suspense fallback={null}>
                <RecordPlayer records={records} />
              </Suspense>
            )}
            {!inCab && (seatsIn(room).length > 0 || room === "apartment") && (
              <DockAction
                id="seat"
                priority={3}
                label="Take a seat"
                onClick={() => (seatRequest.nearest = true)}
              />
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
              room === "hotel-rooftop" ||
              room === "drive-in" ||
              room === "wine-bar" ||
              room === "yacht") && (
              <button
                type="button"
                className="drink"
                onClick={() => drink("cocktail")}
              >
                <CocktailIcon />
                {byTier("Have a drink", "Have a mocktail")}
              </button>
            )}
            {room === "market" && (
              <>
                <button
                  type="button"
                  className="drink"
                  onClick={() => {
                    if (onSpend(PRICES.snack)) consumeFood("food");
                  }}
                >
                  Buy a snack ({PRICES.snack} coins)
                </button>
                <button
                  type="button"
                  className="drink"
                  onClick={() => {
                    if (onSpend(PRICES.water)) consumeFood("drink");
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
                  onClick={() => take("joint")}
                >
                  Light a joint
                </button>
                <button
                  type="button"
                  className="drink"
                  onClick={() => take("edible")}
                >
                  Eat an edible
                </button>
                <button
                  type="button"
                  className="drink"
                  onClick={() => take("tea")}
                >
                  Sip shroom tea
                </button>
                <button
                  type="button"
                  className="drink"
                  onClick={() => take("tab")}
                >
                  Drop a tab
                </button>
                <button
                  type="button"
                  className="drink"
                  onClick={() => take("pill")}
                >
                  Pop a molly
                </button>
                <button
                  type="button"
                  className="drink"
                  onClick={() => take("line")}
                >
                  Do a line
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
          </ActionDock>
        </div>
        <div className="dock-modes">
          <Segmented
            className="moods"
            label="Mood"
            value={mood}
            onPick={setMood}
            options={PLAYER_MOODS}
          />
          <GameMenu graphics={graphics} setGraphics={setGraphics}>
            <LadderPanel
              progression={progression}
              shifts={shifts}
              onTitle={onTitle}
            />
            <div className="game-menu-items" role="group" aria-label="Game">
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
                onClick={() => {
                  closeMenu();
                  takePhoto(
                    room === "city"
                      ? NEIGHBORHOOD_NAMES[neighborhood]
                      : roomName,
                  );
                }}
              >
                Take a photo
              </button>
              {room === "city" && (
                <button
                  type="button"
                  className="drink"
                  onClick={() => {
                    closeMenu();
                    setMapOpen(true);
                  }}
                >
                  City map
                </button>
              )}
              <button
                type="button"
                className="drink"
                aria-haspopup="dialog"
                onClick={() => {
                  closeMenu();
                  setPhone(true);
                }}
              >
                Plate Rush
              </button>
              <button
                type="button"
                className="drink"
                aria-haspopup="dialog"
                onClick={() => {
                  closeMenu();
                  collectionsBook.set({ open: true });
                }}
              >
                Collections
              </button>
              <button
                type="button"
                className="drink"
                aria-haspopup="dialog"
                onClick={() => {
                  closeMenu();
                  openStreak();
                }}
              >
                Daily streak
              </button>
              {ONLINE && (
                <button
                  type="button"
                  className="drink"
                  onClick={() => {
                    closeMenu();
                    friends.set({ open: !friends.get().open });
                  }}
                >
                  Friends
                </button>
              )}
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
            </div>
            <InviteButton />
            {room === "city" && (
              <CarPicker car={car} garage={garage} onChange={setCar} />
            )}
            <Segmented
              className="views"
              label="Camera"
              value={view}
              onPick={setView}
              options={VIEWS}
            />
          </GameMenu>
        </div>
      </div>
    </>
  );
}
