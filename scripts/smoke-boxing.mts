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
  BOXING_A_SOLID,
  BOXING_B_SOLID,
  boxingSolidGroups,
  enableBoxingOpponentContact,
} from '../src/boxing/opponentContact.ts';
import {
  GROUNDED_FIGHTER,
  OPEN_FRAME_FIGHTER,
  UPRIGHT_FIGHTER,
} from '../src/boxing/referenceFighters.ts';
import { scoreBoxingHit, emptyFighterScore } from '../src/boxing/scoring.ts';
import {
  createBoxingFighterClock,
  isBoxingTkoHit,
  resolveBoxingStop,
  updateBoxingFighterClock,
} from '../src/boxing/knockdown.ts';
import {
  BOXING_ENGAGE_MAX,
  BOXING_ENGAGE_MIN,
  boxingEngageBand,
  boxingRangeQuality,
  computeBoxingTrainingFitness,
  createBoxingBehaviorMetrics,
  DEFAULT_BOXING_PRIORITIES,
  type BoxingFitnessInput,
} from '../src/boxing/rewards.ts';
import { sparringDesignForDivision } from '../src/brain/boxingTraining.ts';
import {
  BOXOBOT_V2,
  BOXOBOT_V2T_NAME,
  normalizeSparringOpponentId,
  resolveSparringOpponent,
} from '../src/boxing/sparringOpponents.ts';
import {
  BOXING_OBS_COUNT,
  BOXING_OBS_PACK_VERSION,
  buildBoxingObservations,
} from '../src/brain/boxingObs.ts';
import { BOXOBOT } from '../src/creature/boxoBot.ts';
import { cloneDesign } from '../src/creature/types.ts';
import { boxingRingEnv } from '../src/env/boxingRingEnv.ts';
import {
  clampCombatRounds,
  clampRoundSeconds,
  defaultRoundSeconds,
  roundLengthLabel,
} from '../src/combat/format.ts';
import { EPISODE_SECONDS, OBS_COUNT } from '../src/brain/constants.ts';
import {
  BOXING_MATCH_SECONDS,
  FIXED_DT,
  JOINT_RADIUS,
  JOUST_MAX_SECONDS,
} from '../src/physics/constants.ts';
import { encodeGroups, spawnCreature } from '../src/physics/spawn.ts';
import { createWorld, initRapier } from '../src/physics/world.ts';
import { featureFlags } from '../src/port/featureFlags.ts';
import { exportModelJson, importModelJson } from '../src/library/jsonIO.ts';
import { resolveBoxingCorner } from '../src/combat/resolveCorners.ts';
import { displayNameForTrained } from '../src/library/fileVocabulary.ts';
import { shapeForBoxingDesign, Simulation } from '../src/sim/simulation.ts';

function ok(condition: boolean, message: string): void {
  assert.equal(condition, true, message);
}

