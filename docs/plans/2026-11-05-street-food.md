# City street food

Use the existing bus's arc-length route implementation as a shared street loop,
with rounded road junctions and pooled poses. Keep Line 1 behavior unchanged.
A pastel downloaded van with a downloaded roof cone stops for 30 seconds at
Park Avenue and Shore Boulevard, looping via the Chinatown cross street and
Downtown. A procedural public-domain Twinkle Twinkle jingle uses the SFX bus
and fades with distance. Four downloaded carts sell small alcohol-free menus
through createStore and the existing onSpend wallet callback. Nearby vendor
NPCs use pickLine. Human-written dialogue is required; pending owner copy,
reuse approved existing lines where appropriate rather than generate dialogue.

1. Write failing Node tests for loop continuity, streets, stop timing,
   proximity and menu purchase validation. Extract the route helper, preserve
   bus tests, implement truck schedule and cart/menu data in src/game/city/.
2. Adapt downloaded van/cone/cart assets with a reproducible Blender script;
   merge materials, instance repeated carts and cull at short range. Update
   asset ledger and credits together and account for low-tier geometry.
3. Add tested distance attenuation and procedural melody in src/audio/;
   wire pooled motion, nearby NPCs and accessible purchasing into city/overlay.
   No allocations in the scene frame callback; timers own UI and audio.
4. Add one ice-cream Playwright test for purchase, departure, coins and cart
   ordering. Capture and inspect a low-tier truck/cart screenshot. Run focused
   tests, npm run verify, conflict-marker scan and inline code review. Rebase
   main and leave small Conventional Commits on feat/vendors; never deploy.

Review focus: exact departure boundaries, invalid item ids, stale proximity,
insufficient coins, cycle wrapping, muted/unavailable audio, resource cleanup,
and counting actual downloaded GLB primitives in the low-tier budget.
