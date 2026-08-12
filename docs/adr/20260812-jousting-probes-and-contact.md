# Capability ADR — Jousting lance probes and match-only opponent contact

## Status

Accepted / Implemented

## Goal

Support deterministic one-versus-one single-pass jousts: opponents spawn at
opposite ends of a long lane, charge, and a shared scorecard (lance-on-target
hit quality, stay-up, knockdown, knockback) decides the winner and trains the
brain. Scoring uses opponent-only sensor probes. Bodies push only during
joust matches.

## Rapier design

- Bodies / colliders / joints / materials involved: existing dynamic joint
  balls and bone capsules from `spawnCreature`. Each marked lance and target
  joint also receives an extra circular **sensor** collider (mass 0). No new
  body types.
- Collision group bits: Boxing and Jousting never share a world. Reuse the
  same bit layout rather than allocating new bits:
  - joints `0b0001`, bones `0b0010`, world `0b0100` (unchanged default spawn)
  - A/B lance sensors `0b0000_1000` / `0b0010_0000`
  - A/B target sensors `0b0001_0000` / `0b0100_0000`
  - A/B solids `0b1000_0000` / `0b1_0000_0000`
  Lance sensors filter only the opponent target bit. Target sensors filter
  only the opponent lance bit. After match spawn, non-sensor colliders are
  retargeted to `membership = (joint|bone) | ownSolid` and
  `filter = world | opponentSolid`. Self-collision stays off.
- Forces / motors applied where: probes are sensors and apply no impulse.
  Detection runs after `world.step()` on the fixed-dt Jousting step. Muscle
  and world forces continue only after `resetForces` / `resetTorques`.
  Opponent solids use Rapier’s contact solver only.
- New keys in `src/physics/constants.ts`: lance/target probe radii, minimum
  closing speed, max scored power, hit cooldown, spawn X, lane half-width,
  wall size, max pass seconds, aftermath seconds, train pair gap.
- Power is a documented proxy (`lanceMass * closingSpeed`), not a Rapier
  solver impulse. Accuracy is closing speed / relative speed at first overlap.

## Determinism and lifecycle

- Probe creation follows design joint order, owner A then B.
- Scoring consumes fixed-step state only; no random hit roll.
- A hit requires a new overlap, minimum closing speed, and a cooldown.
- Clash trigger: first scoring lance-on-target hit, COM cross, closest-approach
  after they start separating, or max-time timeout. Aftermath then runs a
  fixed window and freezes the scorecard.
- Ordinary H2H, Disco, Boxing, training cohorts, and solo play do not create
  Jousting probes or retarget solids.

## Explicit non-goals

- Do **not** change default joint/bone filters on ordinary spawn.
- Do **not** retune global `SOFT_CCD_*` for jousts. Joust-only probe
  radius / lane constants live in `constants.ts`.
- Do **not** step physics with variable/render dt.
- Do **not** introduce unseeded randomness on the eval path.
- Do **not** share Boxing probe/runtime objects. Bit values may match; modules
  stay separate.
- Do **not** stretch Head-to-Head into a contact sport.

## Smoke gate

New script or assertions:

- File: `scripts/smoke-jousting.mts`
- npm script: `smoke:jousting` (included in `smoke:all`)
- Pass criteria: same-owner intersections never score; A-to-B and B-to-A score
  symmetrically; resting overlap scores once; below-threshold motion is
  rejected; eligibility is stable; miss-then-aftermath yields a finite
  scorecard; ordinary spawn groups remain unchanged; seeded pass scoring is
  reproducible; no NaNs after a solid clash step.

## Rollback

Set `joustingMode = false` in `src/port/featureFlags.ts`. No Jousting probes
or solid retargeting are then created.