function assertCombatFormat(): void {
  assert.equal(clampCombatRounds(0), 1);
  assert.equal(clampCombatRounds(99), 12);
  assert.equal(clampCombatRounds(3.4), 3);
  assert.equal(defaultRoundSeconds('boxing'), BOXING_MATCH_SECONDS);
  assert.equal(defaultRoundSeconds('joust'), JOUST_MAX_SECONDS);
  assert.equal(defaultRoundSeconds('race'), EPISODE_SECONDS);
  assert.equal(clampRoundSeconds('boxing', 45), 45);
  assert.equal(clampRoundSeconds('boxing', 50), 45);
  assert.equal(clampRoundSeconds('joust', 11), 12);
  assert.equal(roundLengthLabel('boxing'), 'Round length');
  assert.equal(roundLengthLabel('joust'), 'Pass length');
  assert.equal(roundLengthLabel('race'), 'Heat length');
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

  ok(
    boxingEligibility(BOXOBOT_V2, 'upright').eligible,
    'BoxoBot V2 upright eligible',
  );
  ok(
    boxingEligibility(BOXOBOT_V2, 'open-frame').eligible,
    'BoxoBot V2 open-frame eligible',
  );
  const dummy = resolveSparringOpponent('upright', 'dummy', 1);
  assert.equal(dummy.design.name, BOXOBOT.name);
  assert.equal(dummy.trained, false);
  const v2t = resolveSparringOpponent('upright', 'boxobot-v2t', 1);
  assert.equal(v2t.name, BOXOBOT_V2T_NAME);
  assert.equal(v2t.trained, true);
  assert.equal(v2t.design.name, BOXOBOT_V2.name);
  const expectedV2T = shapeForBoxingDesign(v2t.design);
  assert.equal(v2t.weights.length, expectedV2T.weightCount);
  assert.equal(v2t.shape.inputCount, expectedV2T.inputCount);
  assert.equal(v2t.shape.outputCount, expectedV2T.outputCount);
  assert.equal(
    normalizeSparringOpponentId('grounded', 'boxobot-v2t'),
    'dummy',
    'V2T is not a grounded sparring option',
  );
  const groundedFallback = resolveSparringOpponent('grounded', 'boxobot-v2t', 1);
  assert.equal(groundedFallback.id, 'dummy');
  assert.equal(groundedFallback.design.name, GROUNDED_FIGHTER.name);

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
    enableBoxingOpponentContact(a, 0);
    enableBoxingOpponentContact(b, 1);
    assert.equal(
      a.joints[0].body.collider(0).collisionGroups(),
      boxingSolidGroups(0, 'joint'),
      'fighter A solid joint groups',
    );
    assert.equal(
      b.bones[0].body.collider(0).collisionGroups(),
      boxingSolidGroups(1, 'bone'),
      'fighter B solid bone groups',
    );
    const probesA = createBoxingProbes(world, a, 0);
    const probesB = createBoxingProbes(world, b, 1);
    ok(probesA.gloves[0].collider.isSensor(), 'glove probe remains sensor');
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

function assertOpponentSolidSeparation(): void {
  const world = createWorld();
  try {
    const a = spawnCreature(world, UPRIGHT_FIGHTER, { x: 0, y: 0 });
    const b = spawnCreature(world, UPRIGHT_FIGHTER, { x: 0, y: 0 });
    enableBoxingOpponentContact(a, 0);
    enableBoxingOpponentContact(b, 1);

    const aJoint = a.joints.find((joint) => joint.isHitTarget)!;
    const bJoint = b.joints.find((joint) => joint.isHitTarget)!;
    aJoint.body.setTranslation({ x: 0, y: 3 }, true);
    bJoint.body.setTranslation({ x: 0, y: 3 }, true);
    aJoint.body.setLinvel({ x: 0, y: 0 }, true);
    bJoint.body.setLinvel({ x: 0, y: 0 }, true);

    const aGroups = aJoint.body.collider(0).collisionGroups();
    const bGroups = bJoint.body.collider(0).collisionGroups();
    ok((aGroups & 0xffff & BOXING_A_SOLID) !== 0, 'A membership includes A_SOLID');
    ok((bGroups & 0xffff & BOXING_B_SOLID) !== 0, 'B membership includes B_SOLID');
    ok(
      ((aGroups >>> 16) & BOXING_A_SOLID) === 0,
      'A filter excludes own solid bit',
    );
    ok(
      ((bGroups >>> 16) & BOXING_B_SOLID) === 0,
      'B filter excludes own solid bit',
    );

    world.timestep = FIXED_DT;
    for (let i = 0; i < 20; i++) world.step();
    const pa = aJoint.body.translation();
    const pb = bJoint.body.translation();
    const separation = Math.hypot(pa.x - pb.x, pa.y - pb.y);
    ok(
      separation >= JOINT_RADIUS * 1.5,
      `opponent solids separate nested heads (got ${separation.toFixed(3)})`,
    );

    const ghost = spawnCreature(world, UPRIGHT_FIGHTER, { x: 8, y: 0 });
    const ghostGroups = ghost.joints[0].body.collider(0).collisionGroups();
    assert.equal(
      ghostGroups,
      encodeGroups(0b0001, 0b0100),
      'non-boxing spawn stays ghost-through',
    );
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
    for (let i = OBS_COUNT; i < BOXING_OBS_COUNT; i++) {
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
      obsPackVersion: 3,
      brainHz: 30,
    },
  });
  const imported = importModelJson(raw);
  ok(imported.ok, 'compatible Boxing metadata imports');
  if (imported.ok) {
    assert.equal(imported.value.boxingMeta?.obsPackVersion, 3);
    assert.equal(imported.value.boxingMeta?.brainHz, 30);
  }
  const stale = JSON.parse(raw);
  stale.boxingMeta.obsPackVersion = 2;
  ok(
    !importModelJson(JSON.stringify(stale)).ok,
    'obs pack v2 Boxing metadata rejected',
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
    targetIsHead: false,
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
  assert.equal(BOXING_OBS_PACK_VERSION, 3, 'obs pack v3');
  assert.equal(boxingRangeQuality(3), 1, 'mid-range engagement quality');
  assert.ok(boxingRangeQuality(9) < 0.5, 'far camp quality drops');
  assert.ok(boxingRangeQuality(0.2) < 0.5, 'clinch quality drops');
  const wideBand = { min: 2.4, max: 10 };
  assert.equal(
    boxingRangeQuality(7, wideBand),
    1,
    '5 m-wide pair still engaged at 7 m',
  );
  assert.ok(
    boxingRangeQuality(2, wideBand) < 1,
    '5 m-wide pair overlapping is clinch',
  );

  const world = createWorld();
  try {
    const left = spawnCreature(world, cloneDesign(UPRIGHT_FIGHTER), {
      x: -6,
      y: 0,
    });
    const right = spawnCreature(world, cloneDesign(UPRIGHT_FIGHTER), {
      x: 6,
      y: 0,
    });
    const ref = boxingEngageBand(left, right);
    assert.ok(
      Math.abs(ref.min - BOXING_ENGAGE_MIN) < 0.2,
      `reference clinch min ${ref.min}`,
    );
    assert.ok(
      Math.abs(ref.max - BOXING_ENGAGE_MAX) < 0.2,
      `reference engage max ${ref.max}`,
    );

    const wideDesign = cloneDesign(UPRIGHT_FIGHTER);
    wideDesign.name = 'Wide Upright';
    for (const joint of wideDesign.joints) joint.x *= 2;
    const wideLeft = spawnCreature(world, wideDesign, { x: -8, y: 0 });
    const wideRight = spawnCreature(world, cloneDesign(wideDesign), {
      x: 8,
      y: 0,
    });
    const wide = boxingEngageBand(wideLeft, wideRight);
    assert.ok(
      wide.max > ref.max * 1.5,
      `wide engage max ${wide.max} vs reference ${ref.max}`,
    );
    assert.equal(boxingRangeQuality(7, wide), 1, 'wide punching range in-band');
    assert.ok(
      boxingRangeQuality(7) < 0.7,
      '7 m is far on the reference-sized band',
    );
  } finally {
    world.free();
  }

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

async function assertBoxingBrainProbeAndTrainingProgress(): Promise<void> {
  const simulation = new Simulation();
  await simulation.init();
  try {
    simulation.setEnvironment(boxingRingEnv());
    const shape = shapeForBoxingDesign(UPRIGHT_FIGHTER);
    const { randomWeights, createRng } = await import('../src/brain/network.ts');
    const weightsA = randomWeights(shape, createRng(7));
    const weightsB = randomWeights(shape, createRng(11));
    let progressTicks = 0;
    let finished = false;
    simulation.startBoxingMatch({
      entries: [
        {
          design: cloneDesign(UPRIGHT_FIGHTER),
          shape,
          weights: weightsA,
        },
        {
          design: cloneDesign(UPRIGHT_FIGHTER),
          shape,
          weights: weightsB,
        },
      ],
      divisionId: 'upright',
      episodeSeconds: 2,
      onProgress: () => {
        progressTicks += 1;
      },
      onFinished: () => {
        finished = true;
      },
    });

    // Brain evaluates at 30 Hz; need ≥2 FIXED_DT (60 Hz) steps to tick once.
    for (let i = 0; i < 4; i++) simulation.step(FIXED_DT);
    const early = simulation.snapshot();
    ok(early.brain !== null, 'Boxing snapshot exposes live brain probe');
    assert.equal(early.brain!.shape.inputCount, BOXING_OBS_COUNT);
    ok(
      early.brain!.inputs.some((v) => v !== 0),
      'Boxing brain inputs are non-zero after a controller tick',
    );
    ok(
      early.brain!.outputs.some((v) => Number.isFinite(v)),
      'Boxing brain outputs are finite',
    );

    const steps = Math.ceil(2 / FIXED_DT) + 4;
    for (let i = 0; i < steps && !finished; i++) {
      simulation.step(FIXED_DT);
    }
    ok(finished, 'Boxing match finishes after episodeSeconds');
    // Throttled ~4 Hz over 2s → about 8 ticks, not one-per-physics-step (~120).
    ok(
      progressTicks >= 4 && progressTicks < 40,
      `Boxing progress is throttled (got ${progressTicks})`,
    );
  } finally {
    simulation.world?.free();
    simulation.world = null;
  }
}

async function assertBoxingTrainingFitnessMoves(): Promise<void> {
  const { evolveBoxingBrain } = await import('../src/brain/boxingTraining.ts');
  const result = await evolveBoxingBrain({
    design: cloneDesign(UPRIGHT_FIGHTER),
    divisionId: 'upright',
    generations: 2,
    populationSize: 4,
    episodeSeconds: 4,
    seed: 42,
  });
  ok(Number.isFinite(result.genome.fitness), 'Boxing GA returns finite fitness');
  assert.equal(result.generations.length, 2, 'Boxing GA reports each generation');
  ok(
    result.shape.inputCount === BOXING_OBS_COUNT,
    'Boxing GA uses boxing observation pack',
  );
  const fitnesses = result.generations.map((g) => g.bestFitness);
  ok(
    fitnesses.every((f) => Number.isFinite(f)),
    'Boxing generation fitnesses are finite',
  );
}

async function assertBoxingLiveBatch(): Promise<void> {
  const { sparringDesignForDivision } = await import(
    '../src/brain/boxingTraining.ts'
  );
  const simulation = new Simulation();
  await simulation.init();
  try {
    simulation.setEnvironment(boxingRingEnv()); // walls ok; pairs spaced far apart
    simulation.setShowGhostPack(true);
    let finishCount = 0;
    let lastProgressBatch: number | undefined;
    const popSize = 4;
    const batchSize = 4;
    simulation.startBoxingLiveEvolve({
      design: cloneDesign(UPRIGHT_FIGHTER),
      divisionId: 'upright',
      opponentDesign: sparringDesignForDivision('upright'),
      populationSize: popSize,
      batchSize,
      maxGenerations: 1,
      episodeSeconds: 2,
      seed: 19,
      onProgress: (p) => {
        lastProgressBatch = p.batch;
      },
      onFinished: () => {
        finishCount += 1;
      },
    });

    for (let i = 0; i < 4; i++) simulation.step(FIXED_DT);
    const mid = simulation.snapshot();
    assert.equal(
      mid.agents.length,
      batchSize * 2,
      'ghost pack shows all trainee+sparring agents',
    );
    ok(mid.brain !== null, 'boxing-live exposes brain probe');
    ok(mid.evolve?.running === true, 'boxing-live reports evolve progress');
    assert.equal(mid.evolve?.batchCount, 1);
    assert.equal(mid.evolve?.populationSize, popSize);

    const steps = Math.ceil(2 / FIXED_DT) + 8;
    for (let i = 0; i < steps && finishCount === 0; i++) {
      simulation.step(FIXED_DT);
    }
    assert.equal(
      finishCount,
      1,
      'one onFinished after the whole batch (not per genome)',
    );
    ok(
      lastProgressBatch === 1,
      'single-batch run stays on batch 1',
    );
  } finally {
    simulation.world?.free();
    simulation.world = null;
  }
}

async function assertBoxingV2TSparringLoads(): Promise<void> {
  const opponent = resolveSparringOpponent('upright', 'boxobot-v2t', 1);
  const simulation = new Simulation();
  await simulation.init();
  try {
    simulation.startBoxingLiveEvolve({
      design: cloneDesign(UPRIGHT_FIGHTER),
      divisionId: 'upright',
      opponentDesign: opponent.design,
      opponentWeights: opponent.weights,
      populationSize: 4,
      batchSize: 4,
      maxGenerations: 1,
      episodeSeconds: 1,
      seed: 3,
    });
    for (let i = 0; i < 4; i++) simulation.step(FIXED_DT);
    const snap = simulation.snapshot();
    ok(snap.evolve?.running === true, 'V2T sparring live evolve runs');
    assert.equal(snap.agents.length, 8, 'V2T sparring still uses trainee+partner pairs');
  } finally {
    simulation.world?.free();
    simulation.world = null;
  }
}

async function assertWorkspaceCornerMatch(): Promise<void> {
  const shape = shapeForBoxingDesign(UPRIGHT_FIGHTER);
  const workspace = {
    design: cloneDesign(UPRIGHT_FIGHTER),
    shape,
    weights: new Float32Array(shape.weightCount),
  };
  const fighterA = resolveBoxingCorner(
    { kind: 'workspace' },
    {
      workspace,
      models: [],
      pool: [UPRIGHT_FIGHTER],
      divisionId: 'upright',
      seed: 1,
    },
  );
  const fighterB = resolveBoxingCorner(
    { kind: 'house', id: 'dummy' },
    {
      workspace,
      models: [],
      pool: [UPRIGHT_FIGHTER],
      divisionId: 'upright',
      seed: 2,
    },
  );
  ok(fighterA !== null, 'workspace corner resolves without saveModel');
  ok(fighterB !== null, 'dummy house corner resolves');
  assert.equal(
    displayNameForTrained('Hopper', 'boxing'),
    'Hopper · Boxing Points',
  );
  const simulation = new Simulation();
  await simulation.init();
  try {
    simulation.setEnvironment(boxingRingEnv());
    simulation.startBoxingMatch({
      entries: [
        {
          design: fighterA!.design,
          shape: fighterA!.shape,
          weights: fighterA!.weights,
        },
        {
          design: fighterB!.design,
          shape: fighterB!.shape,
          weights: fighterB!.weights,
        },
      ],
      divisionId: 'upright',
      episodeSeconds: 1,
    });
    for (let i = 0; i < 8; i++) simulation.step(FIXED_DT);
    ok(simulation.snapshot().agents.length >= 2, 'workspace vs dummy match spawned');
  } finally {
    simulation.world?.free();
    simulation.world = null;
  }
}

async function assertTwoRoundBoxingMatch(): Promise<void> {
  const shape = shapeForBoxingDesign(UPRIGHT_FIGHTER);
  const simulation = new Simulation();
  await simulation.init();
  try {
    simulation.setEnvironment(boxingRingEnv());
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
      episodeSeconds: 0.25,
      roundCount: 2,
    });
    let sawRound2 = false;
    const steps = Math.ceil(0.9 / FIXED_DT) + 8;
    for (let i = 0; i < steps; i++) {
      const snap = simulation.step(FIXED_DT);
      if (snap.boxing && snap.boxing.roundIndex === 2 && !snap.boxing.finished) {
        sawRound2 = true;
      }
    }
    const snap = simulation.snapshot();
    ok(sawRound2, 'bell starts the second boxing round');
    assert.equal(snap.boxing?.roundCount, 2);
  } finally {
    simulation.world?.free();
    simulation.world = null;
  }
}

