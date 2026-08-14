/**
 * Static obstacles from Environment Studio designs.
 * Cuboid compositions per `ObstacleKind`.
 */
import type { EnvObstacle, ObstacleKind } from '../env/types';
import {
  clampLaunchPadApex,
  GROUND_RESTITUTION,
  LAUNCH_PAD_APEX_H,
  LAUNCH_PAD_DEFAULT_H,
  LAUNCH_PAD_DEFAULT_W,
  OBSTACLE_DEFAULT_RAMP_ROT,
  OBSTACLE_LOOP_SEGMENTS,
  OBSTACLE_MAX_SIZE,
  OBSTACLE_MIN_SIZE,
  OBSTACLE_STAIR_STEPS,
  WORLD_GRIP,
} from './constants';
import { clampWorldGrip, groundCollisionGroups, RAPIER } from './world';

/** @deprecated Use clampWorldGrip */
export function clampRampFriction(friction: number): number {
  return clampWorldGrip(friction);
}

export interface ObstacleVisual {
  kind: ObstacleKind;
  x: number;
  y: number;
  hx: number;
  hy: number;
  rot: number;
  /** Pad only — approximate launch apex (ruler units). */
  launchApex?: number;
  /** Task-owned built-in course cuboid (not placed in Environment Studio). */
  taskCourse?: boolean;
}

export interface ObstacleHandle {
  bodies: RAPIER.RigidBody[];
  visuals: ObstacleVisual[];
}

function clampSize(v: number): number {
  if (!Number.isFinite(v)) return OBSTACLE_MIN_SIZE;
  return Math.min(OBSTACLE_MAX_SIZE, Math.max(OBSTACLE_MIN_SIZE, Math.abs(v)));
}

/** Rotate a local composition point around an authored origin. */
function rotateAround(
  px: number,
  py: number,
  ox: number,
  oy: number,
  rot: number,
): { x: number; y: number } {
  if (!rot) return { x: px, y: py };
  const dx = px - ox;
  const dy = py - oy;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return { x: ox + dx * c - dy * s, y: oy + dx * s + dy * c };
}

function addCuboid(
  world: RAPIER.World,
  handle: ObstacleHandle,
  kind: ObstacleKind,
  x: number,
  y: number,
  hx: number,
  hy: number,
  rot: number,
  friction: number,
): void {
  const safeHx = Math.max(OBSTACLE_MIN_SIZE / 2, hx);
  const safeHy = Math.max(OBSTACLE_MIN_SIZE / 2, hy);
  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 0;
  const safeRot = Number.isFinite(rot) ? rot : 0;
  const groups = groundCollisionGroups();
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(safeX, safeY)
      .setRotation(safeRot),
  );
  // Max combine so Train grip slider is the contact μ (not averaged down).
  const desc = RAPIER.ColliderDesc.cuboid(safeHx, safeHy)
    .setFriction(clampWorldGrip(friction))
    .setRestitution(GROUND_RESTITUTION)
    .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max)
    .setCollisionGroups(groups)
    .setSolverGroups(groups);
  world.createCollider(desc, body);
  handle.bodies.push(body);
  handle.visuals.push({
    kind,
    x: safeX,
    y: safeY,
    hx: safeHx,
    hy: safeHy,
    rot: safeRot,
  });
}

function spawnBox(
  world: RAPIER.World,
  handle: ObstacleHandle,
  o: EnvObstacle,
  grip: number,
): void {
  const w = clampSize(o.w);
  const h = clampSize(o.h);
  addCuboid(world, handle, 'box', o.x, o.y, w / 2, h / 2, o.rot ?? 0, grip);
}

function spawnRamp(
  world: RAPIER.World,
  handle: ObstacleHandle,
  o: EnvObstacle,
  grip: number,
): void {
  const w = clampSize(o.w);
  const h = clampSize(Math.min(o.h, o.w * 0.35));
  const rot = o.rot ?? OBSTACLE_DEFAULT_RAMP_ROT;
  addCuboid(world, handle, 'ramp', o.x, o.y, w / 2, h / 2, rot, grip);
}

function spawnStair(
  world: RAPIER.World,
  handle: ObstacleHandle,
  o: EnvObstacle,
  grip: number,
): void {
  const w = clampSize(o.w);
  const h = clampSize(o.h);
  const n = OBSTACLE_STAIR_STEPS;
  const stepW = w / n;
  const ox = o.x + w / 2;
  const oy = o.y + h / 2;
  const baseRot = o.rot ?? 0;
  const ascendRight = (o.ascend ?? 'right') !== 'left';
  for (let i = 0; i < n; i++) {
    const top = ((i + 1) / n) * h;
    const hy = top / 2;
    const hx = stepW / 2;
    const col = ascendRight ? i : n - 1 - i;
    const cx = o.x + (col + 0.5) * stepW;
    const cy = o.y + hy;
    const p = rotateAround(cx, cy, ox, oy, baseRot);
    addCuboid(world, handle, 'stair', p.x, p.y, hx, hy, baseRot, grip);
  }
}

