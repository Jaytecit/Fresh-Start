/**
 * Smoke gates for selected task features (J1 / E6.* / P4 caps).
 * Run: npm run smoke:tasks
 */
import {
  createRng,
  randomWeights,
} from '../src/brain/network.ts';
import { evaluateTaskEpisode } from '../src/brain/tasks.ts';
import {
  CHUTE_DROPPER,
  MOTOR_CART,
  SIMPLE_FLAPPER,
  SIMPLE_GLIDER,
  SIMPLE_HOPPER,
  TRIANGLE_WALKER,
} from '../src/creature/presets.ts';
import { cloneDesign, type CreatureDesign } from '../src/creature/types.ts';
import { countWings, wingPairOk } from '../src/editor/aeroValidation.ts';
import {
  bandsToActuators,
  DEFAULT_DISCO_REACTIVITY,
  DEFAULT_DISCO_ROUTING,
  type AudioBands,
} from '../src/audio/audioAnalysis.ts';
import { discoFloorEnv } from '../src/env/discoEnv.ts';
import { DISCO_DANCER } from '../src/creature/discoDancer.ts';
import {
  ANTI_SCOOT,
  ANTI_SCOOT_MAX,
  BODY_FRICTION,
  DISCO_WALL_X,
  FIXED_DT,
  FOOT_ANGULAR_DAMPING,
  FOOT_FRICTION,
  JOINT_RADIUS,
  LAUNCH_PAD_APEX_H,
  LAUNCH_PAD_APEX_MAX,
  LAUNCH_PAD_APEX_MIN,
  RAMP_FRICTION_MAX,
} from '../src/physics/constants.ts';
import {
  destroyCourse,
  destroyRoughCourse,
  makeRoughCourseTerrain,
  spawnClimbCourse,
  spawnRoughCourse,
} from '../src/physics/course.ts';
import {
  destroyObstacles,
  spawnStaticObstacles,
} from '../src/physics/obstacles.ts';
import { applyPlantSlideBrake } from '../src/physics/plantSlideBrake.ts';
import { destroyCreature, spawnCreature } from '../src/physics/spawn.ts';
import {
  createWorld,
  defaultColliderDesc,
  initRapier,
  RAPIER,
} from '../src/physics/world.ts';
import { rampFromTopEndpoints } from '../src/env/rampDraw.ts';
import {
  destroyTerrain,
  spawnTerrainHeightfield,
} from '../src/physics/terrain.ts';
import {
  destroyTower,
  spawnLaunchTower,
} from '../src/physics/tower.ts';
import {
  makeSineTerrain,
  sampleTerrainGrade,
  sampleTerrainHeight,
} from '../src/env/terrainMath.ts';
import {
  countDesignActuatorChannels,
  countWheelActuators,
  designHasActuators,
  extractWheelDrives,
} from '../src/brain/driveGroups.ts';
import { shapeForDesign, Simulation } from '../src/sim/simulation.ts';
import { featureFlags } from '../src/port/featureFlags.ts';
import {
  CREATURE_PACKAGE_SCHEMA,
  saveNewPackage,
  loadCreaturePackages,
  deletePackage,
} from '../src/library/creaturePackages.ts';
import {
  BUILTIN_GAUNTLET_ENV_ID,
  ENVIRONMENT_PACKAGE_SCHEMA,
  saveNewEnvironmentPackage,
  loadEnvironmentPackages,
  deleteEnvironmentPackage,
  listEnvironmentsForUi,
} from '../src/library/environmentPackages.ts';
import {
  applyCourseCurriculumStage,
  curriculumForPackageId,
  GAUNTLET_CURRICULUM,
} from '../src/env/courseCurriculum.ts';
import {
  courseRaceTime,
  emptyCourseMarkerAccum,
  updateCourseMarkerAccum,
} from '../src/brain/courseMarkers.ts';
import {
  exportEnvironmentJson,
  importEnvironmentJson,
} from '../src/library/jsonIO.ts';
import { BUNDLED_MODELS } from '../src/library/bundledModels.ts';
import {
  defaultGoalForZone,
  GOAL_CATALOG,
  goalsForZone,
} from '../src/goals/catalog.ts';
import { ZONES, ZONE_ORDER } from '../src/zones/zones.ts';
import {
  aeroPresenceScale,
  emptyMetrics,
  scoreTaskPerformance,
} from '../src/brain/taskScore.ts';
import {
  emptyScoreRegionAccum,
  shouldEndEpisodeOnLanding,
  updateScoreRegionAccum,
} from '../src/brain/scoreRegions.ts';
import { evaluateSecretGoals } from '../src/secrets/eval.ts';
import { SECRET_GOALS } from '../src/secrets/definitions.ts';
import { secretEligible } from '../src/secrets/eligibility.ts';
import {
  clearSecretDiscoveries,
  isSecretDiscovered,
  loadSecretDiscoveries,
  recordDiscovery,
} from '../src/secrets/progress.ts';
import {
  flatGroundEnv,
  ENV_THEMES,
  OBSTACLE_KINDS,
  type EnvCourseMarker,
  type EnvObstacle,
  type EnvScoreRegion,
} from '../src/env/types.ts';
import {
  SCORE_REGION_DEFAULT_PENALTY_RATE,
  SCORE_REGION_DEFAULT_REWARD_RATE,
  SPRINT_CHECKPOINT_BONUS,
  SPRINT_FINISH_BONUS,
} from '../src/brain/constants.ts';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function ensureLocalStorage(): void {
  const g = globalThis as typeof globalThis & { localStorage?: Storage };
  if (typeof g.localStorage !== 'undefined') return;
  const store = new Map<string, string>();
  g.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function assertClimbCourse(): Promise<void> {
  assert(featureFlags.climbCourse, 'climbCourse flag should be on');
  const sim = new Simulation();
  await sim.init();
  if (!sim.world) throw new Error('no world');
  const course = spawnClimbCourse(sim.world);
  assert(course.bodies.length >= 3, 'expected climb steps');
  destroyCourse(sim.world, course);
  console.log('climb course OK');
}

async function assertRoughCourse(): Promise<void> {
  assert(featureFlags.roughTerrainCourse, 'roughTerrainCourse flag should be on');
  assert(featureFlags.taskRoughTerrain, 'taskRoughTerrain flag should be on');
  const design = makeRoughCourseTerrain();
  assert(design.samples.length >= 2, 'rough course samples');
  assert(sampleTerrainHeight(design, (design.startX + design.endX) / 2) > 0, 'mid hills');

  const sim = new Simulation();
  await sim.init();
  if (!sim.world) throw new Error('no world');
  const course = spawnRoughCourse(sim.world);
  assert(!!course, 'rough course spawned');
  assert(course!.terrain.visual.points.length >= 2, 'rough polyline');
  destroyRoughCourse(sim.world, course);

  sim.setTask('rough');
  sim.loadDesign(cloneDesign(SIMPLE_HOPPER));
  sim.driveMode = 'idle';
  for (let i = 0; i < 120; i++) sim.step(FIXED_DT);
  const snap = sim.snapshot();
  assert(snap.terrain !== null && snap.terrain.points.length >= 2, 'snap rough terrain');
  assert(!!sim.activeTerrain(), 'activeTerrain from course');
  for (const j of snap.joints) {
    assert(Number.isFinite(j.x) && Number.isFinite(j.y), 'joint finite on rough');
  }
  const minY = Math.min(...snap.joints.map((j) => j.y));
  assert(minY > 0.15, `hopper should rest above ground, minY=${minY}`);
  console.log('rough course OK');
}

async function assertRoughTaskScores(): Promise<void> {
  const sim = new Simulation();
  await sim.init();
  const shape = shapeForDesign(SIMPLE_HOPPER);
  const w = randomWeights(shape, createRng(11));
  const result = evaluateTaskEpisode(
    sim,
    cloneDesign(SIMPLE_HOPPER),
    shape,
    w,
    'rough',
    4,
  );
  assert(Number.isFinite(result.fitness), 'rough fitness finite');
  assert(Number.isFinite(result.distance), 'rough distance finite');
  console.log(
    `rough task OK fitness=${result.fitness.toFixed(3)} dist=${result.distance.toFixed(3)} lifts=${result.footLifts}`,
  );
}

async function assertStaticObstacles(): Promise<void> {
  assert(featureFlags.staticObstacles, 'staticObstacles flag should be on');
  const sim = new Simulation();
  await sim.init();
  if (!sim.world) throw new Error('no world');

  const samples: EnvObstacle[] = OBSTACLE_KINDS.map((kind, i) => ({
    id: `smoke_${kind}`,
    kind,
    x: 2 + i * 4,
    y:
      kind === 'loop'
        ? 2.2
        : kind === 'stair' || kind === 'pit'
          ? 0
          : kind === 'pad'
            ? 0.14
            : 0.5,
    w: kind === 'ramp' || kind === 'pad' ? 3 : kind === 'loop' ? 3.2 : 2,
    h: kind === 'ramp' || kind === 'pad' ? 0.28 : kind === 'loop' ? 3.2 : 1.2,
    ...(kind === 'ramp' ? { rot: -0.35 } : {}),
  }));

  for (const kind of OBSTACLE_KINDS) {
    const one = samples.filter((o) => o.kind === kind);
    const handle = spawnStaticObstacles(sim.world, one);
    assert(handle.bodies.length >= 1, `${kind} should spawn bodies`);
    assert(handle.visuals.length === handle.bodies.length, `${kind} visuals`);
    destroyObstacles(sim.world, handle);
  }

  const env = flatGroundEnv('Smoke Obstacles');
  env.obstacles = [
    { id: 'box_pad', kind: 'box', x: 0, y: 0.6, w: 3, h: 1.2 },
  ];
  sim.setEnvironment(env);
  const spawnFootGrip = 7.3;
  sim.setFootGrip(spawnFootGrip);
  sim.loadDesign(cloneDesign(SIMPLE_HOPPER));
  const markedFeet = sim.creature!.joints.filter((j) => j.isFoot && !j.isWheel);
  assert(markedFeet.length > 0, 'hopper should have a marked foot');
  for (const foot of markedFeet) {
    assert(
      Math.abs(foot.body.collider(0).friction() - spawnFootGrip) < 1e-6,
      'configured foot grip should apply on spawn',
    );
  }
  sim.setFootGrip(FOOT_FRICTION);
  for (const foot of markedFeet) {
    assert(
      Math.abs(foot.body.collider(0).friction() - FOOT_FRICTION) < 1e-6,
      'foot grip should live-update spawned feet',
    );
  }
  sim.driveMode = 'idle';
  for (let i = 0; i < 120; i++) sim.step(FIXED_DT);
  const snap = sim.snapshot();
  assert(snap.obstacles.length >= 1, 'snapshot exposes obstacle visuals');
  for (const j of snap.joints) {
    assert(Number.isFinite(j.x) && Number.isFinite(j.y), 'joint finite on box');
  }
  const avgY =
    snap.joints.reduce((s, j) => s + j.y, 0) / Math.max(1, snap.joints.length);
  assert(avgY > 0.3, `hopper should rest above box pad, avgY=${avgY}`);

  // Soft CCD: high-speed impact into a tall box must not bury joints.
  {
    const { JOINT_RADIUS, SOFT_CCD_PREDICTION, SOFT_CCD_SPEED_GATE } =
      await import('../src/physics/constants.ts');
    assert(SOFT_CCD_PREDICTION > 0, 'soft CCD prediction configured');
    assert(SOFT_CCD_SPEED_GATE > 0, 'soft CCD speed gate configured');
    const wallEnv = flatGroundEnv('Smoke Wall');
    wallEnv.obstacles = [
      { id: 'wall', kind: 'box', x: 4, y: 2.25, w: 2.5, h: 4.5 },
    ];
    sim.setEnvironment(wallEnv);
    sim.loadDesign(cloneDesign(SIMPLE_HOPPER));
    const creature = sim.creature!;
    for (const j of creature.joints) {
      j.body.setLinvel({ x: 28, y: 6 }, true);
    }
    for (const b of creature.bones) {
      b.body.setLinvel({ x: 28, y: 6 }, true);
    }
    const left = 4 - 2.5 / 2;
    const right = 4 + 2.5 / 2;
    const bottom = 2.25 - 4.5 / 2;
    const top = 2.25 + 4.5 / 2;
    let maxPen = 0;
    for (let i = 0; i < 180; i++) {
      sim.step(FIXED_DT);
      for (const j of creature.joints) {
        const p = j.body.translation();
        const overlaps =
          p.x + JOINT_RADIUS > left &&
          p.x - JOINT_RADIUS < right &&
          p.y + JOINT_RADIUS > bottom &&
          p.y - JOINT_RADIUS < top;
        if (!overlaps) continue;
        const penX = Math.min(
          p.x + JOINT_RADIUS - left,
          right - (p.x - JOINT_RADIUS),
        );
        const penY = Math.min(
          p.y + JOINT_RADIUS - bottom,
          top - (p.y - JOINT_RADIUS),
        );
        maxPen = Math.max(maxPen, Math.min(penX, penY));
      }
    }
    assert(
      maxPen < JOINT_RADIUS * 0.35,
      `ballistic wall penetration too deep: ${maxPen.toFixed(3)} (soft CCD)`,
    );
  }

  sim.setEnvironment(flatGroundEnv());
  console.log('static obstacles OK');
}

/**
 * Ramp purchase: Max friction combine + plant-brake skip on ramp contacts.
 * Catches the dual bug where μ=10 still felt like ice (Average + world-X brake).
 */
async function assertRampGrip(): Promise<void> {
  assert(featureFlags.staticObstacles, 'staticObstacles flag should be on');

  // ~18° slab — steep enough to punish Average μ, holds under Max μ=10.
  const a = { x: 0.5, y: 0.1 };
  const b = { x: 6.5, y: 2.0 };
  const ramp = rampFromTopEndpoints(a, b);
  assert(ramp != null, 'ramp from top endpoints');

  await initRapier();
  const world = createWorld(RAMP_FRICTION_MAX);
  const handle = spawnStaticObstacles(world, [ramp!], RAMP_FRICTION_MAX);
  assert(handle.bodies.length >= 1, 'ramp body');
  const col = handle.bodies[0]!.collider(0);
  assert(
    Math.abs(col.friction() - RAMP_FRICTION_MAX) < 1e-6,
    `ramp μ should be ${RAMP_FRICTION_MAX}, got ${col.friction()}`,
  );
  assert(
    col.frictionCombineRule() === RAPIER.CoefficientCombineRule.Max,
    'ramp friction combine must be Max',
  );
  // Infinite ground also follows the universal grip slider.
  let groundμ = -1;
  world.forEachCollider((c) => {
    if (c.shapeType() === RAPIER.ShapeType.HalfSpace) groundμ = c.friction();
  });
  assert(
    Math.abs(groundμ - RAMP_FRICTION_MAX) < 1e-6,
    `ground μ should be ${RAMP_FRICTION_MAX}, got ${groundμ}`,
  );

  // Passive cuboid (body μ) on mid-ramp — balls roll regardless of μ; cuboid
  // isolates Coulomb grip. Must not runaway downhill under Max μ=10.
  const midX = 3.5;
  const midTopY = a.y + ((midX - a.x) / (b.x - a.x)) * (b.y - a.y);
  const pad = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(midX, midTopY + 0.12)
      .setLinearDamping(0.2)
      .setAngularDamping(1),
  );
  world.createCollider(
    defaultColliderDesc(
      RAPIER.ColliderDesc.cuboid(0.22, 0.1)
        .setMass(3)
        .setFriction(BODY_FRICTION),
    ),
    pad,
  );
  pad.setLinvel({ x: 0, y: 0 }, true);
  pad.setAngvel(0, true);
  world.timestep = FIXED_DT;
  for (let i = 0; i < 90; i++) world.step();
  const x0 = pad.translation().x;
  const y0 = pad.translation().y;
  for (let i = 0; i < 180; i++) world.step();
  const x1 = pad.translation().x;
  const y1 = pad.translation().y;
  const slideDown = x0 - x1;
  assert(
    y0 > 0.85 && y1 > 0.8,
    `pad left ramp (y0=${y0.toFixed(3)} y1=${y1.toFixed(3)})`,
  );
  assert(
    slideDown < 0.35,
    `pad slid downhill too far on μ=10 Max ramp: Δx_down=${slideDown.toFixed(3)}`,
  );
  world.removeRigidBody(pad);

  // Ramp purchase damps along-slab slip (not flat world-X). Cuboid foot
  // stays on the slab so contact classification is reliable.
  const footBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(midX, midTopY + 0.12)
      .setLinearDamping(0.2)
      .setAngularDamping(1),
  );
  const footCol = world.createCollider(
    defaultColliderDesc(
      RAPIER.ColliderDesc.cuboid(0.2, 0.1).setMass(2).setFriction(BODY_FRICTION),
    ),
    footBody,
  );
  // Match creature joint groups: collide with ground/obstacles only.
  const jointGroups = (0b0001 & 0xffff) | ((0b0100 & 0xffff) << 16);
  footCol.setCollisionGroups(jointGroups);
  footCol.setSolverGroups(jointGroups);
  const rampCreature = {
    joints: [
      {
        id: 1,
        body: footBody,
        radius: JOINT_RADIUS,
        isFoot: true as boolean | undefined,
        isHead: undefined,
        isWheel: undefined,
        motorStrength: undefined,
      },
    ],
    bones: [] as [],
    muscles: [] as [],
    impulseJoints: [] as [],
    designedHeadY: 0,
  };
  for (let i = 0; i < 60; i++) world.step();
  assert(
    footBody.translation().y > 0.85,
    'foot should rest on ramp before brake test',
  );
  const rampRot = handle.visuals[0]!.rot;
  const tx = Math.cos(rampRot);
  const ty = Math.sin(rampRot);
  // Downhill along-slab (same sign as gravity·tangent) must be cut; uphill kept.
  const downhillAlong = -2.5 * Math.sign(ty || 1);
  footBody.setLinvel(
    { x: downhillAlong * tx, y: downhillAlong * ty },
    true,
  );
  applyPlantSlideBrake(
    rampCreature,
    null,
    world,
    handle,
    ANTI_SCOOT_MAX,
  );
  const vDown = footBody.linvel();
  const alongDown = vDown.x * tx + vDown.y * ty;
  assert(
    Math.abs(alongDown) < Math.abs(downhillAlong) * 0.25,
    `ramp purchase should cut downhill slip (before=${downhillAlong.toFixed(3)} after=${alongDown.toFixed(3)})`,
  );
  const uphillAlong = 2.5 * Math.sign(ty || 1);
  footBody.setLinvel({ x: uphillAlong * tx, y: uphillAlong * ty }, true);
  applyPlantSlideBrake(
    rampCreature,
    null,
    world,
    handle,
    ANTI_SCOOT_MAX,
  );
  const vUp = footBody.linvel();
  const alongUp = vUp.x * tx + vUp.y * ty;
  assert(
    Math.abs(alongUp) > Math.abs(uphillAlong) * 0.9,
    `ramp purchase must preserve uphill scoot (before=${uphillAlong.toFixed(3)} after=${alongUp.toFixed(3)})`,
  );
  world.removeRigidBody(footBody);

  // Ball feet: sticky joint material + ramp purchase must hold at μ=10.
  const ballBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(midX, midTopY + JOINT_RADIUS + 0.02)
      .setLinearDamping(0.08)
      .setAngularDamping(FOOT_ANGULAR_DAMPING),
  );
  const ballCol = world.createCollider(
    RAPIER.ColliderDesc.ball(JOINT_RADIUS)
      .setMass(1)
      .setFriction(FOOT_FRICTION)
      .setRestitution(0.02),
    ballBody,
  );
  ballCol.setCollisionGroups(jointGroups);
  ballCol.setSolverGroups(jointGroups);
  const ballCreature = {
    joints: [
      {
        id: 1,
        body: ballBody,
        radius: JOINT_RADIUS,
        isFoot: true as boolean | undefined,
        isHead: undefined,
        isWheel: undefined,
        motorStrength: undefined,
      },
    ],
    bones: [] as [],
    muscles: [] as [],
    impulseJoints: [] as [],
    designedHeadY: 0,
  };
  for (let i = 0; i < 90; i++) {
    world.step();
    applyPlantSlideBrake(
      ballCreature,
      null,
      world,
      handle,
      ANTI_SCOOT_MAX,
    );
  }
  const ballX0 = ballBody.translation().x;
  const ballY0 = ballBody.translation().y;
  for (let i = 0; i < 180; i++) {
    world.step();
    applyPlantSlideBrake(
      ballCreature,
      null,
      world,
      handle,
      ANTI_SCOOT_MAX,
    );
  }
  const ballSlide = ballX0 - ballBody.translation().x;
  const ballY1 = ballBody.translation().y;
  assert(
    ballY0 > 0.85 && ballY1 > 0.8,
    `ball foot left ramp (y0=${ballY0.toFixed(3)} y1=${ballY1.toFixed(3)})`,
  );
  assert(
    ballSlide < 0.5,
    `ball foot slid downhill despite ramp purchase: Δx_down=${ballSlide.toFixed(3)}`,
  );
  world.removeRigidBody(ballBody);
  destroyObstacles(world, handle);

  // Ground and flat obstacles: same adverse-direction assist (brake −X, keep +X).
  const groundFoot = spawnCreature(world, {
    name: 'GroundFoot',
    joints: [{ id: 1, x: 0, y: JOINT_RADIUS + 0.02, isFoot: true }],
    bones: [],
    muscles: [],
  });
  for (let i = 0; i < 45; i++) world.step();
  const vxFwd = 2.5;
  const vxBack = -2.5;
  groundFoot.joints[0]!.body.setLinvel({ x: vxFwd, y: 0 }, true);
  applyPlantSlideBrake(groundFoot, null, world, null, ANTI_SCOOT_MAX);
  const groundFwd = groundFoot.joints[0]!.body.linvel().x;
  assert(
    Math.abs(groundFwd - vxFwd) < 1e-6,
    `flat purchase must preserve +X (vx=${groundFwd.toFixed(3)})`,
  );
  groundFoot.joints[0]!.body.setLinvel({ x: vxBack, y: 0 }, true);
  applyPlantSlideBrake(groundFoot, null, world, null, ANTI_SCOOT_MAX);
  const groundBack = groundFoot.joints[0]!.body.linvel().x;
  assert(
    Math.abs(groundBack) < Math.abs(vxBack) * 0.25,
    `flat purchase should cut −X scoot (vx=${groundBack.toFixed(3)})`,
  );

  const flatHandle = spawnStaticObstacles(
    world,
    [{ id: 'grip_box', kind: 'box', x: 10, y: 0.5, w: 2, h: 1 }],
    RAMP_FRICTION_MAX,
  );
  const obstacleFoot = spawnCreature(world, {
    name: 'ObstacleFoot',
    joints: [{ id: 1, x: 10, y: 1 + JOINT_RADIUS + 0.02, isFoot: true }],
    bones: [],
    muscles: [],
  });
  for (let i = 0; i < 45; i++) world.step();
  obstacleFoot.joints[0]!.body.setLinvel({ x: vxBack, y: 0 }, true);
  applyPlantSlideBrake(obstacleFoot, null, world, flatHandle, ANTI_SCOOT_MAX);
  const obstacleBack = obstacleFoot.joints[0]!.body.linvel().x;
  assert(
    Math.abs(obstacleBack - groundBack) < 1e-6,
    `ground/obstacle anti-scoot mismatch (ground=${groundBack.toFixed(3)} obstacle=${obstacleBack.toFixed(3)})`,
  );

  groundFoot.joints[0]!.body.setLinvel({ x: vxBack, y: 0 }, true);
  obstacleFoot.joints[0]!.body.setLinvel({ x: vxBack, y: 0 }, true);
  applyPlantSlideBrake(groundFoot, null, world, null, ANTI_SCOOT);
  applyPlantSlideBrake(obstacleFoot, null, world, flatHandle, ANTI_SCOOT);
  const groundDefaultBack = groundFoot.joints[0]!.body.linvel().x;
  const obstacleDefaultBack = obstacleFoot.joints[0]!.body.linvel().x;
  assert(
    Math.abs(obstacleDefaultBack - groundDefaultBack) < 1e-6,
    `default ground/obstacle anti-scoot mismatch (ground=${groundDefaultBack.toFixed(3)} obstacle=${obstacleDefaultBack.toFixed(3)})`,
  );
  assert(
    Math.abs(groundDefaultBack) > Math.abs(groundBack),
    `default anti-scoot should brake less than max (default=${groundDefaultBack.toFixed(3)} max=${groundBack.toFixed(3)})`,
  );

  // Purchase anchors marked feet without damping the creature's body momentum.
  const tractionRig = spawnCreature(world, {
    name: 'TractionRig',
    joints: [
      { id: 1, x: -1, y: JOINT_RADIUS + 0.02, isFoot: true },
      { id: 2, x: 1, y: JOINT_RADIUS + 0.02, isFoot: true },
    ],
    bones: [{ id: 1, startJointId: 1, endJointId: 2 }],
    muscles: [],
  });
  for (let i = 0; i < 45; i++) world.step();
  for (const foot of tractionRig.joints) {
    foot.body.setLinvel({ x: vxBack, y: 0 }, true);
  }
  tractionRig.bones[0]!.body.setLinvel({ x: vxBack, y: 0 }, true);
  applyPlantSlideBrake(tractionRig, null, world, null, ANTI_SCOOT);
  assert(
    tractionRig.joints.every(
      (foot) => Math.abs(foot.body.linvel().x) < Math.abs(vxBack) * 0.7,
    ),
    'default anti-scoot should cut planted-foot −X scoot',
  );
  assert(
    Math.abs(tractionRig.bones[0]!.body.linvel().x - vxBack) < 1e-6,
    'plant purchase must not cancel body momentum',
  );
  for (const foot of tractionRig.joints) {
    foot.body.setLinvel({ x: vxBack, y: 0 }, true);
  }
  applyPlantSlideBrake(tractionRig, null, world, null, 0);
  assert(
    tractionRig.joints.every(
      (foot) => Math.abs(foot.body.linvel().x - vxBack) < 1e-6,
    ),
    'zero anti-scoot should disable plant purchase',
  );

  // A body merely near the floor is not planted until Rapier reports contact.
  const airborneFoot = spawnCreature(world, {
    name: 'AirborneFoot',
    joints: [{ id: 1, x: -5, y: 0.4, isFoot: true }],
    bones: [],
    muscles: [],
  });
  airborneFoot.joints[0]!.body.setLinvel({ x: vxBack, y: 0 }, true);
  applyPlantSlideBrake(
    airborneFoot,
    null,
    world,
    flatHandle,
    ANTI_SCOOT_MAX,
  );
  const airborneVx = airborneFoot.joints[0]!.body.linvel().x;
  assert(
    Math.abs(airborneVx - vxBack) < 1e-6,
    `near-ground non-contact should not receive anti-scoot (vx=${airborneVx.toFixed(3)})`,
  );

  destroyCreature(world, airborneFoot);
  destroyCreature(world, tractionRig);
  destroyCreature(world, obstacleFoot);
  destroyObstacles(world, flatHandle);
  destroyCreature(world, groundFoot);

  console.log(
    `ramp grip OK slideDown=${slideDown.toFixed(3)} downKeep=${(alongDown / downhillAlong).toFixed(3)} upKeep=${(alongUp / uphillAlong).toFixed(3)} ballSlide=${ballSlide.toFixed(3)} flatBackVx=${groundBack.toFixed(3)}`,
  );
}