function assertKnockdownAndTko(): void {
  const downed = createBoxingFighterClock();
  updateBoxingFighterClock(downed, 0.1, true, 0);
  ok(downed.down, 'collapse starts the 10-count');
  assert.equal(downed.knockdowns, 1);
  updateBoxingFighterClock(downed, 0.1, true, 9.9);
  ok(!downed.countedOut, 'still counting at 9.9s');
  updateBoxingFighterClock(downed, 0.1, true, 0.2);
  ok(downed.countedOut, 'counted out from 10');

  const recovered = createBoxingFighterClock();
  updateBoxingFighterClock(recovered, 0.2, true, 0);
  updateBoxingFighterClock(recovered, 0.7, false, 1);
  ok(!recovered.down, 'beating the count resets down');
  ok(!recovered.countedOut, 'recovery is not a count-out');

  const head = scoreBoxingHit({
    attacker: 0,
    defender: 1,
    gloveJointId: 1,
    targetJointId: 2,
    targetValue: 3,
    targetIsHead: true,
    gloveMass: 10,
    closingSpeed: 5,
    relativeSpeed: 5.2,
    centreDistance: 0.1,
    combinedRadius: 1,
    time: 1,
  });
  ok(!!head && isBoxingTkoHit(head), 'hard accurate head shot is a TKO');
  const body = scoreBoxingHit({
    attacker: 0,
    defender: 1,
    gloveJointId: 1,
    targetJointId: 2,
    targetValue: 3,
    targetIsHead: false,
    gloveMass: 10,
    closingSpeed: 5,
    relativeSpeed: 5.2,
    centreDistance: 0.1,
    combinedRadius: 1,
    time: 1,
  });
  ok(!!body && !isBoxingTkoHit(body), 'same punch to the body is not a TKO');
  const weakHead = scoreBoxingHit({
    attacker: 0,
    defender: 1,
    gloveJointId: 1,
    targetJointId: 2,
    targetValue: 3,
    targetIsHead: true,
    gloveMass: 1,
    closingSpeed: 2,
    relativeSpeed: 2,
    centreDistance: 0.1,
    combinedRadius: 1,
    time: 1,
  });
  ok(!!weakHead && !isBoxingTkoHit(weakHead), 'light head tap is not a TKO');

  const a = createBoxingFighterClock();
  const b = createBoxingFighterClock();
  b.countedOut = true;
  const counted = resolveBoxingStop([a, b], null, [3, 12]);
  assert.equal(counted.winner, 0);
  assert.equal(counted.reason, 'count-out');
  const tko = resolveBoxingStop([a, b], 0, [3, 12]);
  assert.equal(tko.reason, 'tko');
  assert.equal(tko.winner, 0);
}

