import RAPIER from '@dimforge/rapier2d-compat';
import {
  BODY_FRICTION,
  BODY_RESTITUTION,
  GRAVITY_Y,
  GROUND_RESTITUTION,
  GROUND_Y,
  WORLD_GRIP,
  WORLD_GRIP_MAX,
} from './constants';

let initPromise: Promise<void> | null = null;

export function initRapier(): Promise<void> {
  if (!initPromise) {
    initPromise = RAPIER.init();
  }
  return initPromise;
}

export function clampWorldGrip(friction: number): number {
  if (!Number.isFinite(friction)) return WORLD_GRIP;
  return Math.min(WORLD_GRIP_MAX, Math.max(0, friction));
}

export function createWorld(grip: number = WORLD_GRIP): RAPIER.World {
  const world = new RAPIER.World({ x: 0, y: GRAVITY_Y });
  addGround(world, grip);
  return world;
}

/**
 * Membership bit 2 = ground / static world geometry.
 * Creature joints/bones filter for this bit (see spawn.ts).
 */
export function groundCollisionGroups(): number {
  return (0b0100 & 0xffff) | ((0xffff & 0xffff) << 16);
}

/**
 * Query groups for world-only raycasts: membership joint-bit, filter ground-bit.
 * Matches joint↔world pairing so casts hit static geometry and miss creature parts.
 */
export function worldQueryCollisionGroups(): number {
  return (0b0001 & 0xffff) | ((0b0100 & 0xffff) << 16);
}

function addGround(world: RAPIER.World, grip: number): void {
  // Infinite floor: halfspace solid is below the plane; outward normal points up.
  const groundBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, GROUND_Y),
  );
  const groups = groundCollisionGroups();
  const mu = clampWorldGrip(grip);
  world.createCollider(
    RAPIER.ColliderDesc.halfspace({ x: 0, y: 1 })
      .setFriction(mu)
      .setRestitution(GROUND_RESTITUTION)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max)
      .setCollisionGroups(groups)
      .setSolverGroups(groups),
    groundBody,
  );
}

/** Live-update infinite-ground halfspace friction (Max combine). */
export function applyGroundFriction(
  world: RAPIER.World | null,
  friction: number,
): void {
  if (!world) return;
  const grip = clampWorldGrip(friction);
  world.forEachCollider((col) => {
    if (col.shapeType() !== RAPIER.ShapeType.HalfSpace) return;
    col.setFriction(grip);
    col.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max);
  });
}

export function defaultColliderDesc(
  desc: RAPIER.ColliderDesc,
): RAPIER.ColliderDesc {
  return desc.setFriction(BODY_FRICTION).setRestitution(BODY_RESTITUTION);
}

export { RAPIER };
