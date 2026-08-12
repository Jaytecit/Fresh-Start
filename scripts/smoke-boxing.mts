/**
 * K7 smoke: divisions, opponent-only Rapier probes, scoring, and Boxing shapes.
 */
import assert from 'node:assert/strict';
import {
  BOXING_DIVISIONS,
  boxingEligibility,
  computeBoxingMetrics,
} from '../src/boxing/divisions.ts';
import {
  createBoxingHitTracker,
  createBoxingProbes,
  detectBoxingHits,
} from '../src/boxing/hitProbes.ts';
import {
  GROUNDED_FIGHTER,
  OPEN_FRAME_FIGHTER,
  UPRIGHT_FIGHTER,
} from '../src/boxing/referenceFighters.ts';
import { scoreBoxingHit, emptyFighterScore } from '../src/boxing/scoring.ts';
import {
  boxingRangeQuality,
  computeBoxingTrainingFitness,
  createBoxingBehaviorMetrics,
  DEFAULT_BOXING_PRIORITIES,
  type BoxingFitnessInput,
} from '../src/boxing/rewards.ts';
import { sparringDesignForDivision } from '../src/brain/boxingTraining.ts';
import {
  BOXING_OBS_COUNT,
  BOXING_OBS_PACK_VERSION,
  buildBoxingObservations,
} from '../src/brain/boxingObs.ts';
import { BOXOBOT } from '../src/creature/boxoBot.ts';
import { cloneDesign } from '../src/creature/types.ts';
import { FIXED_DT } from '../src/physics/constants.ts';
import { encodeGroups, spawnCreature } from '../src/physics/spawn.ts';
import { createWorld, initRapier } from '../src/physics/world.ts';
import { featureFlags } from '../src/port/featureFlags.ts';
import { exportModelJson, importModelJson } from '../src/library/jsonIO.ts';
import { shapeForBoxingDesign, Simulation } from '../src/sim/simulation.ts';

function ok(condition: boolean, message: string): void {
  assert.equal(condition, true, message);
}

function assertDivisions(): void {
  ok(featureFlags.boxingMode, 'boxingMode flag on');
  ok(
    boxingEligibility(BOXOBOT, 'upright').eligible,
    'BoxoBot upright eligible',
  );
  ok(
    boxingEligibility(UPRIGHT_FIGHTER, 'upright').eligible,
    'upright reference eligible',
  );
  ok(
    boxingEligibility(GROUNDED_FIGHTER, 'grounded').eligible,
    'grounded reference eligible',
  );
  ok(
    boxingEligibility(OPEN_FRAME_FIGHTER, 'open-frame').eligible,
    'open reference eligible',
  );
  assert.equal(
    sparringDesignForDivision('upright').name,
    BOXOBOT.name,
    'BoxoBot is default upright sparring partner',
  );
  assert.equal(
    sparringDesignForDivision('open-frame').name,
    BOXOBOT.name,
    'BoxoBot is default open-frame sparring partner',
  );
  const invalid = cloneDesign(UPRIGHT_FIGHTER);
  invalid.joints.forEach((joint) => {
    delete joint.isGlove;
  });
  const result = boxingEligibility(invalid, 'upright');
  ok(!result.eligible, 'missing gloves rejected');
  ok(
    result.reasons.some((reason) => reason.includes('marked gloves')),
    'eligibility explains missing gloves',
  );
  ok(BOXING_DIVISIONS.every((division) => division.ruleVersion === 1), 'v1 rules');

  const movedGlove = cloneDesign(UPRIGHT_FIGHTER);
  movedGlove.joints.find((joint) => joint.isGlove)!.y += 100;
  assert.equal(
    computeBoxingMetrics(movedGlove).aspectRatio,
    computeBoxingMetrics(UPRIGHT_FIGHTER).aspectRatio,
    'glove position cannot alter core aspect ratio',
  );
  const rigidMass = cloneDesign(UPRIGHT_FIGHTER);
  rigidMass.bones.push({
    id: 999_001,
    a: rigidMass.joints[0].id,
    b: rigidMass.joints[1].id,
    rigid: true,
    mass: 1_000_000,
  });
  assert.equal(
    computeBoxingMetrics(rigidMass).totalMass,
    computeBoxingMetrics(UPRIGHT_FIGHTER).totalMass,
    'nonphysical rigid strut contributes no division mass',
  );
}

