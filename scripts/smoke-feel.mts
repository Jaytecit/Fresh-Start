/**
 * Headless feel gate: braced triangle settles without pancaking;
 * hopper muscle contract shortens / expand lengthens;
 * Idle anti-scoot cuts leftward (−X) plant slip but keeps fast +X forward;
 * low-speed stance stick kills planted micro-skid both ways.
 * Run: npx tsx scripts/smoke-feel.mts
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRIANGLE_WALKER, SIMPLE_HOPPER, FLOPPY_CHAIN } from '../src/creature/presets.ts';
import { cloneDesign } from '../src/creature/types.ts';
import { importCreatureJson } from '../src/library/jsonIO.ts';
import {
  ANTI_SCOOT,
  FIXED_DT,
  STANCE_STICK_SPEED,
} from '../src/physics/constants.ts';
import { applyPlantSlideBrake } from '../src/physics/plantSlideBrake.ts';
import { Simulation } from '../src/sim/simulation.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
/** After leftward plant-brake pulses, −X must be mostly gone. */
const MAX_BACK_VX = 0.5;
/** Fast forward shove must stay intact across a plant-brake pulse (no +X damp). */
const MIN_FWD_KEEP = 0.99;
/** Micro-skid inside the stance stick band must drop after a plant pulse. */
const MICRO_SLIP = 0.2;
const MAX_STANCE_VX = MICRO_SLIP * 0.35;

