/**
 * Minimal climb course (E6.3) — static steps. Not full Environment Studio.
 * Authored world obstacles live in obstacles.ts (G1 / C2.1).
 * E6.8 rough course reuses G3 heightfield spawn.
 */
import type { EnvTerrain } from '../env/types';
import { makeSineTerrain } from '../env/terrainMath';
import {
  GROUND_RESTITUTION,
  ROUGH_COURSE_AMPLITUDE,
  ROUGH_COURSE_END_X,
  ROUGH_COURSE_SAMPLES,
  ROUGH_COURSE_START_X,
  ROUGH_COURSE_WAVES,
  WORLD_GRIP,
} from './constants';
import {
  destroyTerrain,
  spawnTerrainHeightfield,
  type TerrainHandle,
} from './terrain';
import { clampWorldGrip, groundCollisionGroups, RAPIER } from './world';

export interface CourseHandle {
  bodies: RAPIER.RigidBody[];
}

export interface RoughCourseHandle {
  terrain: TerrainHandle;
  design: EnvTerrain;
}

function spawnFixedCuboids(
  world: RAPIER.World,
  worldGrip: number,
  parts: { x: number; y: number; hx: number; hy: number; rot?: number }[],
): CourseHandle {
  const bodies: RAPIER.RigidBody[] = [];
  const groups = groundCollisionGroups();
  const grip = clampWorldGrip(worldGrip);
  for (const s of parts) {
    const desc = RAPIER.RigidBodyDesc.fixed().setTranslation(s.x, s.y);
    if (s.rot != null) desc.setRotation(s.rot);
    const body = world.createRigidBody(desc);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(s.hx, s.hy)
        .setFriction(grip)
        .setRestitution(GROUND_RESTITUTION)
        .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max)
        .setCollisionGroups(groups)
        .setSolverGroups(groups),
      body,
    );
    bodies.push(body);
  }
  return { bodies };
}

export function spawnClimbCourse(
  world: RAPIER.World,
  worldGrip: number = WORLD_GRIP,
): CourseHandle {
  return spawnFixedCuboids(world, worldGrip, [
    { x: 2.5, y: 0.35, hx: 1.2, hy: 0.35 },
    { x: 4.5, y: 0.85, hx: 1.2, hy: 0.35 },
    { x: 6.5, y: 1.35, hx: 1.2, hy: 0.35 },
    { x: 8.5, y: 1.85, hx: 1.2, hy: 0.35 },
  ]);
}

/** Motor Ramp Jump — inclined slab then a short landing deck. */
export function spawnMotorRampCourse(
  world: RAPIER.World,
  worldGrip: number = WORLD_GRIP,
): CourseHandle {
  return spawnFixedCuboids(world, worldGrip, [
    { x: 4.5, y: 0.55, hx: 2.2, hy: 0.16, rot: 0.35 },
    { x: 8.2, y: 1.35, hx: 1.4, hy: 0.16 },
  ]);
}

/** Motor Gap Cross — pit flanked by approach / landing slabs. */
export function spawnMotorGapCourse(
  world: RAPIER.World,
  worldGrip: number = WORLD_GRIP,
): CourseHandle {
  return spawnFixedCuboids(world, worldGrip, [
    { x: 3.2, y: 0.2, hx: 1.6, hy: 0.2 },
    { x: 8.8, y: 0.2, hx: 1.6, hy: 0.2 },
  ]);
}

/** Motor Hurdles — low boxes in sequence. */
export function spawnMotorHurdlesCourse(
  world: RAPIER.World,
  worldGrip: number = WORLD_GRIP,
): CourseHandle {
  return spawnFixedCuboids(world, worldGrip, [
    { x: 3.5, y: 0.22, hx: 0.35, hy: 0.22 },
    { x: 5.5, y: 0.28, hx: 0.35, hy: 0.28 },
    { x: 7.5, y: 0.22, hx: 0.35, hy: 0.22 },
    { x: 9.5, y: 0.3, hx: 0.35, hy: 0.3 },
  ]);
}

/** Clear-the-Bar visual — thin high bar (scoring uses peak height). */
export function spawnClearBarCourse(
  world: RAPIER.World,
  worldGrip: number = WORLD_GRIP,
  barY = 2,
): CourseHandle {
  return spawnFixedCuboids(world, worldGrip, [
    { x: 3.5, y: barY, hx: 1.2, hy: 0.06 },
  ]);
}

export function applyWorldGripToCourse(
  handle: CourseHandle | null,
  friction: number,
): void {
  if (!handle) return;
  const grip = clampWorldGrip(friction);
  for (const body of handle.bodies) {
    for (let ci = 0; ci < body.numColliders(); ci++) {
      const col = body.collider(ci);
      col.setFriction(grip);
      col.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max);
    }
  }
}

export function destroyCourse(world: RAPIER.World, course: CourseHandle | null): void {
  if (!course) return;
  for (const b of course.bodies) {
    world.removeRigidBody(b);
  }
  course.bodies.length = 0;
}

/** Deterministic sine hills for the Rough goal (E6.8). */
export function makeRoughCourseTerrain(): EnvTerrain {
  return makeSineTerrain({
    startX: ROUGH_COURSE_START_X,
    endX: ROUGH_COURSE_END_X,
    sampleCount: ROUGH_COURSE_SAMPLES,
    amplitude: ROUGH_COURSE_AMPLITUDE,
    waves: ROUGH_COURSE_WAVES,
  });
}

export function spawnRoughCourse(
  world: RAPIER.World,
  worldGrip: number = WORLD_GRIP,
): RoughCourseHandle | null {
  const design = makeRoughCourseTerrain();
  const terrain = spawnTerrainHeightfield(world, design, worldGrip);
  if (!terrain) return null;
  return { terrain, design };
}

export function destroyRoughCourse(
  world: RAPIER.World,
  handle: RoughCourseHandle | null,
): void {
  if (!handle) return;
  destroyTerrain(world, handle.terrain);
}
