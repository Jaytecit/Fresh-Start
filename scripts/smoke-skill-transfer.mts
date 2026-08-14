/**
 * Cross-skill prefix transplant: loco → boxing/joust/dance; shrink and pack-swap refused.
 * Run: npx tsx scripts/smoke-skill-transfer.mts
 */
import assert from 'node:assert/strict';
import { adaptEliteToDesign } from '../src/brain/adaptElite.ts';
import {
  BOXING_OBS_COUNT,
  BOXING_OBS_PACK_VERSION,
  buildBoxingObservations,
} from '../src/brain/boxingObs.ts';
import { OBS_COUNT, RAYCAST_OBS_COUNT } from '../src/brain/constants.ts';
import {
  JOUST_OBS_COUNT,
  JOUST_OBS_PACK_VERSION,
} from '../src/brain/joustObs.ts';
import { makeShape, randomWeights, createRng } from '../src/brain/network.ts';
import { buildObservations } from '../src/brain/observations.ts';
import {
  canTransplantShapes,
  transplantWeights,
  trimInputPrefix,
} from '../src/brain/transplantWeights.ts';
import { UPRIGHT_FIGHTER } from '../src/boxing/referenceFighters.ts';
import { JOUSTBOT } from '../src/creature/joustBot.ts';
import { createWorld, initRapier } from '../src/physics/world.ts';
import { spawnCreature } from '../src/physics/spawn.ts';
import {
  shapeForBoxingDesign,
  shapeForDesign,
  shapeForJoustingDesign,
} from '../src/sim/simulation.ts';

function assertPrefixTransplant(): void {
  const from = makeShape(4, OBS_COUNT);
  const to = makeShape(4, BOXING_OBS_COUNT);
  assert.equal(canTransplantShapes(from, to), true);
  assert.equal(canTransplantShapes(to, from), false);

  const src = new Float32Array(from.weightCount);
  for (let i = 0; i < src.length; i++) src[i] = i + 1;
  const out = transplantWeights(from, src, to, createRng(1));
  assert.ok(out);
  assert.equal(out.length, to.weightCount);
  const sharedH = Math.min(from.hiddenCount, to.hiddenCount);
  for (let h = 0; h < sharedH; h++) {
    for (let i = 0; i < OBS_COUNT; i++) {
      assert.equal(
        out[h * to.inputCount + i],
        src[h * from.inputCount + i],
        `prefix W1 h=${h} i=${i}`,
      );
    }
  }
  assert.equal(transplantWeights(to, out, from), null, 'input shrink refused');
}

function assertRaycastTrim(): void {
  const ray = makeShape(3, RAYCAST_OBS_COUNT);
  const weights = randomWeights(ray, createRng(2));
  const trimmed = trimInputPrefix(ray, weights, OBS_COUNT);
  assert.ok(trimmed);
  assert.equal(trimmed.shape.inputCount, OBS_COUNT);
  assert.equal(trimmed.shape.hiddenCount, ray.hiddenCount);
  assert.equal(trimmed.shape.outputCount, ray.outputCount);
  for (let h = 0; h < ray.hiddenCount; h++) {
    for (let i = 0; i < OBS_COUNT; i++) {
      assert.equal(
        trimmed.weights[h * OBS_COUNT + i],
        weights[h * RAYCAST_OBS_COUNT + i],
      );
    }
  }
}

function assertAdaptElite(): void {
  const loco = shapeForDesign(UPRIGHT_FIGHTER);
  const box = shapeForBoxingDesign(UPRIGHT_FIGHTER);
  const joust = shapeForJoustingDesign(JOUSTBOT);
  const weights = randomWeights(loco, createRng(3));
  const elite = {
    shape: loco,
    genome: { weights, fitness: 1 },
  };
  const adapted = adaptEliteToDesign(elite, UPRIGHT_FIGHTER, {
    task: 'boxing',
    sourceTask: 'run',
  });
  assert.ok(adapted);
  assert.equal(adapted.shape.inputCount, box.inputCount);
  assert.equal(adapted.shape.outputCount, box.outputCount);

  const boxed = {
    shape: box,
    genome: { weights: randomWeights(box, createRng(4)), fitness: 1 },
  };
  assert.equal(
    adaptEliteToDesign(boxed, UPRIGHT_FIGHTER, {
      task: 'run',
      sourceTask: 'boxing',
    }),
    null,
    'boxing → walk refused',
  );
  assert.equal(
    adaptEliteToDesign(boxed, JOUSTBOT, {
      task: 'jousting',
      sourceTask: 'boxing',
    }),
    null,
    'boxing → joust refused',
  );
  assert.equal(
    adaptEliteToDesign(boxed, JOUSTBOT, {
      task: 'jousting',
      sourceTask: 'jousting',
    }),
    null,
    'boxing-sized elite cannot pretend to be joust',
  );
  assert.ok(joust.inputCount !== box.inputCount, 'joust pack size distinct from boxing');
}

function assertBoxingPrefixMatchesLoco(): void {
  const world = createWorld();
  try {
    const a = spawnCreature(world, UPRIGHT_FIGHTER, { x: -3, y: 0 });
    const b = spawnCreature(world, UPRIGHT_FIGHTER, { x: 3, y: 0 });
    const ctx = { timeSec: 0.25 };
    const loco = buildObservations(a, undefined, ctx);
    const boxing = buildBoxingObservations(a, b, 7, 3, 0.5, 0.25, undefined, ctx);
    assert.equal(boxing.length, BOXING_OBS_COUNT);
    for (let i = 0; i < OBS_COUNT; i++) {
      assert.ok(
        Math.abs(boxing[i]! - loco[i]!) < 1e-6,
        `boxing prefix channel ${i}`,
      );
    }
  } finally {
    world.free();
  }
}

async function main(): Promise<void> {
  await initRapier();
  assert.equal(BOXING_OBS_PACK_VERSION, 3);
  assert.equal(JOUST_OBS_PACK_VERSION, 2);
  assert.equal(BOXING_OBS_COUNT, OBS_COUNT + 12);
  assert.equal(JOUST_OBS_COUNT, OBS_COUNT + 14);
  assertPrefixTransplant();
  assertRaycastTrim();
  assertAdaptElite();
  assertBoxingPrefixMatchesLoco();
  console.log('smoke-skill-transfer: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