function muscleLength(sim: Simulation, index: number): number {
  const m = sim.muscles()[index];
  const a = m.startBone.translation();
  const b = m.endBone.translation();
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function avgJointY(sim: Simulation): number {
  const joints = sim.creature?.joints ?? [];
  if (joints.length === 0) return 0;
  let sum = 0;
  for (const j of joints) sum += j.body.translation().y;
  return sum / joints.length;
}

function minJointY(sim: Simulation): number {
  const joints = sim.creature?.joints ?? [];
  let min = Infinity;
  for (const j of joints) min = Math.min(min, j.body.translation().y);
  return min;
}

async function main() {
  const sim = new Simulation();
  await sim.init();

  // 1) Braced triangle settles onto ground but keeps a torso above feet
  sim.loadDesign(cloneDesign(TRIANGLE_WALKER));
  sim.driveMode = 'idle';
  for (let i = 0; i < 180; i++) sim.step(1 / 60);
  const triMin = minJointY(sim);
  const triAvg = avgJointY(sim);
  console.log(`triangle settle minY=${triMin.toFixed(3)} avgY=${triAvg.toFixed(3)}`);
  if (triAvg < 0.55) {
    throw new Error(`Braced triangle pancaked (avgY=${triAvg.toFixed(3)})`);
  }
  if (triMin < -0.05) {
    throw new Error(`Joints fell through floor (minY=${triMin.toFixed(3)})`);
  }

  // 2) Hopper: contract shortens actuated muscle (quad has DOF; triangle does not)
  sim.loadDesign(cloneDesign(SIMPLE_HOPPER));
  sim.driveMode = 'manual';
  sim.setAllManual(0);
  for (let i = 0; i < 90; i++) sim.step(1 / 60);
  const restLen = muscleLength(sim, 0);
  sim.setManualDrive(0, 1);
  for (let i = 0; i < 120; i++) sim.step(1 / 60);
  const contracted = muscleLength(sim, 0);
  console.log(`hopper M0 rest=${restLen.toFixed(3)} contracted=${contracted.toFixed(3)}`);
  if (contracted >= restLen * 0.92) {
    throw new Error(
      `Contract did not shorten muscle enough (${contracted.toFixed(3)} vs ${restLen.toFixed(3)})`,
    );
  }

  // 3) Expand lengthens vs contracted
  sim.setManualDrive(0, -1);
  for (let i = 0; i < 120; i++) sim.step(1 / 60);
  const expanded = muscleLength(sim, 0);
  console.log(`hopper M0 expanded=${expanded.toFixed(3)}`);
  if (expanded <= contracted * 1.05) {
    throw new Error('Expand did not lengthen muscle vs contracted state');
  }

  // 4) Floppy chain collapses flatter than triangle
  sim.loadDesign(cloneDesign(FLOPPY_CHAIN));
  sim.driveMode = 'idle';
  for (let i = 0; i < 180; i++) sim.step(1 / 60);
  const flopAvg = avgJointY(sim);
  console.log(`floppy settle avgY=${flopAvg.toFixed(3)}`);
  if (flopAvg >= triAvg) {
    console.warn('Note: floppy avgY was not below triangle (geometry-dependent)');
  }

  // 5) Anti-scoot: planted feet lose −X scoot; +X forward is kept
  const raw = readFileSync(join(HERE, 'fixtures', 'custom-biped.json'), 'utf8');
  const custom = importCreatureJson(raw);
  if (!custom.ok) throw new Error(`custom biped fixture: ${custom.error}`);
  sim.loadDesign(cloneDesign(custom.value));
  sim.driveMode = 'idle';
  for (let i = 0; i < Math.round(1 / FIXED_DT); i++) sim.step(FIXED_DT);
  const creature = sim.creature!;
  const feet = creature.joints.filter((j) => j.isFoot && !j.isWheel);
  const targets = feet.length > 0 ? feet : creature.joints;
  for (const j of targets) j.body.setLinvel({ x: -2.5, y: 0 }, true);
  for (let i = 0; i < 12; i++) {
    applyPlantSlideBrake(creature, null, sim.world, null, ANTI_SCOOT);
  }
  const backVx =
    targets.reduce((s, j) => s + j.body.linvel().x, 0) / targets.length;
  console.log(`idle anti-scoot back vx=${backVx.toFixed(3)} (max ${MAX_BACK_VX})`);
  if (backVx < -MAX_BACK_VX) {
    throw new Error(
      `Anti-scoot failed to cut −X (vx=${backVx.toFixed(3)} < -${MAX_BACK_VX})`,
    );
  }
  for (const j of targets) j.body.setLinvel({ x: 2.5, y: 0 }, true);
  applyPlantSlideBrake(creature, null, sim.world, null, ANTI_SCOOT);
  const fwdVx =
    targets.reduce((s, j) => s + j.body.linvel().x, 0) / targets.length;
  console.log(
    `idle anti-scoot fwd vx=${fwdVx.toFixed(3)} (min ${(2.5 * MIN_FWD_KEEP).toFixed(3)})`,
  );
  if (fwdVx < 2.5 * MIN_FWD_KEEP) {
    throw new Error(
      `Anti-scoot should preserve +X (vx=${fwdVx.toFixed(3)} < ${(2.5 * MIN_FWD_KEEP).toFixed(3)})`,
    );
  }

  // 6) Stance stick: planted micro-slip (±) is scrubbed; stays below stick band.
  if (!(MICRO_SLIP < STANCE_STICK_SPEED)) {
    throw new Error('MICRO_SLIP must sit inside STANCE_STICK_SPEED');
  }
  for (const sign of [1, -1] as const) {
    for (const j of targets) j.body.setLinvel({ x: sign * MICRO_SLIP, y: 0 }, true);
    for (let i = 0; i < 8; i++) {
      applyPlantSlideBrake(creature, null, sim.world, null, ANTI_SCOOT);
    }
    const microVx =
      targets.reduce((s, j) => s + j.body.linvel().x, 0) / targets.length;
    console.log(
      `stance stick ${sign > 0 ? '+' : '-'}X vx=${microVx.toFixed(3)} (max |vx| ${MAX_STANCE_VX})`,
    );
    if (Math.abs(microVx) > MAX_STANCE_VX) {
      throw new Error(
        `Stance stick failed to cut micro-slip (vx=${microVx.toFixed(3)}, sign=${sign})`,
      );
    }
  }

  console.log('smoke-feel OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
