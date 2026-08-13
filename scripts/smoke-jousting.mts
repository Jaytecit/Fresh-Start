/**
 * L7 smoke: eligibility, opponent-only Rapier lance probes, scorecard, solids.
 */
import assert from 'node:assert/strict';
import { JOUSTBOT } from '../src/creature/joustBot.ts';
import { raceEligibility } from '../src/race/divisions.ts';
import { DART_STRIDER, MOTOR_CART, SIMPLE_HOPPER } from '../src/creature/presets.ts';
import { cloneDesign, type CreatureDesign } from '../src/creature/types.ts';
import {
  JOUSTING_DIVISIONS,
  joustingEligibility,
} from '../src/jousting/eligibility.ts';
import {
  createJoustHitTracker,
  createJoustProbes,
  detectJoustHits,
} from '../src/jousting/hitProbes.ts';
import {
  JOUST_A_SOLID,
  JOUST_B_SOLID,
  enableJoustOpponentContact,
  joustSolidGroups,
} from '../src/jousting/opponentContact.ts';
import { jointIsLance } from '../src/jousting/marks.ts';
import { scoreJoustHit } from '../src/jousting/scoring.ts';
import {
  addJoustFighterCards,
  computeJoustingFitness,
  createJoustScorecard,
  DEFAULT_JOUSTING_PRIORITIES,
  emptyJoustFighterCard,
  freezeJoustScorecard,
  joustWinner,
} from '../src/jousting/scorecard.ts';
import { createJoustPassState } from '../src/jousting/pass.ts';
import { resolveJoustSparringOpponent } from '../src/jousting/sparringOpponents.ts';
import {
  JOUST_OBS_COUNT,
  JOUST_OBS_PACK_VERSION,
  buildJoustObservations,
} from '../src/brain/joustObs.ts';
import { evaluateJoustingGenome } from '../src/brain/joustingTraining.ts';
import { joustLaneEnv } from '../src/env/joustLaneEnv.ts';
import { FIXED_DT, JOUST_AFTERMATH_SECONDS } from '../src/physics/constants.ts';
import { encodeGroups, spawnCreature } from '../src/physics/spawn.ts';
import { createWorld, initRapier } from '../src/physics/world.ts';
import { featureFlags } from '../src/port/featureFlags.ts';
import { exportModelJson, importModelJson } from '../src/library/jsonIO.ts';
import { resolveJoustCorner } from '../src/combat/resolveCorners.ts';
import {
  shapeForJoustingDesign,
  Simulation,
} from '../src/sim/simulation.ts';
import { createRng, randomWeights } from '../src/brain/network.ts';

function ok(condition: boolean, message: string): void {
  assert.equal(condition, true, message);
}

/** Compact single-lance body so a scripted tip overlap cannot also tag the rival lance. */
const STICK_JOUSTER: CreatureDesign = {
  name: 'Stick Jouster',
  joints: [
    { id: 1, x: 0, y: 0.3, isFoot: true },
    { id: 2, x: 1.2, y: 0.3, isFoot: true },
    { id: 3, x: 0.2, y: 1.5 },
    { id: 4, x: 1.0, y: 1.5 },
    { id: 5, x: 0.6, y: 2.3, isHead: true, isHitTarget: true, hitValue: 3 },
    { id: 6, x: 2.6, y: 2.1, isLance: true },
  ],
  bones: [
    { id: 1, startJointId: 1, endJointId: 3 },
    { id: 2, startJointId: 2, endJointId: 4 },
    { id: 3, startJointId: 3, endJointId: 4 },
    { id: 4, startJointId: 3, endJointId: 5 },
    { id: 5, startJointId: 4, endJointId: 5 },
    { id: 6, startJointId: 4, endJointId: 6 },
  ],
  muscles: [
    { id: 1, startBoneId: 1, endBoneId: 3, canExpand: true },
    { id: 2, startBoneId: 2, endBoneId: 3, canExpand: true },
  ],
};

