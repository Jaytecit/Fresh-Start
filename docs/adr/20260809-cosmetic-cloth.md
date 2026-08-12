# Capability ADR — Cosmetic cloth garments

## Status

Accepted / Implemented

## Goal

Let Studio-authored creatures wear flexible cloth (starting with a two-pin cape) that drapes and flows from skeleton motion — disco-first, for dancers with automated/reactive muscles. Cosmetics only: no Rapier soft bodies, no wind v1.

## Design

- Authortime: `AppearanceRig.cloth[]` rectangular particle grids with pins to joints/bones (`ClothGarmentDef` / `ClothPinDef`).
- Runtime: render-only Verlet integration in `src/appearance/cloth.ts` (keyed state like googly eyes).
- Pins lock to smoothed joint/bone world poses each frame; free particles integrate with gravity + damping + structural/shear constraints.
- Draw under or over body-part sprites (`layer: 'under' | 'over'`).
- Tunables in `src/appearance/clothConstants.ts` (not physics constants).
- Cape preset: top-left + top-right pins on two selected joints.
- Material-draw tool: click joints one at a time, then create a covering over their AABB with nearest-particle pins.
- Per-garment `weight` / `stiffness` plus cols/rows/cellSize for finer or heavier fabric.

## Explicit non-goals

- No cloth↔world or cloth↔cloth collision.
- No wind fields (v1); fabric motion from pin / creature movement only.
- No Rapier colliders, joints, or forces.
- No Evolve fitness use of cloth.
- Do **not** step Rapier with variable/render dt.
- Do **not** introduce unseeded randomness on the eval path.

## Smoke gate

- File: `scripts/smoke-cloth.mts`
- npm script: `smoke:cloth` (included in `smoke:all`)
- Pass criteria: finite particles; pins track oscillating anchors; free particles displace; structural lengths near rest.

## Rollback

Feature flag `cosmeticCloth = false` in `src/port/featureFlags.ts`.
