# Brain and evolution

Fixed **MLP** + **genetic algorithm** over weights (and optional morph / structure genes). Dance learning is a separate Disco path (SGD imitation, then optional Disco-local GA refine).

## Loop

```mermaid
flowchart TB
  Design[CreatureDesign] --> Spawn[spawnCreature]
  Spawn --> World[Rapier world step]
  World --> Obs[buildObservations]
  Obs --> Net[fixed MLP forward]
  Weights[Genome weights] --> Net
  Net --> Drives["actuator drives -1..1"]
  Drives --> Muscles[applyMuscleForces / motor torque]
  Muscles --> World
  World --> Fitness[task fitness]
  Fitness --> GA[select mutate next gen]
  GA --> Weights
```

Brain ticks at 30 Hz by default; physics stays 60 Hz (`FIXED_DT`). Last outputs are held between brain ticks.

## Network

Identical topology for every member of a run; only weights differ.

- Inputs: locomotion pack `OBS_COUNT = 12` (body stats, foot contact/clearance, terrain grade, head height, phase clock). Optional raycast whiskers append 5 ranges (`RAYCAST_OBS_COUNT`).
- Hidden: one tanh layer, width `clamp(2 * max(in, out), 8, 32)`.
- Outputs: one `[-1, 1]` channel per muscle, then one per motor wheel.
- Genome: packed weights + biases. Optional morph genes and padded structural channels when those Train toggles are on.

Dance uses a larger obs pack (`DANCE_OBS_PACK_VERSION`) and must not be mixed with locomotion genomes. See [`DANCE_CURRICULUM.md`](./DANCE_CURRICULUM.md).

## Evolution

Tournament selection, elitism, Gaussian mutation, optional uniform crossover. Recipes and dock knobs live in `src/brain/trainingRecipes.ts` and the Train UI. Mid-run knob changes lock until Stop.

Goals and scoring: `src/goals/catalog.ts`, `src/brain/taskScore.ts`. Secrets: `src/secrets/`.

## Key modules

| Path | Role |
| --- | --- |
| `src/brain/network.ts` | MLP forward, seeded RNG |
| `src/brain/observations.ts` | Locomotion obs pack |
| `src/brain/ga.ts` | Select / mutate / crossover |
| `src/brain/evolve.ts` | Population loop |
| `src/sim/simulation.ts` | Live evolve, play-best, H2H, skill matches |
| `src/control/muscleDrive.ts` | Spring + active muscle forces |

## Smoke

`npm run smoke:evolve` (fitness rises vs gen-0) plus `smoke:train-recipes`, `smoke:structure-morph`, `smoke:raycast`, and task/skill smokes in `npm run smoke:all`.