function assertEligibility(): void {
  ok(featureFlags.joustingMode, 'joustingMode flag on');
  const result = joustingEligibility(JOUSTBOT, 'mounted');
  ok(result.eligible, `JoustBot mounted eligible: ${result.reasons.join(' ')}`);
  ok(result.metrics.lances >= 1, 'JoustBot has a lance');
  ok(result.metrics.riderHeads >= 1, 'JoustBot has a rider head');
  ok(result.metrics.riderIsHighest, 'JoustBot rider is the highest joint');
  ok(
    JOUSTING_DIVISIONS.every((division) => division.ruleVersion === 1),
    'joust v1 rules',
  );

  const gloveFallback = cloneDesign(JOUSTBOT);
  const lance = gloveFallback.joints.find((j) => j.isLance);
  ok(!!lance, 'JoustBot lance joint');
  delete lance!.isLance;
  lance!.isGlove = true;
  ok(joustingEligibility(gloveFallback, 'mounted').eligible, 'isGlove counts as lance');
  ok(jointIsLance(lance!), 'jointIsLance sees glove fallback');

  const missing = cloneDesign(JOUSTBOT);
  for (const joint of missing.joints) {
    delete joint.isLance;
    delete joint.isGlove;
  }
  const rejected = joustingEligibility(missing, 'mounted');
  ok(!rejected.eligible, 'missing lance rejected');
  ok(
    rejected.reasons.some((reason) => reason.includes('lance')),
    'eligibility explains missing lance',
  );

  const noRider = cloneDesign(JOUSTBOT);
  for (const joint of noRider.joints) {
    delete joint.isHead;
    delete joint.isHitTarget;
  }
  const noRiderResult = joustingEligibility(noRider, 'mounted');
  ok(!noRiderResult.eligible, 'missing rider rejected');
  ok(
    noRiderResult.reasons.some((reason) => reason.includes('rider')),
    'eligibility explains missing rider',
  );

  const lowRider = cloneDesign(JOUSTBOT);
  const rider = lowRider.joints.find((j) => j.isHead && j.isHitTarget)!;
  const tip = lowRider.joints.find((j) => j.isLance)!;
  tip.y = rider.y + 1;
  const low = joustingEligibility(lowRider, 'mounted');
  ok(!low.eligible, 'lance above rider rejected');
  ok(
    low.reasons.some((reason) => reason.includes('highest')),
    'eligibility explains rider must be highest',
  );

  const grounded = cloneDesign(JOUSTBOT);
  grounded.name = 'Grounded Jouster';
  grounded.joints.push(
    { id: 9, x: 0.15, y: 0.2, isFoot: true },
    { id: 10, x: 4.55, y: 0.2, isFoot: true },
  );
  ok(
    joustingEligibility(grounded, 'grounded').eligible,
    `grounded jouster eligible: ${joustingEligibility(grounded, 'grounded').reasons.join(' ')}`,
  );
  ok(
    !joustingEligibility(JOUSTBOT, 'grounded').eligible,
    'two-foot JoustBot is not grounded',
  );

  const dummy = resolveJoustSparringOpponent(JOUSTBOT, 'dummy', 1, 'mounted');
  assert.equal(dummy.design.name, JOUSTBOT.name);
  assert.equal(dummy.trained, false);
  const bot = resolveJoustSparringOpponent(JOUSTBOT, 'joustbot', 1);
  assert.equal(bot.design.name, JOUSTBOT.name);
  const expected = shapeForJoustingDesign(bot.design);
  assert.equal(bot.weights.length, expected.weightCount);
  assert.equal(bot.shape.inputCount, JOUST_OBS_COUNT);
}