async function scriptedHit(): Promise<{
  points: number;
  power: number;
  accuracy: number;
}> {
  const world = createWorld();
  try {
    const a = spawnCreature(world, UPRIGHT_FIGHTER, { x: -1, y: 0 });
    const b = spawnCreature(world, UPRIGHT_FIGHTER, { x: 1, y: 0 });
    const normalGroups = a.joints[0].body.collider(0).collisionGroups();
    assert.equal(normalGroups, encodeGroups(0b0001, 0b0100), 'joint groups unchanged');
    const probesA = createBoxingProbes(world, a, 0);
    const probesB = createBoxingProbes(world, b, 1);
    const glove = a.joints.find((joint) => joint.isGlove)!;
    const target = b.joints.find((joint) => joint.isHitTarget)!;
    const targetPosition = target.body.translation();
    glove.body.setTranslation(
      { x: targetPosition.x - 0.2, y: targetPosition.y },
      true,
    );
    glove.body.setLinvel({ x: 3, y: 0 }, true);
    target.body.setLinvel({ x: 0, y: 0 }, true);
    world.timestep = FIXED_DT;
    world.step();
    const tracker = createBoxingHitTracker();
    const first = detectBoxingHits(world, [probesA, probesB], tracker, 1);
    assert.equal(first.length, 1, 'opponent glove scores once');
    assert.deepEqual(tracker.attempts, [1, 0], 'new opponent contact counts attempt');
    const resting = detectBoxingHits(world, [probesA, probesB], tracker, 1 + FIXED_DT);
    assert.equal(resting.length, 0, 'resting overlap cannot farm points');
    return {
      points: first[0].points,
      power: first[0].power,
      accuracy: first[0].accuracy,
    };
  } finally {
    world.free();
  }
}

function mirrorDesign(design: typeof UPRIGHT_FIGHTER): typeof UPRIGHT_FIGHTER {
  const mirrored = cloneDesign(design);
  const xs = mirrored.joints.map((joint) => joint.x);
  const center = (Math.min(...xs) + Math.max(...xs)) / 2;
  mirrored.joints.forEach((joint) => {
    joint.x = center * 2 - joint.x;
  });
  return mirrored;
}

function assertCornerSymmetry(): void {
  const world = createWorld();
  try {
    const a = spawnCreature(world, UPRIGHT_FIGHTER, { x: -3, y: 0 });
    const b = spawnCreature(world, mirrorDesign(UPRIGHT_FIGHTER), { x: 3, y: 0 });
    const fromA = buildBoxingObservations(a, b, 7, 3, 0.5, 0.25);
    const fromB = buildBoxingObservations(b, a, 7, 3, 0.5, 0.25);
    for (let i = 0; i < BOXING_OBS_COUNT; i++) {
      assert.ok(
        Math.abs(fromA[i] - fromB[i]) < 1e-6,
        `corner-normalized observation ${i}`,
      );
    }
  } finally {
    world.free();
  }
}

async function assertPinnedControllerRate(): Promise<void> {
  const simulation = new Simulation();
  await simulation.init();
  try {
    const shape = shapeForBoxingDesign(UPRIGHT_FIGHTER);
    simulation.brainHz = 60;
    simulation.startBoxingMatch({
      entries: [
        {
          design: cloneDesign(UPRIGHT_FIGHTER),
          shape,
          weights: new Float32Array(shape.weightCount),
        },
        {
          design: cloneDesign(UPRIGHT_FIGHTER),
          shape,
          weights: new Float32Array(shape.weightCount),
        },
      ],
      divisionId: 'upright',
      episodeSeconds: 4,
    });
    assert.equal(simulation.brainHz, 30, 'Boxing pins controller to training rate');
    simulation.abortBoxingMatch();
    assert.equal(simulation.brainHz, 60, 'leaving Boxing restores controller rate');
  } finally {
    simulation.world?.free();
    simulation.world = null;
  }
}