async function assertTerrainHeightfield(): Promise<void> {
  assert(featureFlags.terrainHeightfield, 'terrainHeightfield flag should be on');
  const sine = makeSineTerrain({
    startX: 0,
    endX: 40,
    amplitude: 1.5,
    sampleCount: 41,
    waves: 2,
  });
  // Avoid peaks/troughs (zero derivative); u≈0.05 → rising flank for waves=2.
  const grade = sampleTerrainGrade(sine, 2);
  assert(Math.abs(grade) > 0.01, `expected non-zero grade, got ${grade}`);
  assert(sampleTerrainHeight(sine, 20) > 0, 'height at midspan');

  const sim = new Simulation();
  await sim.init();
  if (!sim.world) throw new Error('no world');

  const handle = spawnTerrainHeightfield(sim.world, sine);
  assert(!!handle, 'heightfield spawned');
  assert(handle!.visual.points.length >= 2, 'terrain polyline');
  destroyTerrain(sim.world, handle);

  const plateau = {
    startX: -4,
    endX: 4,
    amplitude: 1,
    samples: new Array(17).fill(1) as number[],
  };
  const env = flatGroundEnv('Smoke Terrain');
  env.terrain = plateau;
  sim.setEnvironment(env);
  sim.loadDesign(cloneDesign(SIMPLE_HOPPER));
  sim.driveMode = 'idle';
  for (let i = 0; i < 150; i++) sim.step(FIXED_DT);
  const snap = sim.snapshot();
  assert(snap.terrain !== null && snap.terrain.points.length >= 2, 'snap terrain');
  for (const j of snap.joints) {
    assert(Number.isFinite(j.x) && Number.isFinite(j.y), 'joint finite on terrain');
  }
  const minY = Math.min(...snap.joints.map((j) => j.y));
  assert(minY > 0.55, `hopper should rest on plateau, minY=${minY}`);

  sim.setEnvironment(flatGroundEnv());
  console.log('terrain heightfield OK');
}