async function scriptedHit(attacker: 0 | 1): Promise<void> {
  const world = createWorld();
  try {
    const a = spawnCreature(world, STICK_JOUSTER, { x: -6, y: 0 });
    const b = spawnCreature(world, STICK_JOUSTER, { x: 6, y: 0 });
    assert.equal(
      a.joints[0].body.collider(0).collisionGroups(),
      encodeGroups(0b0001, 0b0100),
      'joint groups unchanged before probes',
    );
    const probesA = createJoustProbes(world, a, 0);
    const probesB = createJoustProbes(world, b, 1);
    ok(probesA.lances[0].collider.isSensor(), 'lance probe remains sensor');
    assert.equal(
      a.joints[0].body.collider(0).collisionGroups(),
      encodeGroups(0b0001, 0b0100),
      'joint groups unchanged after probe sensors',
    );
    const striker = attacker === 0 ? a : b;
    const victim = attacker === 0 ? b : a;
    const lance = striker.joints.find((joint) => jointIsLance(joint))!;
    const target = victim.joints.find((joint) => joint.isHitTarget)!;
    const targetPosition = target.body.translation();
    const approach = attacker === 0 ? -0.2 : 0.2;
    const lancePos = lance.body.translation();
    const dx = targetPosition.x + approach - lancePos.x;
    const dy = targetPosition.y - lancePos.y;
    for (const joint of striker.joints) {
      const p = joint.body.translation();
      joint.body.setTranslation({ x: p.x + dx, y: p.y + dy }, true);
      joint.body.setLinvel({ x: 0, y: 0 }, true);
    }
    for (const bone of striker.bones) {
      const p = bone.body.translation();
      bone.body.setTranslation({ x: p.x + dx, y: p.y + dy }, true);
      bone.body.setLinvel({ x: 0, y: 0 }, true);
    }
    lance.body.setLinvel({ x: attacker === 0 ? 4 : -4, y: 0 }, true);
    target.body.setLinvel({ x: 0, y: 0 }, true);
    world.timestep = FIXED_DT;
    world.step();
    const tracker = createJoustHitTracker();
    const first = detectJoustHits(world, [probesA, probesB], tracker, 1);
    ok(first.length >= 1, `owner ${attacker} lance scores`);
    ok(
      first.every((event) => event.attacker === attacker),
      'hit credits the striker',
    );
    assert.equal(first[0].attacker, attacker, 'first hit credits the striker');
    ok(tracker.attempts[attacker] >= 1, 'new opponent contact counts attempt');
    assert.equal(tracker.attempts[attacker === 0 ? 1 : 0], 0, 'defender has no attempt');
    const resting = detectJoustHits(world, [probesA, probesB], tracker, 1 + FIXED_DT);
    assert.equal(resting.length, 0, 'resting overlap cannot farm points');
    ok(first[0].points > 0, 'hit awards points');
    ok(Number.isFinite(first[0].power), 'power is finite');
  } finally {
    world.free();
  }
}

function assertOpponentSolidSeparation(): void {
  const world = createWorld();
  try {
    const a = spawnCreature(world, STICK_JOUSTER, { x: 0, y: 0 });
    const b = spawnCreature(world, STICK_JOUSTER, { x: 0, y: 0 });
    const ordinary = spawnCreature(world, STICK_JOUSTER, { x: 40, y: 0 });
    enableJoustOpponentContact(a, 0);
    enableJoustOpponentContact(b, 1);
    assert.equal(
      a.joints[0].body.collider(0).collisionGroups(),
      joustSolidGroups(0, 'joint'),
      'jouster A solid joint groups',
    );
    assert.equal(
      b.bones[0].body.collider(0).collisionGroups(),
      joustSolidGroups(1, 'bone'),
      'jouster B solid bone groups',
    );
    assert.equal(
      ordinary.joints[0].body.collider(0).collisionGroups(),
      encodeGroups(0b0001, 0b0100),
      'ordinary spawn groups unchanged after match solids',
    );
    const aJoint = a.joints.find((joint) => joint.isHitTarget)!;
    const bJoint = b.joints.find((joint) => joint.isHitTarget)!;
    aJoint.body.setTranslation({ x: 0, y: 3 }, true);
    bJoint.body.setTranslation({ x: 0, y: 3 }, true);
    const aGroups = aJoint.body.collider(0).collisionGroups();
    const bGroups = bJoint.body.collider(0).collisionGroups();
    ok((aGroups & 0xffff & JOUST_A_SOLID) !== 0, 'A membership includes A_SOLID');
    ok((bGroups & 0xffff & JOUST_B_SOLID) !== 0, 'B membership includes B_SOLID');
    ok(((aGroups >>> 16) & JOUST_A_SOLID) === 0, 'A filter excludes own solid');
    ok(((bGroups >>> 16) & JOUST_B_SOLID) === 0, 'B filter excludes own solid');
    for (let i = 0; i < 12; i++) {
      world.timestep = FIXED_DT;
      world.step();
    }
    const pa = aJoint.body.translation();
    const pb = bJoint.body.translation();
    ok(Number.isFinite(pa.x) && Number.isFinite(pb.x), 'solid clash stays finite');
    ok(Math.abs(pa.x - pb.x) > 0.05, 'overlapping jousters separate');
  } finally {
    world.free();
  }
}

