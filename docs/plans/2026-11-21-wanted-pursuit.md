# Player pursuits implementation plan

**Spec:** [Player pursuits and City Jail](../specs/2026-11-21-wanted-pursuit.md)

**Goal:** Connect crime, pursuit, and jail in one playable city loop.

## Constraints

Use the existing wanted store, city assets, and jail save. Keep the feature
available in 13+ and avoid per-frame allocations in the scene. Run each new
test before the production change it covers.

## Tasks

- [ ] In `src/game/wanted/wanted.test.ts`, assert a theft starts two stars.
      Add capture tests for duration, slow reverse, range, and lost sight.
      Run the tests red. Add the crime threshold and capture rule in
      `src/game/wanted/wanted.ts`, then rerun.
- [ ] In `tests/client.spec.ts`, exercise a successful store theft, the
      wanted HUD, capture, and arrival at jail. Verify the new assertions fail.
      Connect `App.tsx`, the heat store, and the city scene. Reuse the ambient
      cruiser rendering and siren. Check that shop practice and traffic crime
      remain covered.
- [ ] In `src/game/jail/jail.test.ts`, cover failed activity results and
      reduction to zero. Run red, add the sentence reduction rule, and connect
      the existing rhythm activity through `JailHud.tsx`. Cover the final
      reduction and release in the browser.
- [ ] Run the full unit suite and targeted browser checks. Review the diff
      against the spec, then open the PR, monitor CI and review, and land it.

## Review focus

Cover a theft whose panel stays open, a pursuit that loses sight at a wall,
interrupted driver capture, jail reload, and release on the final activity.
