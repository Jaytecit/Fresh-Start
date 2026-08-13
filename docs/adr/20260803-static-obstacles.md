# Capability ADR — Static obstacles (Environment Studio)

## Status

Accepted / Implemented

## Goal

Spawn authored environment obstacles as fixed Rapier colliders so Environment Studio packages are playable, not data-only. Climb’s hardcoded course stays a separate spawn path.

## Rapier design

- Fixed rigid bodies + cuboid colliders composed per `ObstacleKind`
- Collision groups: same as ground (membership bit 2), collide with creature parts — no new bits
- Friction / restitution: universal Train-dock `WORLD_GRIP` (default 1.85, up to `WORLD_GRIP_MAX`) on ground, ramps, stairs/boxes/pits/loops, terrain, and tower with `CoefficientCombineRule.Max` so contact μ is not averaged down by body/foot μ; restitution stays `GROUND_RESTITUTION`
- Joint balls use elevated `JOINT_FRICTION` / `FOOT_FRICTION` and higher angular damping so contact surfaces are stickier than bone capsules; wheels keep `BODY_FRICTION` so carts still roll
- Plant purchase (Anti-scoot–scaled, universal): **anti-roll** on any planted surface; **low-speed bidirectional stance stick** (`SURFACE_STANCE_STICK` when `|along| < STANCE_STICK_SPEED`) so muscle micro-skid dies and feet plant for push-off; above that band, **adverse along-surface** damp (`SURFACE_TANGENT_BRAKE`) — tilted: downhill-only; flat: opposite of intended gait (default world-left / −X so fast +X is kept; boxing / joust mirrored corners pass `forwardX = −1`); ramp top-surface proximity covers thin-slab contact misses
- Size clamps in `src/physics/constants.ts` (`OBSTACLE_*`); kind composition in `src/physics/obstacles.ts`
- Spawn via `spawnStaticObstacles(world, obstacles, worldGrip?)`; destroy on env replace / clear
- Gated by `featureFlags.staticObstacles`

Kind mapping:

| Kind | Composition |
|---|---|
| box | Single cuboid at `(x,y)`, full size `w×h`, optional `rot` |
| ramp | Thin cuboid slab, default tilt if `rot` omitted; `WORLD_GRIP` + Max combine |
| stair | Ascending platform steps filling the `w×h` footprint |
| pit | Left/right raised platforms with gap `w` (floor remains infinite ground) |
| loop | Open ring of thin cuboid segments (gap at bottom) |
| pad | Thin deck; contact applies ~200-apex vertical boost (see `20260810-launch-pad.md`) |

## Explicit non-goals

- No ice materials or movable world objects
- No new collision-group bits
- Does not replace climb course for task `climb`

## Smoke gate

`scripts/smoke-tasks.mts` — `assertStaticObstacles`: each kind spawns ≥1 body; hopper settles on a box without NaN.  
`assertRampGrip`: surfaces use Max combine at μ=10; cuboid pad does not runaway downhill; ramp purchase cuts downhill slip / preserves uphill; ball foot holds; flat-ground plant brake still cuts scoot.

## Rollback

`featureFlags.staticObstacles = false` (geometry authoring UI can remain; spawn skipped).
