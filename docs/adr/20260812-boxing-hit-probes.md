# Capability ADR — Boxing opponent-only hit probes

## Status

Accepted / Implemented

## Checklist IDs

K2, K4, K5, K6, K7

## Goal

Support deterministic one-versus-one Boxing points matches in which authored glove
joints can score only against authored targets owned by the opposing creature.
Measure an explainable power proxy and target-centre accuracy without enabling
general creature-to-creature solving or self-collision.

## Rapier design (Fresh Start only)

- Bodies / colliders / joints / materials involved: each marked glove and target
  receives an additional circular sensor collider attached to its existing dynamic
  joint rigid body. Existing solid joint and bone colliders remain unchanged.
- Collision group bits: preserve joints `0b0001`, bones `0b0010`, and world
  `0b0100`. Reserve `0b0000_1000` / `0b0001_0000` for fighter A glove/target
  probes and `0b0010_0000` / `0b0100_0000` for fighter B glove/target probes.
  Each glove sensor filters only the opponent target bit. Target sensors filter
  only the opponent glove bit. A runtime owner/role registry rejects same-owner
  pairs again before scoring.
- Forces / motors applied where: probes are sensors and apply no force or impulse.
  Detection runs after `world.step()` inside the fixed-dt Boxing step. Existing
  muscle/world forces continue to run only after `resetForces` / `resetTorques`.
- New keys in `src/physics/constants.ts`: glove/target probe radius scales,
  minimum closing speed, maximum scored power, per-glove/target re-arm separation,
  hit cooldown, ring dimensions, and Boxing spawn offsets.
- Pair API: use `world.intersectionPairsWith(sensor, callback)` for overlap
  detection. Power is a documented proxy computed from effective glove mass and
  relative closing speed along the glove-to-target-centre axis; it is not reported
  as a Rapier solver impulse. Accuracy is the normalized alignment of relative
  glove velocity with the glove-to-target-centre axis at first overlap.

## Determinism and lifecycle

- Probe creation order follows design joint order and owner slot A then B.
- Scoring consumes fixed-step state only and contains no random hit roll.
- A hit requires a new overlap/approach, minimum closing speed, and a cooldown;
  continuous resting overlap cannot repeatedly score.
- Probe ownership is rebuilt at match spawn and removed with the creature.
- Ordinary H2H, Disco, training cohorts, and solo play do not create Boxing probes.

## Explicit non-goals

- Do **not** import parent soft-body solver, arena code, combat tuning, or feel notes.
- Do **not** enable full creature-to-creature collision or alter existing joint/bone
  collision filters.
- Do **not** step physics with variable/render dt.
- Do **not** introduce unseeded randomness on the eval path.
- Do **not** call the v1 power proxy a contact impulse.

## Smoke gate

New script or assertions:

- File: `scripts/smoke-boxing.mts`
- npm script: `smoke:boxing` (included in `smoke:all`)
- Pass criteria: same-owner intersections never score; A-to-B and B-to-A score
  symmetrically; resting overlap scores once; below-threshold/separating motion is
  rejected; divisions report stable eligibility and reasons; seeded match scoring
  is reproducible; existing ordinary creature collision groups remain unchanged.

## Rollback

Set `boxingMode = false` in `src/port/featureFlags.ts`. No Boxing probes are then
created and existing physics groups/steps remain unchanged.
