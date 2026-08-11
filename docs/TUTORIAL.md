# Starter tutorial

Welcome to **Solemn Sandbox**. This page is a short tour for first-time players — enough to get moving, not a full manual.

In the app, open the **Tutorial** tab for the full guided tour, or switch to **Quick start** there to read this same guide without leaving the sandbox. Hover help (on by default) can be toggled in that same tab.

## The big idea

You design a creature, pick a challenge, and let many “brains” try the course. The better ones breed into the next round. When something works, save it and keep playing.

## Where things live

| Tab / strip | Use it for |
| --- | --- |
| **Tutorial** | Guided tour + quick start + hover-help toggle |
| **Creature builder** | Draw or load a body |
| Strip above the canvas | Pick **Skill**, **Goal**, and **Env** |
| **Train** | Evolve, watch, play best, save a brain |
| **Creatures** | Browse presets, library, stats, and saved brains |
| **Environment builder** | Build custom practice courses (optional at first) |
| **Trophy room** | See secret goals you’ve unlocked |

## Your first win (about 5 minutes)

1. Open **Creature builder**.
2. Load a preset — **Simple Hopper** is a good starter.
3. On the strip, set **Skill → Walk**, **Goal → Run**, **Env → Flat Ground** (or similar).
4. Open **Train** and press **Evolve**.
5. Let a few rounds finish. Press **Play best** to watch the winner alone.
6. Press **Save model** if you like it.

That’s a full loop: body → goal → train → enjoy.

## Building tips (when you draw your own)

- **Triangles beat chains.** Three joints with three bones hold shape; a long snake flops.
- Add at least one **muscle** (and mark **feet** if the goal cares about stepping).
- Start small. A sturdy hopper or walker trains faster than a masterpiece with twenty muscles.
- Use **Physics settle** in the builder to see how the body rests before you train.
- **Save current** in the builder stores the body in your library; **Creatures** is where you browse everything later.

## Training tips

- **Evolve** tries many brains at once. Ghost outlines are the rest of the pack.
- If nothing improves, try a simpler body, a flatter env, or a shorter try length in Training setup.
- **Play best** is for watching; **Keep training** continues from the elite of the current run.
- Saved brains live under **Creatures**. Train’s “Start from” can warm-start from a saved brain once you have one.
- Disco, flight, and wheeled goals need matching body bits (aero parts, wheels, etc.). Stick to Walk / Run until that feels natural.

## Advanced — fine-tuning training

All optional; defaults work. When you want to steer a run:

- **Training setup** — recipe presets plus individual knobs: pack size (**How many try**), on-screen pack (**How many you watch**), **Try length**, **Mutation style** (careful ↔ wild), **Start from** (fresh / best of run / saved brain), elites (**Keep the champions**), breeding strictness, and rounds limit.
- **Schedules** — settle down over time, short tries first, stop a try after a fall, mix two parents.
- **Priorities** — sliders that tilt the score mix (not physics). Only sliders relevant to the selected goal are shown. **Train in stages** chains Stay tall → Run → Sprint; **Train course stages** grows a course as fitness clears each step.
- **More training options** — raycast whisker senses (needs a fresh evolve), race your record (ghost), messy bodies (mass/length jitter), evolve body traits / structure, and a downloadable training log.
- **Reading a run** — the **Rewards** panel breaks the best score into its terms; **Stats** and the network visualizer show fitness history and the live brain.
- **Course scoring** (Environment builder) — penalty zones, touch-once reward zones, start / checkpoint / finish markers for timed sprints, launch pads + landing zones for flight.

## Fun ideas to try next

- Train the same walker on **rough** or obstacle courses.
- Build a **hopper**, switch Goal to Jump, and chase height.
- Open **Environment builder**, drop a few boxes, save the env, then train against it.
- Load **Disco**, pick a track, and mess with band → muscle routing (chaos is allowed).
- Leave Train running while you check **Trophy room** — secrets unlock as you experiment.
- Save two models and try **Head-to-head**.

## If something feels stuck

- Empty design? Load a preset or place joints in the builder first.
- Evolve greyed out? Need muscles (or wheels) on the body.
- Creature pancakes? Add cross-bracing (triangles / solid struts).
- Lost your best brain? Check **Creatures → Saved brains**, or Save model after a good run.

Have fun — silly experiments are the point.