async function assertLaunchPad(): Promise<void> {
  assert(featureFlags.launchPads, 'launchPads flag should be on');
  assert(featureFlags.staticObstacles, 'staticObstacles flag should be on');
  const sim = new Simulation();
  await sim.init();
  if (!sim.world) throw new Error('no world');

  const apex = LAUNCH_PAD_APEX_H;
  const env = flatGroundEnv('Smoke Launch Pad');
  env.obstacles = [
    {
      id: 'pad0',
      kind: 'pad',
      x: 0,
      y: 0.14,
      w: 4,
      h: 0.28,
      launchApex: apex,
    },
    {
      id: 'pad1',
      kind: 'pad',
      x: 8,
      y: 0.14,
      w: 4,
      h: 0.28,
      launchApex: apex,
    },
  ];
  env.spawn = { x: 0, y: 0.55 };
  sim.setEnvironment(env);
  sim.loadDesign(cloneDesign(SIMPLE_HOPPER));
  sim.driveMode = 'idle';

  let peakY = -Infinity;
  let launched = false;
  for (let i = 0; i < 320; i++) {
    sim.step(FIXED_DT);
    const joints = sim.creature!.joints;
    const avgY =
      joints.reduce((s, j) => s + j.body.translation().y, 0) / joints.length;
    peakY = Math.max(peakY, avgY);
    const maxVy = Math.max(...joints.map((j) => j.body.linvel().y));
    if (maxVy > 40) launched = true;
  }
  assert(launched, 'launch pad should impart upward velocity');
  assert(
    peakY >= LAUNCH_PAD_APEX_MIN * 0.45,
    `expected peak near apex ${apex}, got ${peakY.toFixed(1)}`,
  );
  assert(
    peakY <= LAUNCH_PAD_APEX_MAX * 1.25,
    `peak ${peakY.toFixed(1)} exceeds max apex band (${LAUNCH_PAD_APEX_MAX})`,
  );
  assert(
    peakY < 2500,
    `launch should not use old 10× power; peak=${peakY.toFixed(1)}`,
  );

  assert(sim.launchPadSpent(), 'pad0 should be spent after first launch');
  assert(sim.launchPadSpentCount() === 1, 'only pad0 spent so far');

  // Same pad must not re-fire while a second pad remains armed.
  for (let i = 0; i < 120; i++) sim.step(FIXED_DT);
  assert(sim.launchPadSpentCount() === 1, 'pad0 must stay spent; pad1 unused');

  // Place creature onto the second pad — it should still fire once.
  const placeOnPad = (padX: number, padY: number) => {
    const creature = sim.creature!;
    const bodies = [
      ...creature.joints.map((j) => j.body),
      ...creature.bones.map((b) => b.body),
    ];
    const cx =
      creature.joints.reduce((s, j) => s + j.body.translation().x, 0) /
      creature.joints.length;
    const cy =
      creature.joints.reduce((s, j) => s + j.body.translation().y, 0) /
      creature.joints.length;
    const dx = padX - cx;
    const dy = padY + 0.55 - cy;
    for (const b of bodies) {
      const t = b.translation();
      b.setTranslation({ x: t.x + dx, y: t.y + dy }, true);
      b.setLinvel({ x: 0, y: 0 }, true);
      b.setAngvel(0, true);
      b.wakeUp();
    }
  };

  placeOnPad(8, 0.14);
  let launched2 = false;
  let peak2 = -Infinity;
  for (let i = 0; i < 320; i++) {
    sim.step(FIXED_DT);
    const joints = sim.creature!.joints;
    const avgY =
      joints.reduce((s, j) => s + j.body.translation().y, 0) / joints.length;
    peak2 = Math.max(peak2, avgY);
    const maxVy = Math.max(...joints.map((j) => j.body.linvel().y));
    if (maxVy > 40) launched2 = true;
  }
  assert(launched2, 'second pad should still launch');
  assert(sim.launchPadSpentCount() === 2, 'both pads spent after second launch');
  assert(
    peak2 >= LAUNCH_PAD_APEX_MIN * 0.45,
    `second pad peak near apex ${apex}, got ${peak2.toFixed(1)}`,
  );

  // Returning to pad0 must not re-fire.
  placeOnPad(0, 0.14);
  for (let i = 0; i < 120; i++) sim.step(FIXED_DT);
  assert(
    sim.launchPadSpentCount() === 2,
    'returning to pad0 must not create a third fire',
  );

  for (const j of sim.snapshot().joints) {
    assert(Number.isFinite(j.x) && Number.isFinite(j.y), 'joint finite after launch');
  }
  sim.setEnvironment(flatGroundEnv());
  console.log(
    `launch pad OK peakY=${peakY.toFixed(1)} (target ~${apex}, per-pad once/run)`,
  );

  // Winged + max apex used to NaN (aero v² × boost) and panic Rapier WASM.
  const aeroSim = new Simulation();
  await aeroSim.init();
  const aeroEnv = flatGroundEnv('Smoke Launch Pad Aero');
  aeroEnv.obstacles = [
    {
      id: 'pad0',
      kind: 'pad',
      x: 0,
      y: 0.14,
      w: 6,
      h: 0.28,
      launchApex: LAUNCH_PAD_APEX_MAX,
    },
    {
      id: 'pad1',
      kind: 'pad',
      x: 8,
      y: 0.14,
      w: 6,
      h: 0.28,
      launchApex: LAUNCH_PAD_APEX_MAX,
    },
  ];
  aeroEnv.spawn = { x: 0, y: 0.8 };
  aeroSim.setEnvironment(aeroEnv);
  aeroSim.loadDesign(cloneDesign(SIMPLE_FLAPPER));
  aeroSim.driveMode = 'idle';
  for (let i = 0; i < 200; i++) aeroSim.step(FIXED_DT);
  assert(aeroSim.launchPadSpentCount() >= 1, 'flapper should fire pad0 at max apex');
  // Seat lowest joint just above pad1 deck (flapper has no marked feet).
  {
    const creature = aeroSim.creature!;
    const bodies = [
      ...creature.joints.map((j) => j.body),
      ...creature.bones.map((b) => b.body),
    ];
    const cx =
      creature.joints.reduce((s, j) => s + j.body.translation().x, 0) /
      creature.joints.length;
    let minY = Infinity;
    for (const j of creature.joints) {
      minY = Math.min(minY, j.body.translation().y);
    }
    const dx = 8 - cx;
    const dy = 0.14 + 0.28 / 2 + JOINT_RADIUS + 0.05 - minY;
    for (const b of bodies) {
      const t = b.translation();
      b.setTranslation({ x: t.x + dx, y: t.y + dy }, true);
      b.setLinvel({ x: 0, y: -2 }, true);
      b.setAngvel(0, true);
      b.wakeUp();
    }
  }
  let aeroLaunched2 = false;
  for (let i = 0; i < 320; i++) {
    aeroSim.step(FIXED_DT);
    const maxVy = Math.max(
      ...aeroSim.creature!.joints.map((j) => j.body.linvel().y),
    );
    if (maxVy > 40) aeroLaunched2 = true;
    for (const j of aeroSim.snapshot().joints) {
      assert(
        Number.isFinite(j.x) && Number.isFinite(j.y),
        `flapper joint finite after second max-apex pad (step ${i})`,
      );
    }
  }
  assert(aeroLaunched2, 'flapper second max-apex pad should launch');
  assert(
    aeroSim.launchPadSpentCount() === 2,
    'flapper second max-apex pad should fire once',
  );
  console.log('launch pad aero OK (flapper max-apex ×2, finite)');
}

