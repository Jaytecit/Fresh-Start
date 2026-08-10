/**
 * D18 — structural grow/prune + padded channel budget.
 * Run: npx tsx scripts/smoke-structure-morph.mts
 */
import { createRng, makeShape } from '../src/brain/network.ts';
import { countBrainActuatorChannels } from '../src/brain/driveGroups.ts';
import {
  growDistal,
  mutateStructure,
  remapPaddedActuatorDrives,
  structureChannelBudget,
  summarizeTopology,
} from '../src/creature/structureGenes.ts';
import { SIMPLE_HOPPER } from '../src/creature/presets.ts';
import { cloneDesign } from '../src/creature/types.ts';
import { gauntletEnv } from '../src/env/gauntletEnv.ts';
import { FIXED_DT } from '../src/physics/constants.ts';
import { Simulation } from '../src/sim/simulation.ts';
import { isFeatureEnabled } from '../src/port/featureFlags.ts';

async function main() {
  if (!isFeatureEnabled('structuralMorphEvolve')) {
    throw new Error('structuralMorphEvolve flag should be enabled for D18');
  }
  if (!isFeatureEnabled('morphEvolve')) {
    throw new Error('morphEvolve flag should be enabled for D18');
  }

  const rng = createRng(99);
  const base = cloneDesign(SIMPLE_HOPPER);
  const budget = structureChannelBudget(base, true);
  if (budget.outputCount < 1) throw new Error('budget empty');

  let grown = base;
  let grew = false;
  for (let i = 0; i < 12; i++) {
    const next = growDistal(grown, base, rng);
    if (next) {
      grown = next;
      grew = true;
      break;
    }
  }
  if (!grew) throw new Error('growDistal failed to add a segment');
  if (grown.joints.length <= base.joints.length) {
    throw new Error('grown design should add a joint');
  }
  if (grown.bones.length <= base.bones.length) {
    throw new Error('grown design should add a bone');
  }

  let mutated = grown;
  for (let i = 0; i < 24; i++) {
    mutated = mutateStructure(mutated, base, rng);
  }
  const summary = summarizeTopology(mutated);
  if (summary.joints < base.joints.length) {
    throw new Error('mutateStructure pruned below base floor');
  }
  if (countBrainActuatorChannels(mutated.muscles) > budget.maxMuscleChannels) {
    throw new Error('muscle channels exceed pad budget');
  }

  const padded = new Array(budget.outputCount).fill(0).map((_, i) => (i + 1) * 0.01);
  const remapped = remapPaddedActuatorDrives(
    mutated,
    padded,
    budget.maxMuscleChannels,
    true,
  );
  const muscleCh = countBrainActuatorChannels(mutated.muscles);
  if (remapped.length < muscleCh) {
    throw new Error('remap shorter than muscle channels');
  }

  const shape = makeShape(budget.outputCount);
  if (shape.outputCount !== budget.outputCount) {
    throw new Error('padded shape mismatch');
  }

  const sim = new Simulation();
  await sim.init();
  sim.setEnvironment(gauntletEnv());

  let finished = false;
  let maxAgents = 0;
  sim.startLiveEvolve({
    design: base,
    task: 'run',
    populationSize: 6,
    batchSize: 3,
    episodeSeconds: 0.5,
    maxGenerations: 2,
    seed: 11,
    morphEvolve: true,
    structuralMorphEvolve: true,
    breed: { stopAfterFall: true, eliteCount: 1, tournamentSize: 2 },
    onFinished: () => {
      finished = true;
    },
  });

  const steps = Math.round((0.5 * 4 + 0.5) / FIXED_DT);
  for (let i = 0; i < steps; i++) {
    const snap = sim.step(FIXED_DT);
    maxAgents = Math.max(maxAgents, snap.agents.length);
  }
  for (let i = 0; i < 120 && !finished; i++) sim.step(FIXED_DT);
  if (!finished) {
    sim.requestStopEvolve();
    for (let i = 0; i < 200 && !finished; i++) sim.step(FIXED_DT);
  }
  if (maxAgents < 3) {
    throw new Error(`expected batch of 3, maxAgents=${maxAgents}`);
  }
  if (!finished) throw new Error('structure morph evolve did not finish');

  console.log('smoke-structure-morph: ok', {
    baseJoints: base.joints.length,
    grownJoints: grown.joints.length,
    mutated: summary,
    budget,
    maxAgents,
    finished,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
