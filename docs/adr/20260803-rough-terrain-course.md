# Capability ADR — Rough terrain course

## Status

Accepted / Implemented

## Goal

Train locomotion over deterministic hills: selecting the Rough goal spawns a sine heightfield course and scores forward progress with foot-lift quality (run-like), using terrain-relative plant/fall so hills do not break legitimacy.

## Rapier design

- Task-owned course via `spawnRoughCourse(world)` → `spawnTerrainHeightfield` with `makeRoughCourseTerrain()` (deterministic sine; no `Math.random`)
- Collision groups / friction: same as authored ground heightfield
- Course constants in `src/physics/constants.ts` (`ROUGH_COURSE_*`)
- Scoring scales in `src/brain/constants.ts` (`ROUGH_DIST_SCALE`)
- Fall / foot-lift / plant-slide use clearance vs `sampleTerrainHeight` when a terrain context is present
- Gated by `featureFlags.roughTerrainCourse` (+ `taskRoughTerrain` catalog flag)
- Infinite halfspace ground remains under the heightfield

## Explicit non-goals

- No progressive escalation after a clear (see `TASKS.md`)
- No new collision-group bits
- Does not replace Environment Studio authored terrain (coexists; obs/render prefer course when active)

## Smoke gate

`scripts/smoke-tasks.mts` — `assertRoughCourse` (spawn + hopper on hills) and `assertRoughTaskScores` (`evaluateTaskEpisode(..., 'rough')` finite fitness).

## Rollback

`featureFlags.roughTerrainCourse = false` / omit course when task ≠ `rough`.
