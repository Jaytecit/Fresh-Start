/**
 * Smoke: optional Rapier raycast observation pack + authored course curriculum.
 */
import assert from 'node:assert/strict';
import { OBS_COUNT, RAYCAST_OBS_COUNT, RAYCAST_RAY_COUNT } from '../src/brain/constants.ts';
import {
  buildRaycastObservations,
  sampleRaycastHits,
} from '../src/brain/raycastObs.ts';
import { SIMPLE_HOPPER } from '../src/creature/presets.ts';
import { cloneDesign } from '../src/creature/types.ts';
import {
  buildCurriculumFromMarkers,
  ensureCourseGates,
  placeEvenCheckpoints,
} from '../src/env/courseAuthoring.ts';
import {
  applyCourseCurriculumStage,
  courseCurriculumFromAuthored,
  resolveCourseCurriculum,
} from '../src/env/courseCurriculum.ts';
import { flatGroundEnv } from '../src/env/types.ts';
import { featureFlags } from '../src/port/featureFlags.ts';
import {
  locoObsInputCount,
  shapeForDesign,
  Simulation,
} from '../src/sim/simulation.ts';

function ok(cond: boolean, msg: string): void {
  assert.equal(cond, true, msg);
}

async function assertRaycastHits(): Promise<void> {
  ok(featureFlags.raycastObservations, 'raycastObservations flag on');
  const sim = new Simulation();
  await sim.init();
  sim.loadDesign(cloneDesign(SIMPLE_HOPPER));
  const creature = sim.creature!;
  ok(!!sim.world, 'world ready');

  const hits = new Float32Array(OBS_COUNT + RAYCAST_RAY_COUNT);
  hits.fill(-1);
  sampleRaycastHits(sim.world!, creature, hits, OBS_COUNT);
  for (let i = 0; i < RAYCAST_RAY_COUNT; i++) {
    const v = hits[OBS_COUNT + i]!;
    ok(v >= 0 && v <= 1, `ray ${i} normalized in [0,1] got ${v}`);
  }
  // Straight down should hit the ground (not a full miss).
  const down = hits[OBS_COUNT + RAYCAST_RAY_COUNT - 1]!;
  ok(down < 0.99, `down ray should hit ground, got ${down}`);

  const obs = buildRaycastObservations(creature, sim.world);
  ok(obs.length === RAYCAST_OBS_COUNT, `obs length ${obs.length}`);
  ok(locoObsInputCount(true) === RAYCAST_OBS_COUNT, 'locoObsInputCount(true)');
  ok(locoObsInputCount(false) === OBS_COUNT, 'locoObsInputCount(false)');

  const shapeRay = shapeForDesign(SIMPLE_HOPPER, { raycast: true });
  const shapeBase = shapeForDesign(SIMPLE_HOPPER, { raycast: false });
  ok(shapeRay.inputCount === RAYCAST_OBS_COUNT, 'ray shape inputs');
  ok(shapeBase.inputCount === OBS_COUNT, 'base shape inputs');
  ok(shapeRay.weightCount > shapeBase.weightCount, 'ray pack widens MLP');

  console.log(
    `raycast OK down=${down.toFixed(3)} rays=${RAYCAST_RAY_COUNT} in=${shapeRay.inputCount}`,
  );
}

function assertAuthoredCurriculum(): void {
  let env = flatGroundEnv('Course Draft');
  env = {
    ...env,
    obstacles: [
      {
        id: 'wall',
        kind: 'box',
        x: 12,
        y: 1.5,
        w: 2,
        h: 3,
      },
    ],
  };
  env = ensureCourseGates(env);
  ok(
    (env.markers ?? []).some((m) => m.kind === 'start'),
    'ensure start',
  );
  ok(
    (env.markers ?? []).some((m) => m.kind === 'finish'),
    'ensure finish',
  );
  env = placeEvenCheckpoints(env, 2);
  ok(
    (env.markers ?? []).filter((m) => m.kind === 'checkpoint').length === 2,
    'two checkpoints',
  );
  const authored = buildCurriculumFromMarkers(env);
  ok(!!authored && authored.stages.length === 3, '2 CP stages + full');
  env = { ...env, curriculum: authored! };
  const curriculum = courseCurriculumFromAuthored(env, 'draft');
  ok(!!curriculum, 'runtime curriculum from authored');
  ok(
    resolveCourseCurriculum('draft', env)?.stages.length === 3,
    'resolve prefers authored',
  );
  const stage0 = applyCourseCurriculumStage(curriculum!, 0);
  ok(
    (stage0.markers ?? []).some((m) => m.kind === 'finish'),
    'stage has finish',
  );
  ok(
    (stage0.markers ?? []).filter((m) => m.kind === 'checkpoint').length === 0,
    'first stage has no prior checkpoints',
  );
  ok(!stage0.curriculum, 'staged env drops nested curriculum');
  console.log(
    `authored curriculum OK stages=${curriculum!.stages.length} finish0=${stage0.markers?.find((m) => m.kind === 'finish')?.x.toFixed(1)}`,
  );
}

async function main(): Promise<void> {
  await assertRaycastHits();
  assertAuthoredCurriculum();
  console.log('smoke-raycast: all OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