function assertBoxingModelCompatibility(): void {
  const shape = shapeForBoxingDesign(UPRIGHT_FIGHTER);
  const raw = exportModelJson({
    name: 'BoxerT',
    task: 'boxing',
    shape,
    weights: new Float32Array(shape.weightCount),
    fitness: 1,
    design: UPRIGHT_FIGHTER,
    boxingMeta: {
      divisionId: 'upright',
      ruleVersion: 1,
      obsPackVersion: 2,
      brainHz: 30,
    },
  });
  const imported = importModelJson(raw);
  ok(imported.ok, 'compatible Boxing metadata imports');
  if (imported.ok) {
    assert.equal(imported.value.boxingMeta?.obsPackVersion, 2);
    assert.equal(imported.value.boxingMeta?.brainHz, 30);
  }
  const stale = JSON.parse(raw);
  stale.boxingMeta.obsPackVersion = 1;
  ok(
    !importModelJson(JSON.stringify(stale)).ok,
    'obs pack v1 Boxing metadata rejected',
  );
  const incompatible = JSON.parse(raw);
  delete incompatible.boxingMeta.brainHz;
  ok(
    !importModelJson(JSON.stringify(incompatible)).ok,
    'incompatible Boxing controller metadata rejected',
  );
}

function assertOwnerAndThresholdFilters(): void {
  const base = {
    attacker: 0 as const,
    defender: 1 as const,
    gloveJointId: 1,
    targetJointId: 2,
    targetValue: 1,
    gloveMass: 1,
    closingSpeed: 2,
    relativeSpeed: 2,
    centreDistance: 0.2,
    combinedRadius: 1,
    time: 1,
  };
  assert.equal(
    scoreBoxingHit({ ...base, defender: 0 }),
    null,
    'same owner rejected',
  );
  assert.equal(
    scoreBoxingHit({ ...base, closingSpeed: 0 }),
    null,
    'below threshold rejected',
  );
  assert.equal(
    scoreBoxingHit({ ...base, closingSpeed: -2 }),
    null,
    'separating motion rejected',
  );
}

function fixtureResult(opts: {
  ownPoints: number;
  rivalPoints: number;
  ownHits: number;
  ownAttempts: number;
  upright: number;
  engagementSteps: number;
  farSteps: number;
  clinchSteps: number;
  maxIdle: number;
  winner: 0 | 1 | null;
}): BoxingFitnessInput {
  const behavior = createBoxingBehaviorMetrics();
  const steps = Math.max(
    1,
    opts.engagementSteps + opts.farSteps + opts.clinchSteps,
  );
  behavior.fighters[0].steps = steps;
  behavior.fighters[0].engagementSteps = opts.engagementSteps;
  behavior.fighters[0].farSteps = opts.farSteps;
  behavior.fighters[0].clinchSteps = opts.clinchSteps;
  behavior.fighters[0].maxAttemptIdleSeconds = opts.maxIdle;
  const own = emptyFighterScore();
  own.points = opts.ownPoints;
  own.hits = opts.ownHits;
  own.attempts = opts.ownAttempts;
  own.totalAccuracy = opts.ownHits * 0.8;
  own.totalPower = opts.ownHits * 10;
  const rival = emptyFighterScore();
  rival.points = opts.rivalPoints;
  return {
    score: {
      divisionId: 'upright',
      ruleVersion: 1,
      fighters: [own, rival],
      hits: [],
    },
    winner: opts.winner,
    upright: [opts.upright, 1],
    behavior,
    episodeDuration: 12,
  };
}

