# Capability ADR — Climb course static steps

## Status

Accepted / Implemented

## Goal

Provide ordered step boxes so climb-task fitness (max supported height) is meaningful. Environment Studio obstacles are a separate spawn path.

## Rapier design

- Fixed cuboid colliders for 4 ascending steps
- Collision groups: same as ground (membership bit 2), collide with creature parts
- Spawned per climb episode via `spawnClimbCourse(world)`; destroyed on course clear
- No new constants that retune creature muscle feel — step sizes in `physics/course.ts` local consts

## Explicit non-goals

- No ice materials
- Does not replace Environment Studio authored obstacles or heightfields

## Smoke gate

`scripts/smoke-tasks.mts` — climb course bodies exist; hopper can settle on ground without falling through.

## Rollback

`featureFlags.climbCourse` / omit course when task ≠ `climb`.