async function assertLaunchTower(): Promise<void> {
  assert(featureFlags.launchTower, 'launchTower flag should be on');
  const sim = new Simulation();
  await sim.init();
  if (!sim.world) throw new Error('no world');

  const handle = spawnLaunchTower(sim.world, {
    x: 0,
    baseW: 3.5,
    height: 1.4,
  });
  assert(handle.bodies.length >= 2, 'stem + deck bodies');
  assert(handle.visuals.some((v) => v.part === 'stem'), 'stem visual');
  assert(handle.visuals.some((v) => v.part === 'deck'), 'deck visual');
  destroyTower(sim.world, handle);

  const env = flatGroundEnv('Smoke Tower');
  env.tower = { x: 0, baseW: 4, height: 1.3 };
  // Spawn on the deck — higher Max-combined grip can eject a ground spawn
  // that used to bounce up the stem under Averaged μ.
  env.spawn = { x: 0, y: 1.05 };
  sim.setEnvironment(env);
  sim.loadDesign(cloneDesign(SIMPLE_HOPPER));
  sim.driveMode = 'idle';
  for (let i = 0; i < 150; i++) sim.step(FIXED_DT);
  const snap = sim.snapshot();
  assert(snap.tower.length >= 2, 'snapshot tower visuals');
  for (const j of snap.joints) {
    assert(Number.isFinite(j.x) && Number.isFinite(j.y), 'joint finite on tower');
  }
  const minY = Math.min(...snap.joints.map((j) => j.y));
  assert(minY > 0.7, `hopper should rest on deck, minY=${minY}`);

  sim.setEnvironment(flatGroundEnv());
  console.log('launch tower OK');
}

async function assertJumpTaskScores(): Promise<void> {
  const sim = new Simulation();
  await sim.init();
  const shape = shapeForDesign(SIMPLE_HOPPER);
  const w = randomWeights(shape, createRng(7));
  const result = evaluateTaskEpisode(
    sim,
    cloneDesign(SIMPLE_HOPPER),
    shape,
    w,
    'jump',
    3,
  );
  assert(Number.isFinite(result.fitness), 'jump fitness finite');
  assert(result.peakHeight >= 0, 'peakHeight tracked');
  console.log(`jump task OK fitness=${result.fitness.toFixed(3)} peak=${result.peakHeight.toFixed(3)}`);
}

async function assertMotorTorqueMoves(): Promise<void> {
  assert(featureFlags.motorWheels, 'motorWheels flag should be on');

  const wheelsOnly = cloneDesign(MOTOR_CART);
  wheelsOnly.name = 'Wheels Only Cart';
  wheelsOnly.muscles = [];
  assert(countWheelActuators(wheelsOnly.joints) === 2, 'cart has 2 wheels');
  assert(
    countDesignActuatorChannels(wheelsOnly, true) === 2,
    'wheels-only channels = 2',
  );
  assert(designHasActuators(wheelsOnly, true), 'wheels-only is trainable');
  assert(
    shapeForDesign(wheelsOnly).outputCount === 2,
    'wheels-only brain outputs = 2',
  );
  const wheelDrives = extractWheelDrives(wheelsOnly, [0.5, -0.25], true);
  assert(
    wheelDrives[0] === 0.5 && wheelDrives[1] === -0.25,
    'wheel drives are dedicated channels',
  );

  const withMuscles = cloneDesign(MOTOR_CART);
  const muscleCh =
    countDesignActuatorChannels(withMuscles, true) -
    countWheelActuators(withMuscles.joints);
  assert(
    shapeForDesign(withMuscles).outputCount ===
      muscleCh + countWheelActuators(withMuscles.joints),
    'cart shape includes muscle + wheel channels',
  );

  const sim = new Simulation();
  await sim.init();
  sim.setTask('motor');
  sim.loadDesign(wheelsOnly);
  sim.driveMode = 'manual';
  sim.setAllManual(1);
  assert(
    sim.manualDrives.length === 2,
    `wheels-only manual drives length (got ${sim.manualDrives.length})`,
  );
  const startX =
    sim.creature!.joints.reduce((s, j) => s + j.body.translation().x, 0) /
    sim.creature!.joints.length;
  for (let i = 0; i < 180; i++) sim.step(FIXED_DT);
  const endX =
    sim.creature!.joints.reduce((s, j) => s + j.body.translation().x, 0) /
    sim.creature!.joints.length;
  console.log(`wheels-only cart Δx=${(endX - startX).toFixed(3)}`);
  assert(
    endX > startX + 0.15,
    `wheels-only cart should move +X (Δx=${endX - startX})`,
  );
  console.log('motor torque OK (wheels as brain actuators)');
}

