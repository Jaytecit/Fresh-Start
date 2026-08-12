# Capability ADR — Launch pad (Environment Studio)

## Status

Accepted / Implemented

## Goal

Author a thin ground platform that, when a **foot** steps on the drawn slab, boosts the creature upward toward an **authored approximate apex** (ruler units, default ~180, builder range 100…1000) — for testing flight and reading parallax / height rulers. **Each pad fires once per episode/run** (other pads stay armed).

## Rapier design

- Fixed rigid body + single cuboid collider (same ground collision groups as other static obstacles)
- Friction / restitution: `WORLD_GRIP` / `GROUND_RESTITUTION` with Max friction combine
- Size clamps: `LAUNCH_PAD_*` + shared `OBSTACLE_*` in `src/physics/constants.ts`
- Authored `EnvObstacle.launchApex` (pad only); stored on `ObstacleVisual.launchApex` at spawn
- After each fixed-dt `world.step()` (and after plant-slide brake): detect **foot** contact with pad bodies via `contactPairsWith`, plus tight top-face proximity (`LAUNCH_PAD_PROXIMITY` ≈ foot radius) for thin-slab misses — lateral bounds stay near drawn `hx`
- Trigger feet: marked `isFoot && !isWheel`, else all non-wheel joints (same policy as plant-slide). Bones never trigger.
- On fire: lift by `LAUNCH_PAD_CLEARANCE`, zero angvel, set **exact** shared `linvel.y = launchPadVyForApex(pad.launchApex)` on all creature bodies (not `max` with contact spikes), then re-assert for `LAUNCH_PAD_BOOST_STEPS`; skip aero during boost; aero force math caps speed at `AERO_SPEED_FORCE_CAP` so winged/glider/chute ballistics cannot NaN Rapier
- Target launch speed: `√(2 · |GRAVITY_Y| · apex) · LAUNCH_PAD_DAMPING_COMP`
- Per-creature `spentPads` set (pad body handles): each pad fires once per episode/run; other pads remain armed; reset on new creature spawn / solo episode watch
- Spawn via `spawnStaticObstacles` kind `'pad'`; impulse gated by `featureFlags.launchPads`
- No new collision-group bits; no unseeded randomness on the eval path

## Explicit non-goals

- Does not replace or activate the launch tower (static stem+deck)
- No continuous force fields or pistons

## Smoke gate

`scripts/smoke-tasks.mts` — `assertLaunchPad`: foot contact fires once near authored apex; same pad does not re-fire; a second distinct pad can still fire; winged (flapper) max-apex ×2 stays finite.

## Rollback

`featureFlags.launchPads = false` (geometry may still author; impulse skipped; tool hidden in World dock).
