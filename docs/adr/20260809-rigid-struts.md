# Capability ADR — Rigid struts (solid connectors)

## Status

Accepted / Implemented

## Goal

Authors can build solid frames (triangles, squares, trusses) without stacking many hinge-bones for “solidity.” Structural links must stay rigid at any authored angle while cutting Rapier body/hinge cost versus capsule bones.

## Rapier design

- Bodies / colliders / joints / materials involved:
  - No new body types or colliders for struts
  - One `JointData.fixed(anchor1, frame1, anchor2, frame2)` impulse joint between the two existing joint-ball rigid bodies
  - Anchors: body-1 origin `(0,0)`; body-2 local point that currently coincides with body-1 origin (`A.pos - B.pos` at spawn); frames `0` (balls spawn unrotated)
  - Hinge bones unchanged: capsule + two revolutes
- Collision group bits: unchanged (struts have no colliders)
- Forces / motors: none on struts; muscles/aero remain on hinge bones only
- New keys in `src/physics/constants.ts`: none

## Design model

- `BoneDef.rigid?: true` marks a solid strut (JSON-compatible; omitted = hinge)
- Rigid bones cannot host muscles or aero; validated in editor / import / morph

## Explicit non-goals

- Do **not** step physics with variable/render dt.
- Do **not** introduce unseeded randomness on the eval path.
- No plate-mesh colliders (edge-only fixed joints; see `TASKS.md`)
- No joint angular limits

## Smoke gate

New script or assertions:

- File: `scripts/smoke-rigid-struts.mts`
- npm script: `smoke:rigid-struts` (included in `smoke:all`)
- Pass criteria: rigid triangle keeps edge lengths under gravity/shove; square frame does not shear; hinge bone still bends; muscle on rigid bone is rejected at spawn

## Rollback

How to disable (feature flag key in `src/port/featureFlags.ts`):
`rigidStruts = false` (authored `rigid: true` bones spawn as hinge capsules again).