async function assertAeroSlowsFall(): Promise<void> {
  assert(featureFlags.aeroLikeForces, 'aeroLikeForces flag should be on');
  async function fallY(withAero: boolean): Promise<number> {
    const design = cloneDesign(SIMPLE_GLIDER);
    if (!withAero) {
      for (const b of design.bones) {
        b.aeroArea = 0;
        delete b.aeroType;
      }
    }
    // Drop from higher by shifting joints up
    for (const j of design.joints) j.y += 4;
    const sim = new Simulation();
    await sim.init();
    sim.setTask('flight');
    sim.loadDesign(design);
    sim.driveMode = 'idle';
    // Sample mid-air (before ground contact) so soft-CCD ground settle cannot mask drag.
    for (let i = 0; i < 45; i++) sim.step(FIXED_DT);
    const joints = sim.creature!.joints;
    return joints.reduce((s, j) => s + j.body.translation().y, 0) / joints.length;
  }
  const yAero = await fallY(true);
  const yBare = await fallY(false);
  console.log(`aero avgY=${yAero.toFixed(3)} bare avgY=${yBare.toFixed(3)}`);
  assert(yAero > yBare + 0.05, 'aero body should fall slower (higher avgY)');
  console.log('aero-like OK');
}

function assertWingPairValidation(): void {
  assert(featureFlags.structuralAeroParts, 'structuralAeroParts flag should be on');
  assert(wingPairOk(SIMPLE_FLAPPER), 'flapper should have paired wings');
  assert(countWings(SIMPLE_FLAPPER) === 2, 'flapper wing count');
  const odd = cloneDesign(SIMPLE_FLAPPER);
  odd.bones = odd.bones.filter((b) => b.id !== 2);
  assert(!wingPairOk(odd), 'odd wing count should fail pair check');
  console.log('wing pair validation OK');
}

/** High-area paired wings under sine should climb vs the same body with aero off. */
async function assertWingFlapClimb(): Promise<void> {
  assert(featureFlags.structuralAeroParts, 'structuralAeroParts flag should be on');
  const winged: CreatureDesign = {
    name: 'Smoke Flapper',
    joints: [
      { id: 1, x: -2.2, y: 2.4 },
      { id: 2, x: 2.2, y: 2.4 },
      { id: 3, x: 0.0, y: 1.8, isHead: true },
      { id: 4, x: 0.0, y: 0.9, isFoot: true },
    ],
    bones: [
      { id: 1, startJointId: 1, endJointId: 3, aeroArea: 8, aeroType: 'wing' },
      { id: 2, startJointId: 2, endJointId: 3, aeroArea: 8, aeroType: 'wing' },
      { id: 3, startJointId: 3, endJointId: 4 },
    ],
    muscles: [
      { id: 1, startBoneId: 1, endBoneId: 3, canExpand: true, strength: 400 },
      { id: 2, startBoneId: 2, endBoneId: 3, canExpand: true, strength: 400 },
      { id: 3, startBoneId: 1, endBoneId: 2, canExpand: true, strength: 220 },
    ],
  };
  const bare = cloneDesign(winged);
  for (const b of bare.bones) {
    b.aeroArea = 0;
    delete b.aeroType;
  }

  async function peakAfterFlap(design: CreatureDesign): Promise<{
    grounded: number;
    peak: number;
  }> {
    const sim = new Simulation();
    await sim.init();
    sim.setTask('flight');
    sim.loadDesign(cloneDesign(design));
    sim.driveMode = 'idle';
    for (let i = 0; i < 150; i++) sim.step(FIXED_DT);
    const joints = () => sim.creature!.joints;
    const avg = () =>
      joints().reduce((s, j) => s + j.body.translation().y, 0) / joints().length;
    const grounded = avg();
    sim.driveMode = 'sine';
    let peak = grounded;
    for (let i = 0; i < 420; i++) {
      sim.step(FIXED_DT);
      peak = Math.max(peak, avg());
    }
    return { grounded, peak };
  }

  const withWings = await peakAfterFlap(winged);
  const without = await peakAfterFlap(bare);
  const climbW = withWings.peak - withWings.grounded;
  const climbB = without.peak - without.grounded;
  console.log(
    `wing flap climbW=${climbW.toFixed(3)} climbB=${climbB.toFixed(3)} peakW=${withWings.peak.toFixed(3)} peakB=${without.peak.toFixed(3)}`,
  );
  assert(climbW > climbB + 0.35, 'winged sine flapper should climb more than bare');
  assert(climbW > 0.4, 'winged sine flapper should gain clear height');
  console.log('wing flap climb OK');
}

async function assertParachuteSlowsFall(): Promise<void> {
  assert(featureFlags.structuralAeroParts, 'structuralAeroParts flag should be on');
  async function fallY(withChute: boolean): Promise<number> {
    const design = cloneDesign(CHUTE_DROPPER);
    if (!withChute) {
      for (const b of design.bones) {
        b.aeroArea = 0;
        delete b.aeroType;
      }
    }
    for (const j of design.joints) j.y += 5;
    const sim = new Simulation();
    await sim.init();
    sim.setTask('flight');
    sim.loadDesign(design);
    sim.driveMode = 'idle';
    for (let i = 0; i < 100; i++) sim.step(FIXED_DT);
    const joints = sim.creature!.joints;
    return joints.reduce((s, j) => s + j.body.translation().y, 0) / joints.length;
  }
  const yChute = await fallY(true);
  const yBare = await fallY(false);
  console.log(`chute avgY=${yChute.toFixed(3)} bare avgY=${yBare.toFixed(3)}`);
  assert(yChute > yBare + 0.08, 'parachute should fall slower (higher avgY)');
  console.log('parachute fall OK');
}

/**
 * Horizontal coast (zero-g): chute stays deflated / streams and keeps more +X
 * than legacy always-on aero. Vertical fall: chute inflates.
 */
async function assertParachuteStreamsForward(): Promise<void> {
  assert(featureFlags.structuralAeroParts, 'structuralAeroParts flag should be on');

  async function coastEndVx(mode: 'parachute' | 'legacy'): Promise<number> {
    const design = cloneDesign(CHUTE_DROPPER);
    for (const b of design.bones) {
      if ((b.aeroArea ?? 0) <= 0) continue;
      if (mode === 'legacy') delete b.aeroType;
      else b.aeroType = 'parachute';
    }
    for (const j of design.joints) j.y += 3;
    const sim = new Simulation();
    await sim.init();
    sim.world!.gravity = { x: 0, y: 0 };
    sim.setTask('flight');
    sim.loadDesign(design);
    sim.driveMode = 'idle';
    for (const j of sim.creature!.joints) {
      j.body.setLinvel({ x: 6, y: 0 }, true);
    }
    for (const b of sim.creature!.bones) {
      b.body.setLinvel({ x: 6, y: 0 }, true);
    }
    for (let i = 0; i < 60; i++) sim.step(FIXED_DT);
    const joints = sim.creature!.joints;
    return joints.reduce((s, j) => s + j.body.linvel().x, 0) / joints.length;
  }

  async function meanInflationAfterFall(): Promise<number> {
    const design = cloneDesign(CHUTE_DROPPER);
    for (const j of design.joints) j.y += 5;
    const sim = new Simulation();
    await sim.init();
    sim.setTask('flight');
    sim.loadDesign(design);
    sim.driveMode = 'idle';
    for (let i = 0; i < 45; i++) sim.step(FIXED_DT);
    const chutes = sim.creature!.bones.filter((b) => b.aeroType === 'parachute');
    assert(chutes.length > 0, 'expected parachute bones');
    return chutes.reduce((s, b) => s + b.chuteInflation, 0) / chutes.length;
  }

  const vxPara = await coastEndVx('parachute');
  const vxLegacy = await coastEndVx('legacy');
  console.log(
    `stream vxPara=${vxPara.toFixed(3)} vxLegacy=${vxLegacy.toFixed(3)}`,
  );
  assert(
    vxPara > vxLegacy + 0.2,
    'streaming parachute should keep more forward speed than legacy aero',
  );

  const infl = await meanInflationAfterFall();
  console.log(`chute inflation after fall=${infl.toFixed(3)}`);
  assert(infl > 0.35, 'parachute should inflate while falling');
  console.log('parachute stream OK');
}

function countPngs(dir: string): number {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) n += countPngs(full);
    else if (name.toLowerCase().endsWith('.png')) n += 1;
  }
  return n;
}

function assertCatalogAndZones(): void {
  const assets = join(
    fileURLToPath(new URL('.', import.meta.url)),
    '../src/assets/bodyParts',
  );
  const pngCount = countPngs(assets);
  assert(pngCount > 50, `expected body-part PNGs, got ${pngCount}`);
  assert(ZONE_ORDER.length === 6, 'six zones');
  assert(ZONES.walking.defaultTask === 'run', 'walking → run');
  assert(ZONES.jumping.defaultTask === 'jump', 'jumping → jump');
  assert(ZONES.disco.shortLabel === 'Disco', 'disco zone present');
  assert(BUNDLED_MODELS.length >= 3, 'bundled models present');
  assert(GOAL_CATALOG.length >= 6, 'goal catalog has task families');
  assert(goalsForZone('walking').some((g) => g.id === 'run'), 'walking lists run');
  assert(goalsForZone('walking').some((g) => g.id === 'rough'), 'walking lists rough');
  assert(
    goalsForZone('free').length ===
      GOAL_CATALOG.filter((g) => g.id !== 'dance').length,
    'free lists evolve goals (excludes dance)',
  );
  assert(goalsForZone('disco').length === 0, 'disco has no evolve goals');
  assert(
    GOAL_CATALOG.some((g) => g.id === 'dance'),
    'dance goal present for saved-model labeling',
  );
  assert(defaultGoalForZone('motor').task === 'motor', 'motor zone default');
  console.log(
    `catalog OK pngs=${pngCount} zones=${ZONE_ORDER.length} goals=${GOAL_CATALOG.length} bundled=${BUNDLED_MODELS.length}`,
  );
}

