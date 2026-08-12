# Capability ADR — Launch tower (Environment Studio)

## Status

Accepted / Implemented

## Goal

Spawn an authored `EnvTower` as fixed Rapier geometry: a stem + top launch deck creatures can stand on or jump from.

## Rapier design

- Fixed rigid bodies + cuboid colliders (stem + platform deck)
- Collision groups: ground membership bit 2 — no new bits
- Friction / restitution: `GROUND_FRICTION` / `GROUND_RESTITUTION`
- Size clamps in `src/physics/constants.ts` (`TOWER_*`)
- Spawn via `spawnLaunchTower(world, tower)`; destroy on env replace
- Gated by `featureFlags.launchTower`

Composition:

| Part | Geometry |
|---|---|
| Stem | Narrower column from ground up to deck underside |
| Deck | Wider platform of thickness `TOWER_DECK_THICKNESS` at `height` |

`EnvTower`: `{ x, baseW, height }` — deck full width `baseW`, stem width `baseW * TOWER_STEM_WIDTH_RATIO`.

## Explicit non-goals

- No automatic creature spawn relocation onto the deck (author places tower under play area)
- Progressive height escalation after a clear is still open (`TASKS.md`)

## Smoke gate

`scripts/smoke-tasks.mts` — `assertLaunchTower`: stem+deck bodies; hopper settles on deck without NaN.

## Rollback

`featureFlags.launchTower = false`
