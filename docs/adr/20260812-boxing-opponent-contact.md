# Capability ADR — Boxing opponent solid contact

## Status

Accepted / Implemented

## Checklist IDs

K8

## Goal

In Boxing matches only, opposing fighters must physically push and block each
other so gloves and limbs stop on contact. Scoring remains on the existing
opponent-only sensor probes. Ordinary solo, H2H, disco, and training cohort
spawns keep ghost-through creature pairs.

## Rapier design (Fresh Start only)

- Bodies / colliders / joints / materials involved: existing dynamic joint balls
  and bone capsules created by `spawnCreature`. No new bodies. Sensor probe
  colliders are left unchanged. Existing friction/restitution materials stay.
- Collision group bits: preserve joints `0b0001`, bones `0b0010`, world
  `0b0100`, and probe bits `0b0000_1000`…`0b0100_0000`. Add fighter solid bits
  `A_SOLID = 0b1000_0000` and `B_SOLID = 0b1_0000_0000`. After match spawn,
  each non-sensor collider is retargeted to
  `membership = (joint|bone bit) | ownSolid` and
  `filter = world | opponentSolid`. Self-collision stays impossible because a
  fighter never filters its own solid bit.
- Forces / motors applied where: none beyond Rapier’s contact solver. Muscle and
  world forces continue only after `resetForces` / `resetTorques` each fixed
  step. Hit probes remain sensors and apply no impulse.
- New keys in `src/physics/constants.ts`: none required for v1 (reuse body /
  foot contact materials). Any future contact tuning must land here.

This narrowly supersedes the K4 ADR non-goal of “no creature-to-creature
solving” for Boxing matches only.

## Determinism and lifecycle

- Contact groups are applied in owner order A then B immediately after each
  match spawn and before/with probe creation.
- Destroying the creature removes the retargeted colliders with the bodies.
- Non-boxing spawn paths never call the retarget helper.

## Explicit non-goals

- Do **not** enable self-collision within a fighter.
- Do **not** change H2H, disco, cohort, or solo collision filters.
- Do **not** replace sensor scoring with contact impulses.
- Do **not** import parent arena/combat physics or feel notes.
- Do **not** step physics with variable/render dt.
- Do **not** introduce unseeded randomness on the eval path.

## Smoke gate

New script or assertions:

- File: `scripts/smoke-boxing.mts` (extended)
- npm script: `smoke:boxing` (already in `smoke:all`)
- Pass criteria: ordinary spawn groups unchanged; boxing solids include the new
  bits and filter the opponent; overlapping fighters separate under fixed-dt
  stepping; same-owner solids do not collide; sensor scoring still works with
  solids enabled.

## Rollback

Set `boxingMode = false` in `src/port/featureFlags.ts`. Boxing matches (and
therefore opponent solid retargeting) do not run.