function assertPackages(): void {
  ensureLocalStorage();
  const saved = saveNewPackage(cloneDesign(TRIANGLE_WALKER), {
    displayName: 'Smoke Pack',
    source: 'user',
  });
  assert(saved.ok, 'save package');
  assert(saved.ok && saved.value.schemaVersion === CREATURE_PACKAGE_SCHEMA, 'schema');
  const all = loadCreaturePackages();
  assert(all.some((p) => p.displayName === 'Smoke Pack'), 'package listed');
  if (saved.ok) deletePackage(saved.value.id);
  console.log('creature packages OK');
}

function assertSecretGoals(): void {
  ensureLocalStorage();
  clearSecretDiscoveries();
  assert(featureFlags.secretGoals, 'secretGoals flag should be on');
  assert(SECRET_GOALS.length === 100, 'one hundred discoverable secrets');

  const hopper = cloneDesign(SIMPLE_HOPPER);
  const motorDef = SECRET_GOALS.find((g) => g.id === 'motor_wheelie');
  assert(!!motorDef, 'motor_wheelie defined');
  assert(!secretEligible(hopper, motorDef!), 'hopper ineligible for wheeled secret');
  assert(
    secretEligible(cloneDesign(MOTOR_CART), motorDef!),
    'motor cart eligible for wheeled secret',
  );

  const zeroHero = evaluateSecretGoals({
    task: 'run',
    metrics: { ...emptyMetrics(), distance: 0.1, fell: false },
    design: hopper,
    episodeSeconds: 10,
  });
  assert(zeroHero.includes('run_zero_hero'), `expected run_zero_hero, got ${zeroHero}`);

  const recorded = recordDiscovery({
    secretGoalId: 'run_zero_hero',
    discoveredAt: new Date().toISOString(),
    modelName: 'Smoke',
    activeTask: 'run',
    context: 'evolve',
  });
  assert(recorded, 'first discovery records');
  assert(isSecretDiscovered('run_zero_hero'), 'ledger has discovery');
  assert(
    !recordDiscovery({
      secretGoalId: 'run_zero_hero',
      discoveredAt: new Date().toISOString(),
      modelName: 'Smoke',
      activeTask: 'run',
      context: 'evolve',
    }),
    'duplicate discovery idempotent',
  );

  const again = evaluateSecretGoals({
    task: 'run',
    metrics: { ...emptyMetrics(), distance: 0.1, fell: false },
    design: hopper,
    episodeSeconds: 10,
  });
  assert(!again.includes('run_zero_hero'), 'already discovered not re-emitted');
  assert(Object.keys(loadSecretDiscoveries()).length >= 1, 'ledger non-empty');
  clearSecretDiscoveries();
  console.log('secret goals OK');
}

function assertEnvironmentPackages(): void {
  ensureLocalStorage();
  assert(featureFlags.environmentsRepo, 'environmentsRepo flag should be on');
  assert(ENV_THEMES.length === 4, 'four themes');

  const env = flatGroundEnv('Smoke Flat');
  env.theme = 'mint';
  const saved = saveNewEnvironmentPackage(env, {
    displayName: 'Smoke Env',
    source: 'user',
  });
  assert(saved.ok, 'save env package');
  assert(
    saved.ok && saved.value.schemaVersion === ENVIRONMENT_PACKAGE_SCHEMA,
    'env schema',
  );
  const listed = loadEnvironmentPackages();
  assert(listed.some((p) => p.displayName === 'Smoke Env'), 'env package listed');
  assert(
    listEnvironmentsForUi().some((p) => p.id === 'builtin_flat_ground'),
    'builtin flat ground in UI list',
  );

  const json = exportEnvironmentJson(env);
  const round = importEnvironmentJson(json);
  assert(round.ok, 'env import ok');
  assert(round.ok && round.value.theme === 'mint', 'theme round-trip');
  assert(round.ok && round.value.obstacles.length === 0, 'empty obstacles');

  env.obstacles = [
    { id: 'o1', kind: 'box', x: 1, y: 0.5, w: 2, h: 1 },
    { id: 'o2', kind: 'stair', x: 4, y: 0, w: 5, h: 2 },
  ];
  const withObs = exportEnvironmentJson(env);
  const roundObs = importEnvironmentJson(withObs);
  assert(roundObs.ok, 'env with obstacles import ok');
  assert(
    roundObs.ok && roundObs.value.obstacles.length === 2,
    'obstacles round-trip',
  );
  assert(
    !importEnvironmentJson(
      JSON.stringify({
        kind: 'freshstart-environment',
        version: 1,
        environment: {
          name: 'bad',
          theme: 'plain',
          obstacles: [{ id: 'x', kind: 'portal', x: 0, y: 0, w: 1, h: 1 }],
        },
      }),
    ).ok,
    'rejects unknown obstacle kind',
  );

  env.terrain = makeSineTerrain({ startX: 0, endX: 20, amplitude: 1 });
  const withTerrain = exportEnvironmentJson(env);
  const roundTerrain = importEnvironmentJson(withTerrain);
  assert(roundTerrain.ok, 'env with terrain import ok');
  assert(
    roundTerrain.ok &&
      !!roundTerrain.value.terrain &&
      roundTerrain.value.terrain.samples.length >= 2,
    'terrain round-trip',
  );

  env.tower = { x: 2, baseW: 3, height: 5 };
  const withTower = exportEnvironmentJson(env);
  const roundTower = importEnvironmentJson(withTower);
  assert(roundTower.ok, 'env with tower import ok');
  assert(
    roundTower.ok &&
      !!roundTower.value.tower &&
      roundTower.value.tower.height === 5,
    'tower round-trip',
  );

  env.regions = [
    {
      id: 'r1',
      kind: 'penalty',
      x: 0,
      y: 1,
      w: 4,
      h: 2,
      rate: SCORE_REGION_DEFAULT_PENALTY_RATE,
    },
    {
      id: 'r2',
      kind: 'reward',
      x: 5,
      y: 1,
      w: 2,
      h: 2,
      rate: SCORE_REGION_DEFAULT_REWARD_RATE,
    },
  ];
  const withRegions = exportEnvironmentJson(env);
  const roundRegions = importEnvironmentJson(withRegions);
  assert(roundRegions.ok, 'env with regions import ok');
  assert(
    roundRegions.ok && (roundRegions.value.regions?.length ?? 0) === 2,
    'regions round-trip',
  );
  assert(
    !importEnvironmentJson(
      JSON.stringify({
        kind: 'freshstart-environment',
        version: 1,
        environment: {
          name: 'bad-region',
          theme: 'plain',
          obstacles: [],
          regions: [
            { id: 'x', kind: 'lava', x: 0, y: 0, w: 1, h: 1, rate: 1 },
          ],
        },
      }),
    ).ok,
    'rejects unknown region kind',
  );

  if (saved.ok) deleteEnvironmentPackage(saved.value.id);
  console.log('environment packages OK');
}

