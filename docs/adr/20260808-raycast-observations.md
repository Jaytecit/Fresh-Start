# Capability ADR — Raycast observations

## Status

Accepted / Implemented

## Checklist IDs

D7 deepen (optional geometry whiskers for obstacle courses)

## Goal

Give locomotion brains optional local geometry senses (forward / down whiskers) so authored obstacle courses (ramps, walls, pits, platforms) can be anticipated before contact — without baking object IDs into the observation vector.

## Rapier design (Fresh Start only)

- Bodies / colliders / joints / materials involved: none new — query existing ground / obstacle / terrain / tower colliders
- Collision group bits: only colliders with world membership bit `0b0100` (ground / obstacles / terrain / tower); creature joints/bones ignored
- Forces / motors: none — read-only per-collider `castRay` (avoids stale broadphase before the first `world.step`)
- New keys in `src/physics/constants.ts`: none — ray count / max range / angles live in `src/brain/constants.ts` (observation pack)
- Helper `worldQueryCollisionGroups()` kept for future pipeline-filtered queries

## Observation pack

- Base locomotion pack (`OBS_COUNT = 12`) unchanged when toggle off
- When enabled: append `RAYCAST_RAY_COUNT` normalized hit distances in `[0, 1]` (0 = immediate hit, 1 = miss / max range)
- Origin: mean joint position (body center), small upward bias so feet do not self-occlude the down ray
- Distinct MLP `inputCount` — weight transplant across on/off is rejected (same rule as dance pack)

## Explicit non-goals

- Do **not** import parent soft-body solver, aero tables, or feel tuning.
- Do **not** step physics with variable/render dt.
- Do **not** introduce unseeded randomness on the eval path.
- Object identity / material sensors, moving world-object tracking (G4 still off)
- Dance / disco observation packs (loco evolve only)

## Smoke gate

New script or assertions:

- File: `scripts/smoke-raycast.mts`
- npm script: `smoke:raycast` (included in `smoke:all`)
- Pass criteria: cast hits ground ahead of hopper; misses open air; self-colliders ignored; obs length matches `RAYCAST_OBS_COUNT` when enabled

## Rollback

How to disable (feature flag key in `src/port/featureFlags.ts`):
`raycastObservations = false` (Train toggle hidden; evolve always uses base `OBS_COUNT`).
