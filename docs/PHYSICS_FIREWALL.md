# Physics contract

Rapier is the sole integrator. Keep feel and determinism inside this contract.

## Must preserve

| Invariant | Location |
|---|---|
| Rapier is the sole integrator / constraint solver | `src/physics/` |
| Fixed-dt stepping (`FIXED_DT = 1/60`) via accumulator | `src/sim/simulation.ts` |
| Muscle spring + damper + active force; equal and opposite | `src/control/muscleDrive.ts` |
| `resetForces` / `resetTorques` every physics step before apply | `src/sim/simulation.ts` |
| Collision groups: creature self-non-collision; collide with ground | `src/physics/spawn.ts`, `src/physics/world.ts` |
| All physics tunables in one place | `src/physics/constants.ts` |
| No unseeded `Math.random` on physics / brain eval path | `src/brain/network.ts` (seeded RNG) |
| Feel gate stays green | `npm run smoke:feel` |

## Always

- New Rapier capabilities: write an ADR from `docs/CAPABILITY_ADR_TEMPLATE.md` first, then a smoke assertion.
- Gate unfinished behavior behind `src/port/featureFlags.ts` (default off until the slice is ready).
- Extend collision groups only by deliberately adding bits to the spawn/world scheme.
- After physics-adjacent changes, run `npm run smoke:all`.

## Never

- Step Rapier with variable/render dt, or bypass the fixed-dt accumulator.
- Scatter new physics magic numbers outside `src/physics/constants.ts`.
- Apply muscle/world forces without `resetForces`/`resetTorques` each physics step.
- Introduce unseeded `Math.random` on physics or brain evaluation paths.

Learning stays a fixed **MLP + genetic algorithm** (dance also uses SGD imitation). Do not replace that stack as the default.

## Regression bar

```bash
npm run smoke:all
```

That runs firewall invariants, feel, evolve, tasks, and feature smokes.