async function assertScoreRegions(): Promise<void> {
  assert(featureFlags.scoreRegions, 'scoreRegions flag should be on');

  const shape = shapeForDesign(SIMPLE_HOPPER);
  const weights = randomWeights(shape, createRng(7));
  const episodeSeconds = 4;

  async function runWithRegions(
    regions: EnvScoreRegion[],
  ): Promise<Awaited<ReturnType<typeof evaluateTaskEpisode>>> {
    const sim = new Simulation();
    await sim.init();
    const env = flatGroundEnv('Score Region Smoke');
    env.regions = regions;
    sim.setEnvironment(env);
    return evaluateTaskEpisode(
      sim,
      cloneDesign(SIMPLE_HOPPER),
      shape,
      weights,
      'run',
      episodeSeconds,
    );
  }

  const baseline = await runWithRegions([]);
  const penaltyRegion: EnvScoreRegion = {
    id: 'pen',
    kind: 'penalty',
    x: 0,
    y: 1,
    w: 20,
    h: 6,
    rate: 2,
  };
  const withPenalty = await runWithRegions([penaltyRegion]);
  assert(withPenalty.regionPenalty > 0.2, 'penalty should accrue over time');
  assert(
    withPenalty.fitness < baseline.fitness - 0.05 ||
      withPenalty.regionPenalty > 0.5,
    'penalty should lower fitness vs baseline (or accrue meaningfully)',
  );

  const rewardRegion: EnvScoreRegion = {
    id: 'rew',
    kind: 'reward',
    x: 0,
    y: 1,
    w: 20,
    h: 6,
    rate: 1.5,
  };
  const withReward = await runWithRegions([rewardRegion]);
  assert(
    Math.abs(withReward.regionReward - 1.5) < 1e-6,
    `reward should be touch-once flat ${1.5}, got ${withReward.regionReward}`,
  );
  assert(
    withReward.fitness > baseline.fitness - 1e-6,
    'reward should not lower fitness vs baseline',
  );
  assert(
    withReward.regionReward <= rewardRegion.rate + 1e-9,
    'reward must not accumulate with time-in-zone',
  );

  const landingRegion: EnvScoreRegion = {
    id: 'land',
    kind: 'landing',
    x: 0,
    y: 1,
    w: 20,
    h: 6,
    rate: 12,
  };
  // Grounded episode overlapping landing — no airtime → no credit.
  const groundedLand = await runWithRegions([landingRegion]);
  assert(
    groundedLand.regionReward === 0,
    `landing must not credit before airtime, got ${groundedLand.regionReward}`,
  );

  // Direct accum: after airtime, foot overlap credits once.
  {
    const sim = new Simulation();
    await sim.init();
    sim.setEnvironment(flatGroundEnv('Landing Accum'));
    sim.loadDesign(cloneDesign(SIMPLE_HOPPER));
    for (let i = 0; i < 30; i++) sim.step(FIXED_DT);
    const creature = sim.creature!;
    let accum = emptyScoreRegionAccum();
    accum = updateScoreRegionAccum(
      creature,
      [landingRegion],
      FIXED_DT,
      accum,
      0,
    );
    assert(accum.landingReward === 0, 'landing blocked at airTime=0');
    accum = updateScoreRegionAccum(
      creature,
      [landingRegion],
      FIXED_DT,
      accum,
      1,
    );
    assert(
      Math.abs(accum.landingReward - 12) < 1e-6,
      `landing should credit 12 after airtime, got ${accum.landingReward}`,
    );
    const again = updateScoreRegionAccum(
      creature,
      [landingRegion],
      FIXED_DT,
      accum,
      1,
    );
    assert(
      Math.abs(again.landingReward - 12) < 1e-6,
      'landing must be touch-once',
    );
  }

  const flags = featureFlags as {
    scoreRegions: boolean;
    endEpisodeOnLanding: boolean;
  };
  const prev = flags.scoreRegions;
  flags.scoreRegions = false;
  try {
    const ignored = await runWithRegions([penaltyRegion, rewardRegion]);
    assert(ignored.regionPenalty === 0, 'flag off ignores penalty');
    assert(ignored.regionReward === 0, 'flag off ignores reward');
    assert(
      Math.abs(ignored.fitness - baseline.fitness) < 1e-6,
      'flag off fitness matches baseline',
    );
  } finally {
    flags.scoreRegions = prev;
  }

  // Drop from height into a landing pad — episode should end once landing credits.
  assert(flags.endEpisodeOnLanding, 'endEpisodeOnLanding flag should be on');
  {
    const dropSeconds = 12;
    const sim = new Simulation();
    await sim.init();
    const env = flatGroundEnv('Landing End Early');
    env.spawn = { x: 0, y: 8 };
    env.regions = [
      {
        id: 'land-drop',
        kind: 'landing',
        x: 0,
        y: 1,
        w: 40,
        h: 4,
        rate: 12,
      },
    ];
    sim.setEnvironment(env);
    const landed = await evaluateTaskEpisode(
      sim,
      cloneDesign(SIMPLE_HOPPER),
      shape,
      weights,
      'run',
      dropSeconds,
    );
    assert(
      landed.regionReward >= 12 - 1e-6,
      `drop should credit landing, got ${landed.regionReward}`,
    );
    assert(
      shouldEndEpisodeOnLanding({
        penalty: 0,
        reward: 0,
        landingReward: 12,
        touchedRewardIds: new Set(['land-drop']),
      }),
      'shouldEndEpisodeOnLanding true after credit',
    );
    assert(
      landed.episodeTime < dropSeconds - 0.5,
      `landing should end episode early (${landed.episodeTime}s vs ${dropSeconds}s)`,
    );
    assert(!landed.fell, 'successful landing must not count as a fall');

    const prevEnd = flags.endEpisodeOnLanding;
    flags.endEpisodeOnLanding = false;
    try {
      const simFull = new Simulation();
      await simFull.init();
      simFull.setEnvironment(env);
      const full = await evaluateTaskEpisode(
        simFull,
        cloneDesign(SIMPLE_HOPPER),
        shape,
        weights,
        'run',
        dropSeconds,
      );
      assert(
        full.regionReward >= 12 - 1e-6,
        'flag off still credits landing',
      );
      assert(
        full.episodeTime >= dropSeconds - 1e-6 || full.fell,
        `flag off should run full try or fall-stop, got t=${full.episodeTime} fell=${full.fell}`,
      );
    } finally {
      flags.endEpisodeOnLanding = prevEnd;
    }
  }

  console.log(
    `score regions OK baseline=${baseline.fitness.toFixed(3)} ` +
      `pen=${withPenalty.fitness.toFixed(3)} (Δp=${withPenalty.regionPenalty.toFixed(2)}) ` +
      `rew=${withReward.fitness.toFixed(3)} (+${withReward.regionReward.toFixed(2)}) ` +
      `landing=airborne-gated end-on-landing`,
  );
}

async function assertCourseMarkers(): Promise<void> {
  assert(featureFlags.courseMarkers, 'courseMarkers flag should be on');
  assert(
    GOAL_CATALOG.some((g) => g.id === 'sprint'),
    'sprint goal in catalog',
  );

  const shape = shapeForDesign(SIMPLE_HOPPER);
  const weights = randomWeights(shape, createRng(11));
  const episodeSeconds = 3;

  async function runSprint(
    markers: EnvCourseMarker[],
  ): Promise<Awaited<ReturnType<typeof evaluateTaskEpisode>>> {
    const sim = new Simulation();
    await sim.init();
    const env = flatGroundEnv('Course Marker Smoke');
    env.markers = markers;
    sim.setEnvironment(env);
    return evaluateTaskEpisode(
      sim,
      cloneDesign(SIMPLE_HOPPER),
      shape,
      weights,
      'sprint',
      episodeSeconds,
    );
  }

  const startFinish: EnvCourseMarker[] = [
    {
      id: 's1',
      kind: 'start',
      x: 0,
      y: 1.5,
      w: 8,
      h: 4,
    },
    {
      id: 'f1',
      kind: 'finish',
      x: 0,
      y: 1.5,
      w: 8,
      h: 4,
    },
  ];
  const finished = await runSprint(startFinish);
  assert(finished.finished, 'start+finish at spawn should complete course');
  assert(finished.courseArmed, 'course should arm at start');
  assert(
    finished.finishTime != null && finished.finishTime >= 0,
    'finishTime recorded as race elapsed',
  );
  assert(
    finished.raceTime != null && finished.raceTime >= 0,
    'raceTime exposed on metrics',
  );
  assert(
    finished.fitness >= SPRINT_FINISH_BONUS * 0.5,
    `sprint finish should score meaningfully, got ${finished.fitness}`,
  );

  const gated: EnvCourseMarker[] = [
    {
      id: 's2',
      kind: 'start',
      x: 0,
      y: 1.5,
      w: 8,
      h: 4,
    },
    {
      id: 'c0',
      kind: 'checkpoint',
      order: 0,
      x: 40,
      y: 1.5,
      w: 1,
      h: 3,
    },
    {
      id: 'f2',
      kind: 'finish',
      x: 0,
      y: 1.5,
      w: 8,
      h: 4,
    },
  ];
  const blocked = await runSprint(gated);
  assert(!blocked.finished, 'finish gated until ordered checkpoint');
  assert(blocked.checkpointsHit === 0, 'distant checkpoint not hit');

  const withCp: EnvCourseMarker[] = [
    {
      id: 's3',
      kind: 'start',
      x: 0,
      y: 1.5,
      w: 8,
      h: 4,
    },
    {
      id: 'c1',
      kind: 'checkpoint',
      order: 0,
      x: 0,
      y: 1.5,
      w: 8,
      h: 4,
    },
    {
      id: 'f3',
      kind: 'finish',
      x: 0,
      y: 1.5,
      w: 8,
      h: 4,
    },
  ];
  const cpDone = await runSprint(withCp);
  assert(cpDone.checkpointsHit >= 1, 'checkpoint at spawn credits');
  assert(cpDone.finished, 'finish after checkpoint');
  assert(
    cpDone.fitness >= SPRINT_CHECKPOINT_BONUS,
    'checkpoint contributes to fitness',
  );

  const envRound = flatGroundEnv('Marker Roundtrip');
  envRound.markers = startFinish;
  const json = exportEnvironmentJson(envRound);
  const imported = importEnvironmentJson(json);
  assert(imported.ok, 'env with markers imports');
  if (imported.ok) {
    assert(
      (imported.value.markers ?? []).length === 2,
      'markers survive roundtrip',
    );
  }
  assert(
    !importEnvironmentJson(
      JSON.stringify({
        kind: 'freshstart-environment',
        version: 1,
        environment: {
          ...flatGroundEnv('Bad'),
          markers: [{ id: 'x', kind: 'portal', x: 0, y: 0, w: 1, h: 1 }],
        },
      }),
    ).ok,
    'rejects unknown marker kind',
  );

  const flags = featureFlags as { courseMarkers: boolean };
  const prev = flags.courseMarkers;
  flags.courseMarkers = false;
  try {
    const ignored = await runSprint(startFinish);
    assert(!ignored.finished, 'flag off ignores finish');
    assert(ignored.checkpointsHit === 0, 'flag off ignores checkpoints');
  } finally {
    flags.courseMarkers = prev;
  }

  // Race clock: delayed start → finishTime is elapsed since arm, not absolute t.
  {
    const sim = new Simulation();
    await sim.init();
    sim.loadDesign(cloneDesign(SIMPLE_HOPPER));
    const creature = sim.creature;
    assert(!!creature, 'creature for race clock');
    if (!creature) throw new Error('no creature');
    const markers: EnvCourseMarker[] = [
      { id: 'rs', kind: 'start', x: 100, y: 1.5, w: 1, h: 3 },
      { id: 'rf', kind: 'finish', x: 0, y: 1.5, w: 8, h: 4 },
    ];
    let accum = emptyCourseMarkerAccum(markers);
    // t=0.5: at spawn (finish) but not armed yet
    accum = updateCourseMarkerAccum(creature, markers, 0.5, accum);
    assert(!accum.armed, 'distant start should not arm yet');
    assert(courseRaceTime(accum, 0.5) == null, 'timer null before start');
    // Move a joint onto the start gate by temporarily overlapping via marker at spawn
    const armMarkers: EnvCourseMarker[] = [
      { id: 'rs2', kind: 'start', x: 0, y: 1.5, w: 8, h: 4 },
      { id: 'rf2', kind: 'finish', x: 40, y: 1.5, w: 1, h: 3 },
    ];
    accum = emptyCourseMarkerAccum(armMarkers);
    accum = updateCourseMarkerAccum(creature, armMarkers, 1.25, accum);
    assert(accum.armed && accum.startTime === 1.25, 'startTime = arm simTime');
    assert(
      Math.abs((courseRaceTime(accum, 2.0) ?? -1) - 0.75) < 1e-6,
      'live race clock = simTime - startTime',
    );
    // Finish at spawn while armed (finish moved onto creature)
    const doneMarkers: EnvCourseMarker[] = [
      { id: 'rs3', kind: 'start', x: 0, y: 1.5, w: 8, h: 4 },
      { id: 'rf3', kind: 'finish', x: 0, y: 1.5, w: 8, h: 4 },
    ];
    accum = emptyCourseMarkerAccum(doneMarkers);
    accum = updateCourseMarkerAccum(creature, doneMarkers, 0.8, accum);
    assert(accum.finished, 'armed finish completes');
    assert(
      accum.finishTime != null && Math.abs(accum.finishTime) < 1e-6,
      'finishTime is elapsed (~0 when start+finish same step)',
    );
  }

  assert(featureFlags.courseCurriculum, 'courseCurriculum flag on');
  const curriculum = curriculumForPackageId(BUILTIN_GAUNTLET_ENV_ID);
  assert(!!curriculum, 'gauntlet curriculum registered');
  assert(
    GAUNTLET_CURRICULUM.stages.length >= 4,
    'gauntlet has progressive stages',
  );
  const stage0 = applyCourseCurriculumStage(GAUNTLET_CURRICULUM, 0);
  const stageFull = applyCourseCurriculumStage(GAUNTLET_CURRICULUM, 3);
  assert(
    (stage0.markers ?? []).some((m) => m.kind === 'finish' && m.x === 40),
    'stage 0 finish at stairs',
  );
  assert(
    (stage0.markers ?? []).filter((m) => m.kind === 'checkpoint').length === 0,
    'stage 0 has no mid checkpoints (start→stage finish)',
  );
  assert(
    (stageFull.markers ?? []).filter((m) => m.kind === 'checkpoint').length ===
      0,
    'full stage has no mid checkpoints',
  );
  assert(
    (stageFull.markers ?? []).some((m) => m.kind === 'finish' && m.x === 130),
    'full stage finish at course end',
  );
  assert(stage0.spawn?.x === 0 && stage0.spawn?.y === 0, 'stage spawn at origin');

  // Peak-progress sprint: a "fallen after climb" must outscore a short upright scoot.
  {
    const { scoreTaskPerformance: score } = await import(
      '../src/brain/taskScore.ts'
    );
    const sim = new Simulation();
    await sim.init();
    sim.loadDesign(cloneDesign(SIMPLE_HOPPER));
    const creature = sim.creature!;
    const startX = 0;
    const climber = score(
      'sprint',
      creature,
      startX,
      true,
      0,
      0,
      0,
      0.9,
      0,
      undefined,
      undefined,
      0,
      2,
      40,
    );
    const scooter = score(
      'sprint',
      creature,
      startX,
      false,
      0,
      0,
      0,
      1,
      0,
      undefined,
      undefined,
      0,
      2,
      12,
    );
    assert(
      climber.fitness > scooter.fitness,
      `peak climb after fall (${climber.fitness}) should beat short scoot (${scooter.fitness})`,
    );
  }
  assert(
    (stageFull.markers ?? []).some((m) => m.kind === 'finish' && m.x === 130),
    'full stage finish at course end',
  );
  const uiEnvs = listEnvironmentsForUi();
  assert(
    uiEnvs.some((p) => p.id === BUILTIN_GAUNTLET_ENV_ID),
    'Gauntlet listed in env picker',
  );

  console.log(
    `course markers OK finish@${(finished.finishTime ?? 0).toFixed(2)}s ` +
      `fitness=${finished.fitness.toFixed(3)} gated=${blocked.finished} ` +
      `cp=${cpDone.checkpointsHit} gauntletStages=${GAUNTLET_CURRICULUM.stages.length}`,
  );
}

