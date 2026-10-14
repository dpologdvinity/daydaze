# 3D Client Foundation

Date: 2026-10-14
Status: Approved for implementation under the user's overnight autonomy instruction ("make as much progress as possible without asking"). Every decision the user did not make is marked **Assumption** so it can be reviewed in the morning.

## Goal

Turn the throwaway 3D lounge prototype into the real Daydaze client: a 3D world of connected rooms where a player dresses up a glam fashion doll, walks around, and later meets other players online.

This spec covers the single-player client only. Multiplayer is covered by `2026-10-14-online-foundation-design.md` and plugs in through the existing `NetworkTransport` interface.

## Decisions

- Stack: Vite, React 19, TypeScript strict, three.js 0.186, React Three Fiber 9, drei 10, @react-three/postprocessing 3. These match the prototype.
- The prototype in `prototypes/3d-lounge/` is reference code. It is ported, cleaned and split into modules, not imported directly.
- **Assumption:** first playable slice is two rooms joined by portals: the Velvet Room lounge (from the prototype) and Daydaze Plaza, an outdoor night street hub with neon storefronts that later leads to clubs, bars and minigames.
- **Assumption:** the camera is a third-person orbit camera that follows the player, with limited pitch and zoom, matching the prototype. Players move by tapping or clicking the floor, or with WASD and arrow keys.
- **Assumption:** the player's look and settings save to `localStorage` under `daydaze-save-v1`, validated on load. Coins, inventory and the shop come in a later spec.
- Name tags use the player's chosen display name. Default: a generated name such as `MangoGuest4821`, matching the guest naming in the online spec.

## Layout

```
src/
  net/                    existing protocol and room server (shared with server)
  audio/                  existing procedural audio
  game/                   pure, tested game logic (no React, no three.js)
    look.ts               Look type, option catalogs, validateLook, DEFAULT_LOOK
    save.ts               SaveV1 type, loadSave(raw), serializeSave(save)
    walk.ts               walkable polygon test, clampToWalkable, stepTowards
    portals.ts            portal hit test, room transition helpers
    rooms.ts              RoomDefinition type and the room registry (data only)
  client/
    main.tsx              entry
    App.tsx               state: current room, look, save; renders World + Overlay
    world/
      World.tsx           Canvas, lights shared by all rooms, quality tier, postprocessing
      CameraRig.tsx       follow camera and view presets (room, full look, face)
      PlayerController.tsx  click/tap-to-walk, keyboard movement, portal checks
    rooms/
      VelvetRoom.tsx       lounge scene ported from the prototype
      Plaza.tsx           outdoor hub scene
    avatar/
      Doll.tsx, dollGeometry.ts, toon.ts, faceTexture.ts   ported from the prototype
    ui/
      Overlay.tsx         closet panel, view and mood switches, room title
      ChatBar.tsx         local chat bubble above the player (offline echo for now)
    styles.css
index.html
public/doll/              face template, lips and brows images used by the face texture
```

`src/game/` holds every rule that can be unit-tested in Node. React and three.js code stays thin and calls into it.

## Rooms as data

```ts
type Vec2 = readonly [x: number, z: number];

type RoomDefinition = {
  id: RoomId;                     // "velvet-room" | "plaza"
  name: string;                   // shown in the HUD
  walkable: readonly Vec2[];      // floor polygon on the XZ plane
  spawn: { position: Vec2; yaw: number };
  portals: readonly {
    id: string;
    position: Vec2;
    radius: number;
    label: string;                // "To the Plaza"
    target: RoomId;
    targetSpawn: { position: Vec2; yaw: number };
  }[];
};
```

The registry lists both rooms. Unit tests check that every spawn and every portal target spawn lies inside the target room's walkable polygon and outside every portal radius in that room, so arriving never instantly re-triggers a portal.

## Movement

- `clampToWalkable(polygon, point)` returns the point if it is inside the polygon, otherwise the nearest point on the polygon edge.
- `stepTowards(from, to, maxStep)` moves at most `maxStep` toward the target. Walking speed is 2.2 m/s and uses frame delta.
- Each frame, after moving, the controller tests portals. Entering a portal starts a 300 ms fade, swaps the room, and places the player at the target spawn.

## Doll and look

- The `Look` type and catalogs move from the prototype's `looks.ts` into `src/game/look.ts`. `validateLook(value: unknown): value is Look` accepts only catalog values.
- The prototype's lavender default eyeshadow and brow choices stay. Outfits: crop and flares, slip mini, faux fur.
- Face textures are built at runtime from `public/doll/` images. The prototype's canvas compositing stays.

## Quality tiers

- `high`: bloom, reflective floor, antialiasing, DPR up to 1.5.
- `low`: no postprocessing, no reflector, DPR 1.
- **Assumption:** start on `high` and drop to `low` automatically with drei's `PerformanceMonitor` when the frame rate stays below 45 fps. A `?quality=low` URL flag forces low for tests and slow devices.

## Accessibility and comfort

- The overlay is real DOM: buttons with labels, visible focus, keyboard reachable.
- Reduced motion disables idle camera drift and the dance mood's bounce, and keeps neon from flickering.
- The canvas has an accessible name ("3D room view") and the room name is announced in a live region on room change.

## Testing

- Unit (Node test runner, RED-GREEN): `look.ts`, `save.ts`, `walk.ts`, `portals.ts`, and room registry consistency.
- Browser (Playwright, one spec `tests/client.spec.ts`), run with `?quality=low` because headless WebGL uses SwiftShader on the CPU:
  - the page loads with no page errors and the canvas mounts;
  - changing the hair style in the closet persists across a reload;
  - pressing the "To the Plaza" debug button (exposed only with `?debug=1`) moves the player to the Plaza and updates the HUD title;
  - the overlay passes an axe scan.
- Screenshots for visual review use `?quality=low&still=1`, where `still=1` renders a few frames on demand instead of a continuous loop.

## Out of scope

Multiplayer wiring, coins and shop, minigames, the 18+ area, AI-generated 3D hair and accessories, sound design for rooms.