function spawnPit(
  world: RAPIER.World,
  handle: ObstacleHandle,
  o: EnvObstacle,
  grip: number,
): void {
  const gap = clampSize(o.w);
  const wallH = clampSize(o.h);
  const platformW = Math.max(10, gap);
  const hy = wallH / 2;
  const hx = platformW / 2;
  const cy = o.y + hy;
  const ox = o.x;
  const oy = cy;
  const baseRot = o.rot ?? 0;
  for (const cx of [o.x - gap / 2 - hx, o.x + gap / 2 + hx]) {
    const p = rotateAround(cx, cy, ox, oy, baseRot);
    addCuboid(world, handle, 'pit', p.x, p.y, hx, hy, baseRot, grip);
  }
}

function spawnLoop(
  world: RAPIER.World,
  handle: ObstacleHandle,
  o: EnvObstacle,
  grip: number,
): void {
  const radius = clampSize(Math.max(o.w, o.h)) / 2;
  const segments = OBSTACLE_LOOP_SEGMENTS;
  const thickness = Math.max(OBSTACLE_MIN_SIZE, radius * 0.12);
  const arc = (2 * Math.PI) / segments;
  const slabLen = radius * arc * 1.05;
  const baseRot = o.rot ?? 0;
  for (let i = 0; i < segments; i++) {
    const angle = -Math.PI / 2 + arc * (i + 0.5);
    // Open gap near the bottom so creatures can enter.
    if (Math.sin(angle) < -0.55) continue;
    const cx = o.x + radius * Math.cos(angle);
    const cy = o.y + radius * Math.sin(angle);
    const p = rotateAround(cx, cy, o.x, o.y, baseRot);
    const rot = angle + Math.PI / 2 + baseRot;
    addCuboid(
      world,
      handle,
      'loop',
      p.x,
      p.y,
      slabLen / 2,
      thickness / 2,
      rot,
      grip,
    );
  }
}

function spawnPad(
  world: RAPIER.World,
  handle: ObstacleHandle,
  o: EnvObstacle,
  grip: number,
): void {
  const w = clampSize(o.w);
  const h = clampSize(Math.min(o.h, o.w * 0.45));
  addCuboid(world, handle, 'pad', o.x, o.y, w / 2, h / 2, o.rot ?? 0, grip);
  const vis = handle.visuals[handle.visuals.length - 1];
  if (vis) vis.launchApex = clampLaunchPadApex(o.launchApex);
}

export function spawnStaticObstacles(
  world: RAPIER.World,
  obstacles: readonly EnvObstacle[],
  worldGrip: number = WORLD_GRIP,
): ObstacleHandle {
  const handle: ObstacleHandle = { bodies: [], visuals: [] };
  const grip = clampWorldGrip(worldGrip);
  for (const o of obstacles) {
    switch (o.kind) {
      case 'box':
        spawnBox(world, handle, o, grip);
        break;
      case 'ramp':
        spawnRamp(world, handle, o, grip);
        break;
      case 'stair':
        spawnStair(world, handle, o, grip);
        break;
      case 'pit':
        spawnPit(world, handle, o, grip);
        break;
      case 'loop':
        spawnLoop(world, handle, o, grip);
        break;
      case 'pad':
        spawnPad(world, handle, o, grip);
        break;
      default:
        break;
    }
  }
  return handle;
}

/** Live-update all env obstacle colliders to the universal grip. */
export function applyWorldGripToObstacles(
  handle: ObstacleHandle | null,
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

/** @deprecated Use applyWorldGripToObstacles */
export const applyRampFriction = applyWorldGripToObstacles;

export function destroyObstacles(
  world: RAPIER.World,
  handle: ObstacleHandle | null,
): void {
  if (!handle) return;
  for (const b of handle.bodies) {
    world.removeRigidBody(b);
  }
  handle.bodies.length = 0;
  handle.visuals.length = 0;
}

let obstacleIdSeq = 0;

export function defaultObstacle(kind: ObstacleKind): EnvObstacle {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `obs_${Date.now().toString(36)}_${(obstacleIdSeq++).toString(36)}`;
  switch (kind) {
    case 'box':
      return { id, kind, x: 15, y: 2.5, w: 10, h: 5 };
    case 'ramp':
      return {
        id,
        kind,
        x: 25,
        y: 2.25,
        w: 17.5,
        h: 1.4,
        rot: OBSTACLE_DEFAULT_RAMP_ROT,
      };
    case 'stair':
      return { id, kind, x: 10, y: 0, w: 30, h: 10, ascend: 'right' };
    case 'pit':
      return { id, kind, x: 30, y: 0, w: 11, h: 7 };
    case 'loop':
      return { id, kind, x: 50, y: 11, w: 18, h: 18 };
    case 'pad':
      return {
        id,
        kind,
        x: 20,
        y: LAUNCH_PAD_DEFAULT_H / 2,
        w: LAUNCH_PAD_DEFAULT_W,
        h: LAUNCH_PAD_DEFAULT_H,
        launchApex: LAUNCH_PAD_APEX_H,
      };
    default:
      return { id, kind: 'box', x: 15, y: 2.5, w: 10, h: 5 };
  }
}