async function assertDiscoFloor(): Promise<void> {
  assert(featureFlags.discoMode, 'discoMode flag should be on');
  const env = discoFloorEnv();
  assert(
    env.obstacles.some((o) => o.id === 'disco-wall-l'),
    'disco left wall',
  );
  assert(
    env.obstacles.some((o) => o.id === 'disco-wall-r'),
    'disco right wall',
  );
  const left = env.obstacles.find((o) => o.id === 'disco-wall-l')!;
  const right = env.obstacles.find((o) => o.id === 'disco-wall-r')!;
  assert(left.x < -DISCO_WALL_X * 0.9, `left wall x=${left.x}`);
  assert(right.x > DISCO_WALL_X * 0.9, `right wall x=${right.x}`);

  const sim = new Simulation();
  await sim.init();
  sim.setEnvironment(env);
  sim.loadDesign(cloneDesign(DISCO_DANCER));
  sim.driveMode = 'idle';
  for (let i = 0; i < 90; i++) sim.step(FIXED_DT);
  const snap = sim.snapshot();
  assert(snap.obstacles.length >= 2, 'disco walls in snapshot');
  for (const j of snap.joints) {
    assert(Number.isFinite(j.x) && Number.isFinite(j.y), 'disco joints finite');
    assert(Math.abs(j.x) < DISCO_WALL_X + 2, `joint stayed in arena x=${j.x}`);
  }
  sim.setEnvironment(flatGroundEnv());
  console.log('disco floor OK');
}

function assertDiscoBandRouting(): void {
  const design = cloneDesign(DISCO_DANCER);
  const bands: AudioBands = {
    bass: 1,
    lowMid: 0,
    highMid: 0,
    treble: 0,
    onset: 0,
    energy: 0.25,
  };
  const routing = {
    ...DEFAULT_DISCO_ROUTING,
    bass: { kind: 'muscle' as const, muscleId: design.muscles[0].id },
    lowMid: { kind: 'muscle' as const, muscleId: design.muscles[1].id },
    highMid: { kind: 'auto' as const },
    treble: { kind: 'auto' as const },
    onset: { kind: 'auto' as const },
  };
  const drives = bandsToActuators(
    bands,
    design.muscles.length,
    DEFAULT_DISCO_REACTIVITY,
    { muscles: design.muscles, design, routing },
  );
  assert(drives.length === design.muscles.length, 'drive count');
  assert(Math.abs(drives[0]) > 0.2, `bass routed to muscle 0: ${drives[0]}`);
  assert(Math.abs(drives[1]) < 0.05, `lowMid silent: ${drives[1]}`);
  console.log('disco band routing OK');
}

async function assertSpecialistFlightGoals(): Promise<void> {
  for (const id of ['flight_wing', 'flight_glider', 'flight_para'] as const) {
    assert(
      GOAL_CATALOG.some((g) => g.id === id),
      `${id} should be in goal catalog`,
    );
    assert(
      goalsForZone('flying').some((g) => g.id === id),
      `${id} should appear in flying zone`,
    );
  }

  const sim = new Simulation();
  await sim.init();
  sim.setEnvironment(flatGroundEnv('Flight Specialist Smoke'));
  sim.loadDesign(cloneDesign(SIMPLE_FLAPPER));
  for (let i = 0; i < 20; i++) sim.step(FIXED_DT);
  const wingCreature = sim.creature!;
  const wingMatch = aeroPresenceScale(wingCreature, 'wing');
  const chuteMatchOnWing = aeroPresenceScale(wingCreature, 'parachute');
  assert(wingMatch > chuteMatchOnWing, 'wing body should match wing > para');

  const landingBoost = emptyScoreRegionAccum();
  landingBoost.landingReward = 12;
  const withLand = scoreTaskPerformance(
    'flight_wing',
    wingCreature,
    0,
    false,
    0,
    3,
    2,
    1,
    2,
    landingBoost,
    undefined,
    0,
    2,
    1,
    0,
    0,
  );
  const noLand = scoreTaskPerformance(
    'flight_wing',
    wingCreature,
    0,
    false,
    0,
    3,
    2,
    1,
    2,
    emptyScoreRegionAccum(),
    undefined,
    0,
    2,
    1,
    0,
    0,
  );
  assert(
    withLand.fitness > noLand.fitness + 5,
    `landing mult should boost wing flight fitness (${withLand.fitness} vs ${noLand.fitness})`,
  );
  assert(Number.isFinite(withLand.fitness), 'wing flight fitness finite');

  sim.loadDesign(cloneDesign(SIMPLE_GLIDER));
  for (let i = 0; i < 20; i++) sim.step(FIXED_DT);
  const gliderFit = scoreTaskPerformance(
    'flight_glider',
    sim.creature!,
    0,
    false,
    0,
    2,
    3,
    1,
    1.5,
    emptyScoreRegionAccum(),
    undefined,
    0,
    3,
    5,
    0,
    4,
  );
  assert(Number.isFinite(gliderFit.fitness) && gliderFit.fitness > 0, 'glider scores');

  sim.loadDesign(cloneDesign(CHUTE_DROPPER));
  for (let i = 0; i < 20; i++) sim.step(FIXED_DT);
  const soft = scoreTaskPerformance(
    'flight_para',
    sim.creature!,
    0,
    false,
    0,
    4,
    3,
    1,
    1,
    emptyScoreRegionAccum(),
    undefined,
    0,
    3,
    0,
    2,
    0,
  );
  const hard = scoreTaskPerformance(
    'flight_para',
    sim.creature!,
    0,
    false,
    0,
    4,
    3,
    1,
    1,
    emptyScoreRegionAccum(),
    undefined,
    0,
    3,
    0,
    40,
    0,
  );
  assert(
    soft.fitness > hard.fitness,
    `soft landing should score above hard impact (${soft.fitness} vs ${hard.fitness})`,
  );

  console.log(
    `specialist flight OK wingMatch=${wingMatch.toFixed(2)} ` +
      `landBoost=${(withLand.fitness - noLand.fitness).toFixed(2)}`,
  );
}

async function main(): Promise<void> {
  assertCatalogAndZones();
  assertPackages();
  assertSecretGoals();
  assertEnvironmentPackages();
  await assertScoreRegions();
  await assertCourseMarkers();
  await assertClimbCourse();
  await assertRoughCourse();
  await assertStaticObstacles();
  await assertRampGrip();
  await assertTerrainHeightfield();
  await assertLaunchTower();
  await assertLaunchPad();
  await assertSpecialistFlightGoals();
  await assertJumpTaskScores();
  await assertRoughTaskScores();
  await assertMotorTorqueMoves();
  await assertAeroSlowsFall();
  assertWingPairValidation();
  await assertWingFlapClimb();
  await assertParachuteSlowsFall();
  await assertParachuteStreamsForward();
  await assertDiscoFloor();
  assertDiscoBandRouting();
  console.log('smoke-tasks OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
