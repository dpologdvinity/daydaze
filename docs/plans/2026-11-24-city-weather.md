# City weather implementation plan

See [the approved design](../specs/2026-11-24-city-weather-design.md).

- [ ] Capture the dry low-tier boardwalk and neon street baselines using the existing screenshot viewpoints and canvas renderer counters.
- [x] Test the date-seeded schedule, its ramp and day boundary, preview flags and the 4 a.m. trough. Implement those rules in `src/game/city/weather.ts` and resolve them from the shared wall clock and daylight preview hour.
- [x] Test the quiet traffic roster against a moving player. Keep stable car IDs and change the active roster away from the player before the fixed simulation step. Reuse the active roster for collision and rendering. Extend the ambient pedestrian taper.
- [x] Mount one GPU-animated rain batch in the city. Use the reduced-motion preference and quality tier to control streaks. Patch the boardwalk and asphalt materials to modulate roughness and reflect nearby planned sign colors without extra lights.
- [ ] Compare clear and rainy views, reduced motion and daytime versus 4 a.m. Inspect render and shader diagnostics and run targeted tests and the project checks before opening the PR.
