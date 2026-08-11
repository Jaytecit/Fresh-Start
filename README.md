# Solemn Sandbox

**A serious environment to carry out silly experiments.**

Build little creatures out of joints, bones, and muscles, drop them into a 2D world, and teach them to walk, jump, climb, fly, race courses, or dance. Designs are yours; brains improve by trying many variations and keeping what works.

Inspired by [Evolution by Keiwan](https://keiwando.com/evolution/).

## What you can do

| Area | What it’s for |
| --- | --- |
| **Creature builder** | Draw a body: place joints, connect bones (including solid struts), add muscles, decorate with body parts / eyes / cloth. |
| **Creatures** | Browse presets and your library, inspect stats, saved brains, best scores, and trophies earned by a body. |
| **Train** | Pick a goal and environment, then **Evolve** a brain. Watch a pack of try-outs, play the best, save models. |
| **Environment builder** | Author flat ground, hills, obstacles, launch pads, score regions, and course markers for practice. |
| **Skill / Goal / Env strip** | Switch skill areas (walk, jump, fly, motor, free, disco) and the training course without leaving the main view. |
| **Disco** | Load music, route frequency bands to muscles, record / learn dances, run multi-dancer slots. |
| **Trophy room** | Collect secret goals unlocked while experimenting. |
| **Head-to-head** | Pit two saved brains against each other on a goal. |

**Tip:** Brace limbs with triangles. Long floppy chains tend to pancake under gravity.

## Quick start

```bat
start.bat
```

Or:

```bash
npm install
npm run dev
```

Open **http://localhost:3001/**.

### First session

See the short starter guide: [`docs/TUTORIAL.md`](./docs/TUTORIAL.md).

1. Open **Creature builder** and load a preset (e.g. Simple Hopper), or draw your own.
2. Use the strip above the canvas to pick a **Skill**, **Goal**, and **Env**.
3. Switch to **Train**, press **Evolve**, then **Play best** when a run finishes.
4. Save a model from the Train dock; manage bodies and brains in **Creatures**.
5. After you have a trained elite, use **Share** to get a public link (optional: list it in **Public creations**). See [`SHARING.md`](./SHARING.md).

Editor shortcuts: place joints with the joint tool; drag bone/muscle between parts; select to move or multi-select; Undo / Clear as needed. Save current and Import/Export JSON stay in the builder.

---

## For builders & contributors

### Creature model

- **Joints** — massy contact points (circles); can be marked as feet, heads, or wheels.
- **Bones** — hinged capsules between joints, or **rigid struts** for solid frames.
- **Muscles** — always-on springs toward rest length, plus active contract / expand along the bone-to-bone axis.
- **Control** — each actuator channel is `[-1, 1]` (sign = expand/contract, magnitude = strength). Manual, oscillate, or brain-driven.

Physics knobs live in [`src/physics/constants.ts`](src/physics/constants.ts). Simulation steps Rapier at a fixed timestep with force/torque resets each step.

### Learning

Training uses a fixed **MLP** brain and a **genetic algorithm** over weights (and optional body/structure morph genes) — not NEAT. Goals and scoring live under `src/brain/` and `src/goals/`. Background: [`PHASE2_NEURAL_NETWORK.md`](./PHASE2_NEURAL_NETWORK.md).

### Feature tracking & physics rules

1. Mark planned work in [`FEATURE_PORT_CHECKLIST.md`](./FEATURE_PORT_CHECKLIST.md)
2. Track implementation in [`FEATURE_PORT_BACKLOG.md`](./FEATURE_PORT_BACKLOG.md)
3. Keep physics changes inside the Rapier-native contract: [`docs/PHYSICS_FIREWALL.md`](./docs/PHYSICS_FIREWALL.md)

Capability ADRs: [`docs/adr/`](./docs/adr/).

### Smoke tests

After physics-adjacent changes, run:

```bash
npm run smoke:all
```

Suites cover the physics contract (fixed-dt, third-law muscles, determinism), feel (brace / hopper / collapse), evolve progress, tasks/envs, disco dance, training recipes, structure morph, editor selection, raycasts, rigid struts, and cloth.

### Stack

Vite + React + TypeScript + Rapier2D (`@dimforge/rapier2d-compat`).