function assertScorecardRules(): void {
  const summed = addJoustFighterCards(
    { ...emptyJoustFighterCard(), total: 2, hitQuality: 1 },
    { ...emptyJoustFighterCard(), total: 3, hitQuality: 2 },
  );
  assert.equal(summed.total, 5);
  assert.equal(summed.hitQuality, 3);

  const rejected = scoreJoustHit({
    attacker: 0,
    defender: 0,
    lanceJointId: 1,
    targetJointId: 2,
    targetValue: 3,
    lanceMass: 1,
    closingSpeed: 4,
    relativeSpeed: 4,
    centreDistance: 0.2,
    combinedRadius: 0.8,
    time: 1,
  });
  assert.equal(rejected, null, 'same-owner hit rejected');
  const slow = scoreJoustHit({
    attacker: 0,
    defender: 1,
    lanceJointId: 1,
    targetJointId: 2,
    targetValue: 3,
    lanceMass: 1,
    closingSpeed: 0.01,
    relativeSpeed: 0.01,
    centreDistance: 0.2,
    combinedRadius: 0.8,
    time: 1,
  });
  assert.equal(slow, null, 'below-threshold closing rejected');

  const pass = createJoustPassState();
  pass.phase = 'done';
  pass.clashReason = 'timeout';
  pass.aftermathUprightSum = [8, 2];
  pass.aftermathUprightSteps = [10, 10];
  pass.peakKnockback = [3, 0.2];
  pass.approached = true;
  pass.minComDist = 4;
  pass.closingAtClosest = 6;
  const card = createJoustScorecard(pass);
  freezeJoustScorecard(card, DEFAULT_JOUSTING_PRIORITIES);
  ok(Number.isFinite(card.fighters[0].total), 'scorecard A finite');
  ok(Number.isFinite(card.fighters[1].total), 'scorecard B finite');
  const winner = joustWinner(card);
  ok(winner === 0 || winner === 1 || winner === null, 'winner is owner or draw');
  const fitness = computeJoustingFitness(card, winner, DEFAULT_JOUSTING_PRIORITIES);
  ok(Number.isFinite(fitness.fitness), 'training fitness finite');
}

async function runSeededMatch(
  seedA: number,
  seedB: number,
  episodeSeconds: number,
): Promise<{
  totals: [number, number];
  clashReason: string | null;
  finished: boolean;
}> {
  const simulation = new Simulation();
  await simulation.init();
  try {
    const shape = shapeForJoustingDesign(JOUSTBOT);
    simulation.setEnvironment(joustLaneEnv());
    let finished = false;
    let totals: [number, number] = [NaN, NaN];
    let clashReason: string | null = null;
    simulation.startJoustMatch({
      entries: [
        {
          design: cloneDesign(JOUSTBOT),
          shape,
          weights: randomWeights(shape, createRng(seedA)),
        },
        {
          design: cloneDesign(JOUSTBOT),
          shape,
          weights: randomWeights(shape, createRng(seedB)),
        },
      ],
      divisionId: 'mounted',
      episodeSeconds,
      onFinished: (result) => {
        finished = true;
        totals = [
          result.scorecard.fighters[0].total,
          result.scorecard.fighters[1].total,
        ];
        clashReason = result.scorecard.pass.clashReason;
        ok(Number.isFinite(totals[0]), 'A total finite');
        ok(Number.isFinite(totals[1]), 'B total finite');
        ok(clashReason !== null, 'pass records a clash reason');
      },
    });
    const steps =
      Math.ceil((episodeSeconds + JOUST_AFTERMATH_SECONDS) / FIXED_DT) + 40;
    for (let i = 0; i < steps && !finished; i++) {
      simulation.step(FIXED_DT);
    }
    return { totals, clashReason, finished };
  } finally {
    simulation.world?.free();
    simulation.world = null;
  }
}