async function main(): Promise<void> {
  await initRapier();
  assertCombatFormat();
  assertDivisions();
  assertOwnerAndThresholdFilters();
  assertKnockdownAndTko();
  assertRewardShaping();
  assertCornerSymmetry();
  assertOpponentSolidSeparation();
  assertBoxingModelCompatibility();
  await assertPinnedControllerRate();
  await assertBoxingBrainProbeAndTrainingProgress();
  await assertBoxingLiveBatch();
  await assertBoxingV2TSparringLoads();
  await assertWorkspaceCornerMatch();
  await assertTwoRoundBoxingMatch();
  await assertBoxingTrainingFitnessMoves();
  const first = await scriptedHit();
  const second = await scriptedHit();
  assert.deepEqual(first, second, 'fixed-step hit metrics reproducible');
  const shape = shapeForBoxingDesign(UPRIGHT_FIGHTER);
  assert.equal(shape.inputCount, BOXING_OBS_COUNT, 'Boxing shape uses dedicated obs');
  assert.equal(BOXING_OBS_COUNT, 24, 'Boxing obs pack v3 has 24 channels');
  assert.equal(BOXING_OBS_PACK_VERSION, 3, 'obs pack v3');
  console.log(
    `boxing OK points=${first.points} power=${first.power.toFixed(3)} accuracy=${first.accuracy.toFixed(3)} inputs=${shape.inputCount}`,
  );
  console.log('smoke-boxing: all OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
