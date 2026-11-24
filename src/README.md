# src

Everything that ships to the browser, plus the pure logic it shares with the
Worker in `server/`. The rule: rules live in `game/`, `net/` and `audio/` (all
Node-tested, no React); `client/` only draws and wires them up. See
[`ARCHITECTURE.md`](../ARCHITECTURE.md) for the full map.

## Subfolders

| Folder                              | What it is                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`client/`](client/README.md)       | The Vite + React Three Fiber app: scenes, HUD, input, avatars, rooms and the online UI                                                                 |
| [`game/`](game/README.md)           | Pure game logic: rooms, look and wardrobe, saves, city layout, driving, dialogue, economy. No React or three.js                                        |
| [`net/`](net/README.md)             | Network protocol, room-sync rules, and the framework-free browser client (`net/client/`) shared with the Worker                                        |
| [`audio/`](audio/README.md)         | Procedural Web Audio synthesis: ambience beds, jukebox, instruments, engine and radio mixes                                                            |
| [`minigames/`](minigames/README.md) | The 2D minigames (Bassline, Gem Glam, Last Call, Midway, Star Siege, Trivia), each an `engine.ts` plus a React view, opened in the shared `Dialog.tsx` |