async function assertMatchObsAndTraining(): Promise<void> {
  const world = createWorld();
  try {
    const a = spawnCreature(world, JOUSTBOT, { x: -4, y: 0 });
    const b = spawnCreature(world, JOUSTBOT, { x: 4, y: 0 });
    const obs = buildJoustObservations(a, b, 0, 0, 0, 1, 0);
    assert.equal(obs.length, JOUST_OBS_COUNT);
    assert.equal(JOUST_OBS_PACK_VERSION, 1);
    ok(obs.every((v) => Number.isFinite(v)), 'obs finite');
  } finally {
    world.free();
  }

  const first = await runSeededMatch(7, 8, 3);
  ok(first.finished, 'joust match finished');
  const second = await runSeededMatch(7, 8, 3);
  ok(second.finished, 'repeat joust match finished');
  assert.equal(first.clashReason, second.clashReason, 'seeded clash reason matches');
  assert.ok(
    Math.abs(first.totals[0] - second.totals[0]) < 1e-6,
    'seeded A total matches',
  );
  assert.ok(
    Math.abs(first.totals[1] - second.totals[1]) < 1e-6,
    'seeded B total matches',
  );

  const shape = shapeForJoustingDesign(JOUSTBOT);
  const opponent = resolveJoustSparringOpponent(JOUSTBOT, 'dummy', 3);
  const evaluated = await evaluateJoustingGenome({
    design: cloneDesign(JOUSTBOT),
    shape,
    weights: randomWeights(shape, createRng(5)),
    opponentDesign: opponent.design,
    opponentShape: opponent.shape,
    opponentWeights: opponent.weights,
    episodeSeconds: 3,
  });
  ok(
    Number.isFinite(evaluated.scorecard.fighters[0].total),
    'offline eval scorecard finite',
  );
}

function assertModelJson(): void {
  const shape = shapeForJoustingDesign(JOUSTBOT);
  const weights = randomWeights(shape, createRng(3));
  const json = exportModelJson({
    name: 'JoustBotT',
    task: 'jousting',
    shape,
    weights,
    fitness: 1,
    design: JOUSTBOT,
    joustingMeta: { ruleVersion: 1, obsPackVersion: 1, brainHz: 30 },
  });
  const parsed = importModelJson(json);
  ok(parsed.ok, parsed.ok ? 'ok' : parsed.error);
  if (parsed.ok) {
    assert.equal(parsed.value.task, 'jousting');
    assert.equal(parsed.value.joustingMeta?.obsPackVersion, 1);
  }
}

async function assertWorkspaceCornerPass(): Promise<void> {
  const shape = shapeForJoustingDesign(JOUSTBOT);
  const workspace = {
    design: cloneDesign(JOUSTBOT),
    shape,
    weights: randomWeights(shape, createRng(9)),
  };
  const fighterA = resolveJoustCorner(
    { kind: 'workspace' },
    {
      workspace,
      models: [],
      pool: [JOUSTBOT],
      traineeDesign: JOUSTBOT,
      seed: 1,
      divisionId: 'mounted',
    },
  );
  const fighterB = resolveJoustCorner(
    { kind: 'house', id: 'dummy' },
    {
      workspace,
      models: [],
      pool: [JOUSTBOT],
      traineeDesign: JOUSTBOT,
      seed: 2,
      divisionId: 'mounted',
    },
  );
  ok(fighterA !== null, 'joust workspace corner resolves without saveModel');
  ok(fighterB !== null, 'joust dummy house corner resolves');
  const simulation = new Simulation();
  await simulation.init();
  try {
    simulation.setEnvironment(joustLaneEnv());
    simulation.startJoustMatch({
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
      divisionId: 'mounted',
      episodeSeconds: 2,
    });
    for (let i = 0; i < 8; i++) simulation.step(FIXED_DT);
    ok(simulation.snapshot().agents.length >= 2, 'workspace vs dummy joust spawned');
  } finally {
    simulation.world?.free();
    simulation.world = null;
  }
}

function assertRaceDivisions(): void {
  ok(
    raceEligibility(DART_STRIDER, 'upright').eligible,
    `Dart Strider upright race: ${raceEligibility(DART_STRIDER, 'upright').reasons.join(' ')}`,
  );
  ok(
    !raceEligibility(SIMPLE_HOPPER, 'upright').eligible,
    'squat hopper is not an upright racer',
  );
  ok(
    raceEligibility(SIMPLE_HOPPER, 'open-frame').eligible,
    'hopper is open-frame eligible',
  );
  ok(
    raceEligibility(MOTOR_CART, 'open-frame').eligible,
    'wheeled cart is open-frame eligible',
  );
  ok(
    !raceEligibility(MOTOR_CART, 'upright').eligible,
    'wheels are not upright-race legal',
  );
}

async function main(): Promise<void> {
  await initRapier();
  assertEligibility();
  assertRaceDivisions();
  await scriptedHit(0);
  await scriptedHit(1);
  assertOpponentSolidSeparation();
  assertScorecardRules();
  await assertMatchObsAndTraining();
  await assertWorkspaceCornerPass();
  assertModelJson();
  console.log('smoke-jousting: ok');
}

void main();