function assertRewardShaping(): void {
  assert.equal(BOXING_OBS_PACK_VERSION, 2, 'obs pack v2');
  assert.equal(boxingRangeQuality(3), 1, 'mid-range engagement quality');
  assert.ok(boxingRangeQuality(9) < 0.5, 'far camp quality drops');
  assert.ok(boxingRangeQuality(0.2) < 0.5, 'clinch quality drops');

  const engager = computeBoxingTrainingFitness(
    fixtureResult({
      ownPoints: 12,
      rivalPoints: 2,
      ownHits: 3,
      ownAttempts: 4,
      upright: 0.9,
      engagementSteps: 80,
      farSteps: 10,
      clinchSteps: 10,
      maxIdle: 1,
      winner: 0,
    }),
  );
  const idle = computeBoxingTrainingFitness(
    fixtureResult({
      ownPoints: 0,
      rivalPoints: 0,
      ownHits: 0,
      ownAttempts: 0,
      upright: 0.9,
      engagementSteps: 20,
      farSteps: 80,
      clinchSteps: 0,
      maxIdle: 12,
      winner: null,
    }),
  );
  const whiff = computeBoxingTrainingFitness(
    fixtureResult({
      ownPoints: 0,
      rivalPoints: 0,
      ownHits: 0,
      ownAttempts: 12,
      upright: 0.9,
      engagementSteps: 80,
      farSteps: 10,
      clinchSteps: 10,
      maxIdle: 1,
      winner: null,
    }),
  );
  const camp = computeBoxingTrainingFitness(
    fixtureResult({
      ownPoints: 4,
      rivalPoints: 0,
      ownHits: 1,
      ownAttempts: 1,
      upright: 0.9,
      engagementSteps: 5,
      farSteps: 95,
      clinchSteps: 0,
      maxIdle: 8,
      winner: 0,
    }),
  );
  const collapsed = computeBoxingTrainingFitness(
    fixtureResult({
      ownPoints: 12,
      rivalPoints: 2,
      ownHits: 3,
      ownAttempts: 4,
      upright: 0.1,
      engagementSteps: 80,
      farSteps: 10,
      clinchSteps: 10,
      maxIdle: 1,
      winner: 0,
    }),
  );

  ok(engager.fitness > idle.fitness, 'engager beats idle camper');
  ok(engager.fitness > whiff.fitness, 'engager beats whiff spam');
  ok(engager.fitness > camp.fitness, 'engager beats wall camp');
  ok(engager.fitness > collapsed.fitness, 'stance collapse is penalized');
  ok(idle.inactivity > 0, 'idle incurs inactivity penalty');
  ok(whiff.whiffSpam > 0, 'whiff spam penalty fires');
  ok(camp.camp > 0, 'camp penalty fires');
  ok(collapsed.collapse > 0, 'collapse penalty fires');

  const defenseHeavy = computeBoxingTrainingFitness(engagerInput(), {
    ...DEFAULT_BOXING_PRIORITIES,
    defense: 1,
    offense: 0,
  });
  const offenseHeavy = computeBoxingTrainingFitness(engagerInput(), {
    ...DEFAULT_BOXING_PRIORITIES,
    offense: 1,
    defense: 0,
  });
  ok(
    defenseHeavy.damageTaken > offenseHeavy.damageTaken,
    'defense priority amplifies points-against penalty',
  );
  ok(
    offenseHeavy.offense > defenseHeavy.offense,
    'offense priority amplifies scoring reward',
  );
}

function engagerInput(): BoxingFitnessInput {
  return fixtureResult({
    ownPoints: 12,
    rivalPoints: 4,
    ownHits: 3,
    ownAttempts: 4,
    upright: 0.9,
    engagementSteps: 80,
    farSteps: 10,
    clinchSteps: 10,
    maxIdle: 1,
    winner: 0,
  });
}

async function main(): Promise<void> {
  await initRapier();
  assertDivisions();
  assertOwnerAndThresholdFilters();
  assertRewardShaping();
  assertCornerSymmetry();
  assertBoxingModelCompatibility();
  await assertPinnedControllerRate();
  const first = await scriptedHit();
  const second = await scriptedHit();
  assert.deepEqual(first, second, 'fixed-step hit metrics reproducible');
  const shape = shapeForBoxingDesign(UPRIGHT_FIGHTER);
  assert.equal(shape.inputCount, BOXING_OBS_COUNT, 'Boxing shape uses dedicated obs');
  assert.equal(BOXING_OBS_COUNT, 24, 'Boxing obs pack v2 has 24 channels');
  console.log(
    `boxing OK points=${first.points} power=${first.power.toFixed(3)} accuracy=${first.accuracy.toFixed(3)} inputs=${shape.inputCount}`,
  );
  console.log('smoke-boxing: all OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
