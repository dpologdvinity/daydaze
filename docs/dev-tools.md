# Dev tools

An in-game panel for testing, debugging and poking around the game while it
runs. It only exists in development (`npm run dev`); production builds
leave it out entirely.

![The dev panel over the Plaza at night, with a wall picked and outlined in yellow](screenshots/dev-panel.png)

## Open it

1. Run `npm run dev` and open `http://localhost:5173`.
2. Press `` ` `` (the backquote key, left of `1`). Press it again to hide the
   panel.

The panel remembers whether it's open, which sections are folded, where you
dragged it and the view switches, across reloads. To reset it, run
`localStorage.removeItem("daydaze:dev-panel")` in the console and reload.

- **Move it:** drag the readout lines at the top. Click **re-center** to put
  it back.
- **Fold a section:** click its title (`▾ go`, `▾ view`, and so on).

## The readout

The three lines at the top refresh twice a second:

- **fps · calls · tris:** frames per second, draw calls and triangles in the
  last frame. The low-tier budget is under 250 calls and 300k triangles.
- **cam:** the camera's position.
- **geo · tex · lights · objects:** geometries and textures in GPU memory,
  direct lights (the low tier allows 4; ambient and hemisphere fills don't
  count) and every object in the scene graph.

Geometry and texture counts that climb room after room point to a leak.

## Sections

### go

| Control       | What it does                                                                           |
| ------------- | -------------------------------------------------------------------------------------- |
| room          | Jumps to any room, by the same path doors use. 18+ rooms need `?adult=1`.              |
| game          | Opens a minigame directly.                                                             |
| event night   | Skips the club-night clock to a minute into that night's next run, so it's on now.     |
| start event   | Skips fireworks, the parade, Pride night or a dance-off to its next start.             |
| hour          | Moves the city's clock live: sky, light, neon, the band. **real clock** lets go.       |
| teleport here | Puts your doll where the middle of the view meets the floor, inside the walkable area. |

Event skips move that event's clock forward, so its later countdowns stay
shifted until you reload. The hour slider changes the city only; indoor rooms
light themselves.

### view

| Control     | What it does                                                                               |
| ----------- | ------------------------------------------------------------------------------------------ |
| wireframe   | Draws every material as wireframe, including meshes that stream in later.                  |
| free cam    | Swaps the game camera for orbit controls: drag to orbit, right-drag to pan, wheel to zoom. |
| grid + axes | A 100 m grid and axes at the origin, drawn over everything (red x, green y, blue z).       |
| half res    | Renders at half resolution, to tell whether the GPU is fill-rate bound.                    |
| pause       | Stops rendering, to look at a frozen frame.                                                |
| screenshot  | Downloads a PNG of the 3D view (without the high tier's bloom).                            |
| cam         | Live overview camera override input, `pin` current camera, and `clear` to reset.           |

### game

Adds 100 or 1000 coins (saved for real), logs the save to the console as
`$save`, or copies it as JSON.

### render

Exposure, fog on or off, and the field of view. The game camera sets its own
field of view, so the slider only holds with free cam on. Every light in the
scene is listed with a switch, a color and an intensity.

### scene

The live scene graph, folded. Click `▸` to open a node, click a name to
inspect it. The search box matches names and types (`PointLight`, `Mesh`,
`floor`) across the whole scene.

### inspect

What you picked, by shift+click in the 3D view or a click in the scene tree.
It's outlined in yellow, and the outline follows it.

- **position, rotation (degrees), scale:** type or step to move it live. For
  one instance of an instanced mesh (a city tower, a tree), only that
  instance moves.
- **visible:** hide or show it.
- **look at:** turns on free cam and orbits the selection.
- **copy JSX:** copies `position={[…]} rotation={[…]} scale={[…]}` (rotation
  in radians) to paste into a component.
- **log as $sel:** puts the object in the console as `$sel`.
- **material:** color, emissive, roughness, metalness and opacity. Materials
  are often shared, so an edit changes every mesh that uses it.

Shift+click on empty sky clears the selection. Every edit is lost on a room
change or reload; copy what you want to keep into the source.

### network

Appears once online play (`?online=1`) sends or receives anything. It shows
message counts by type and the last few messages, without the constant
`update` and `delta` movement stream.

## In the console

| Handle                                | What it is                                                       |
| ------------------------------------- | ---------------------------------------------------------------- |
| `__dd.scene`, `__dd.gl`, `__dd.THREE` | The live scene, renderer and three.js.                           |
| `__dd.get()`                          | R3F's state: `camera`, `controls`, `raycaster`, `size` and more. |
| `__dd.player`                         | Your doll's state; `__dd.player.pos` is where she stands.        |
| `__dd.pick`                           | The last shift+clicked object.                                   |
| `__dd.cam`                            | Active overview camera override string (`ex,ey,ez,lx,ly,lz`).    |
| `__dd.setCam(...)`, `__dd.clearCam()` | Set live overview camera override (string, array or object).     |
| `__dd.pinCam()`                       | Pin active overview camera override to current view.             |
| `$sel`, `$save`                       | Set by the inspector's and game section's log buttons.           |
| `__ddNet`                             | Every online frame logged (the last 300).                        |

For example, `__dd.scene.getObjectByName("floor")` or
`__dd.gl.info.render`.

With `?debug=1` (any build), test handles sit on `window`:
`daydazeReact("trip-fall")` plays a reaction on your doll (`reaction.ts`). In
the city, `daydazeStepOut(5)` puts you in the lane 5 m ahead of the fastest
traffic car near you, too close for it to stop (`Traffic.tsx`; false when
none is moving; `daydazeStepOut(5, true)` only asks), and `daydazeKnockWalker(9)` has the walker nearest you hit
as by your car at 9 m/s (`CarHits.tsx`; her index, or -1). The canvas then
shows `data-car-hit` (the outcome), `data-walker-hit` (her index) and
`data-heat` (police heat, `world/heat.ts`).

## URL flags

These work in any build, without the panel:

| Flag                                                                                       | What it does                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `?room=<id>`                                                                               | Start in a room (ids in `src/game/rooms.ts`).                                                                                                                    |
| `?at=x,z&yaw=r`                                                                            | Start at a spot in that room.                                                                                                                                    |
| `?spot=<building-id>`                                                                      | Start in the city in front of that building, back to its door so `view=full` frames it (ids in `src/game/city/layout.ts`; `spots.ts`). `&yaw=r` still turns you. |
| `?view=room\|full\|face\|detail`                                                           | Start with that camera view.                                                                                                                                     |
| `?time=HH:MM`                                                                              | Pin the city's hour (and the sky in indoor windows). The city runs on New York time for every player, so `HH:MM` is New York time.                               |
| `?weather=rain\|clear`                                                                     | Force an outdoor weather state at any city hour.                                                                                                                 |
| `?night=<id>`                                                                              | Start an hour into a club night (ids in `src/game/events.ts`).                                                                                                   |
| `?fireworks=<s>`, `?parade=<s>`, `?pride=<s>`, `?danceoff=<s>`, `?heist=<s>`, `?chase=<s>` | Hold that event's clock `s` seconds into a run.                                                                                                                  |
| `?heistend=caught\|escape`                                                                 | Selects how a held preview heist ends (`eventClocks.ts`).                                                                                                        |
| `?quality=low\|high\|ultra`                                                                | Force a quality tier.                                                                                                                                            |
| `?still=1`                                                                                 | Render a few frames and stop (for screenshots).                                                                                                                  |
| `?timescale=0.1`                                                                           | Slow the player and every doll (for frame strips).                                                                                                               |
| `?debug=1`                                                                                 | Room jump buttons (used by the Playwright tests).                                                                                                                |
| `?online=1`                                                                                | Online play (needs `npm run dev:server`).                                                                                                                        |
| `?adult=1`                                                                                 | Dev-only preview of the 18+ venues.                                                                                                                              |

### Test and screenshot flags

Mostly for Playwright tests and screenshots; each holds something still or previews it.

| Flag                                           | What it does                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `?join=karaoke.3`                              | Opens straight into that room copy, online (an invite link; `flags.ts`).            |
| `?slide=0.4`                                   | Starts on the Water Park's first slide 40% of the way down (`flags.ts`).            |
| `?cam=ex,ey,ez,lx,ly,lz`                       | Pins the room's overview camera: eye, then look-at point (`CameraRig.tsx`).         |
| `?date=2026-12-25`                             | Previews the city's seasonal dressings for that date (`season.ts`).                 |
| `?band=30`                                     | Holds the band shell's clock 30 s into the day's first set (`BandShell.tsx`).       |
| `?market=1`                                    | Opens the farmers market now; `?market=0` shuts it (`FarmersMarket.tsx`).           |
| `?bays=0`                                      | Turns the New York bays off, to compare budgets (`CityScene.tsx`).                  |
| `?elat=69`                                     | Freezes the El train timetable at that second; dev builds only (`elLayout.ts`).     |
| `?elspeed=10`                                  | Runs the El timetable ten times faster (`elLayout.ts`).                             |
| `?trip=5`                                      | Brings the first sidewalk trip forward to 5 m of walking (`SidewalkTrips.tsx`).     |
| `?ride=coaster`                                | Boards that amusement park ride straight away (`AmusementPark.tsx`).                |
| `?siren=hold`                                  | Holds Mermaid Cove's first note lit (`cove/session.ts`).                            |
| `?prizehold=1`                                 | Keeps the prize card up until dismissed (`PrizeCard.tsx`).                          |
| `?programs=1`                                  | Logs every linked shader program once, for `scripts/perf-profile.ts` (`World.tsx`). |
| `?lineup=cars`                                 | Shows every roster car in the speedway paddock (`CarLineup.tsx`).                   |
| `?wrap=stripes&rims=gold&tint=smoke&glow=pink` | Mods on the `?lineup=cars` cars (`CarLineup.tsx`).                                  |

The doll lab is its own page, `/src/client/avatar/lineup.html` on the dev
server (`lineup.tsx`), with its own flags:

| Flag                                 | What it does                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `?shot=face`                         | The shot: `lineup` (default), `face`, `body`, `far`, `men`, `hairs`, `pose`, `sit`, `lay`, `dance`, `piggyback` or `together`.  |
| `?emote=kiss&at=1.5`                 | The together shot's paired emote (a `TOGETHER` id, a kiss by default) and the pair clock's pinned second (mid-kiss by default). |
| `?human=1`                           | The Blender-built 3D doll instead of the toon doll.                                                                             |
| `?men=1`                             | Face, portrait and pose shots on the masculine body.                                                                            |
| `?outfit=suit`                       | With `?men=1`, dresses the pose, sit and dance dolls in that outfit.                                                            |
| `?outfits=a,b,c`                     | Dresses the body shot's three dolls.                                                                                            |
| `?wears=tee~ff2f9a.cargos~141018,…`  | Mixed garments (`GARMENTS` ids, `id~hex` joined by `.`), one look per doll, for the body, far, pose, sit and dance shots.       |
| `?styles=a,b,c&colors=1b1014,f1d78f` | Hair styles and colors for the `hairs` shot.                                                                                    |
| `?hair=waves`                        | Swaps the face shot's hair.                                                                                                     |
| `?beard=<id>`                        | Puts a beard (a `BEARDS` id) on the face shot.                                                                                  |
| `?face=<code>`                       | Puts an `encodeFace` code on the face shot's doll.                                                                              |
| `?makeup=<code>`                     | Puts an `encodeMakeup` code on the face shot's doll.                                                                            |
| `?skin=2`                            | Picks a skin tone by its index in `SKINS`.                                                                                      |
| `?holds=a,b`                         | The held poses for the pose, sit and lay shots.                                                                                 |
| `?moves=a,b`                         | The dance shot's moves.                                                                                                         |
| `?cam=x,y,z&target=x,y,z`            | Moves the shot's camera and the point it looks at, for a close-up.                                                              |
| `?clear=1`                           | A clear background.                                                                                                             |

The minigame kit page, `/src/client/rooms/shared/game3d/kit.html`, takes
`?freeze=1`: it stops drawing two frames after the ball first lands
(`kit.tsx`).

## Screenshot tokens

`scripts/screenshots.ts` and the Screenshots workflow take a space-separated
list of tokens (the language is in `scripts/shot-plan.ts`):

| Token                                             | Shots                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `yacht`                                           | A named shot from the `SHOTS` registry in `scripts/screenshots.ts`. |
| `room=city&at=10,5&yaw=1.57&view=full&time=21:00` | Any URL flags above; named by its slug (`room-city-at-10-5-...`).   |
| `spot=pulse&view=full`                            | In front of a building.                                             |
| `all-rooms`, `all-spots`, `tour`                  | Every all-ages room; every building with a door; both.              |

A query token can also carry `name=<slug>` (the file name), `turn=N` (N
headings evenly around, named `-00` to `-NN`; needs `at=` or `spot=`) and
`w=1920&h=1080` (the viewport; add `quality=high` for docs and store pages).
An unknown name or a bad token fails the run before a browser starts.

```bash
gh workflow run screenshots.yml --ref feat/x -f shots="spot=pulse&turn=8 room=pulse&w=1920&h=1080&quality=high"
```

Each run publishes its branch's folder to the `screenshots` branch, a README
grid that renders on a phone: `tree/screenshots/main` (refreshed by every push
to `main` that touches the game), `tree/screenshots/feat-x`, and so on. From a
phone, Actions > Screenshots > Run workflow in mobile web takes new ones.

The gallery keeps only each live branch's latest shots, as JPEGs, and the
`screenshots` artifact expires after 7 days. The PNG originals of every run
(pull requests included) and every `record.yml` MP4 also go to a permanent
release on
[`dpologdvinity/daydaze-artifacts`](https://github.com/dpologdvinity/daydaze-artifacts/releases),
tagged `<screenshots|recording>-<branch>-<sha>-<run>-<attempt>`
(`scripts/archive-run.sh`). The upload needs the `ARTIFACTS_TOKEN` repo
secret; without it, the step warns and skips.

## Browser extensions

The panel registers the scene with the
[Three.js Developer Tools](https://chromewebstore.google.com/detail/threejs-developer-tools/ebpnegggocnnhleeicgljbedjkganaek)
extension, which adds a scene inspector tab to Chrome DevTools. Others that
help here:

- [Spector.js](https://spector.babylonjs.com/): captures one WebGL frame,
  every draw call, texture and shader.
- [React Developer Tools](https://react.dev/learn/react-developer-tools):
  the component tree and what re-renders.
- Chrome's own Rendering panel (frame stats, paint flashing) and the Network
  tab's WS filter for online frames.

## How it's built

- `src/client/world/DevTools.tsx` re-exports the two halves. `App.tsx` and
  `World.tsx` load them with a dynamic `import()` behind
  `import.meta.env.DEV`, so production builds drop them.
- `src/client/world/dev/`:
  - `store.ts`: the shared state and remembered prefs. `canvas` holds the
    live scene and renderer; `actions` holds buttons that act in the Canvas.
  - `DevProbe.tsx`: inside the Canvas. It samples stats, applies the view
    switches, handles picking, teleport and look-at, and sets `__dd`.
  - `DevPanel.tsx` with `Inspector.tsx`, `SceneTree.tsx`,
    `RenderSection.tsx` and `widgets.tsx`: the DOM panel.
  - `sceneUtil.ts` and `transform.ts`: pure helpers, unit-tested.
- Game-side hooks, each a no-op unless the panel uses it:
  - `setDevHour` in `src/client/city/daylight.ts`
  - `devStartEvent` and `devStartNight` in `src/client/city/eventClocks.ts`
  - `devStartDanceOff` in `src/client/rooms/pulse/danceOffClock.ts`
  - the frame log in `src/client/net/devNetLog.ts`

To add a control, put it in a `Section` in `DevPanel.tsx` (or a new file
next to it). If it needs the scene, read `canvas` from `store.ts`. If it
must run inside the Canvas, add an entry to `actions` and fill it in
`DevProbe.tsx`. Call `patch({})` after editing a live object so the panel
redraws.
