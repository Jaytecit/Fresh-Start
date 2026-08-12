/**
 * Optional Rapier raycast whiskers for loco observation packs.
 */
import type { SpawnedCreature } from '../physics/spawn';
import { RAPIER } from '../physics/world';
import { isFeatureEnabled } from '../port/featureFlags';
import {
  OBS_COUNT,
  RAYCAST_ANGLES_RAD,
  RAYCAST_MAX_DIST,
  RAYCAST_OBS_COUNT,
  RAYCAST_ORIGIN_Y_BIAS,
  RAYCAST_RAY_COUNT,
} from './constants';
import {
  buildObservations,
  type ObservationContext,
} from './observations';

export {
  RAYCAST_ANGLES_RAD,
  RAYCAST_MAX_DIST,
  RAYCAST_OBS_COUNT,
  RAYCAST_RAY_COUNT,
};

/** Feature flag on and Train/UI toggle enabled. */
export function raycastObsEnabled(runtimeOn?: boolean): boolean {
  return isFeatureEnabled('raycastObservations') && !!runtimeOn;
}

/** Mean joint position — ray origin base. */
export function rayOrigin(creature: SpawnedCreature): { x: number; y: number } {
  const joints = creature.joints;
  if (joints.length === 0) return { x: 0, y: RAYCAST_ORIGIN_Y_BIAS };
  let sx = 0;
  let sy = 0;
  for (const j of joints) {
    const t = j.body.translation();
    sx += t.x;
    sy += t.y;
  }
  return {
    x: sx / joints.length,
    y: sy / joints.length + RAYCAST_ORIGIN_Y_BIAS,
  };
}

/** True when collider is static world geometry (ground / obstacles / terrain / tower). */
function isWorldCollider(col: RAPIER.Collider): boolean {
  const membership = col.collisionGroups() & 0xffff;
  return (membership & 0b0100) !== 0;
}

/**
 * Closest hit along a ray against world colliders.
 * Uses per-collider casts so results work before the first `world.step`
 * (query pipeline broadphase is otherwise stale right after spawn).
 */
export function castWorldRay(
  world: RAPIER.World,
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  maxToi = RAYCAST_MAX_DIST,
): number {
  const ray = new RAPIER.Ray(
    { x: originX, y: originY },
    { x: dirX, y: dirY },
  );
  let best = maxToi;
  world.forEachCollider((col) => {
    if (!isWorldCollider(col)) return;
    const toi = col.castRay(ray, maxToi, true);
    if (toi == null || !Number.isFinite(toi) || toi < 0) return;
    if (toi < best) best = toi;
  });
  return best;
}

/**
 * Cast fixed whiskers; write normalized hit distances into `out[offset..]`.
 * 0 = hit at origin, 1 = miss / max range. World geometry only.
 */
export function sampleRaycastHits(
  world: RAPIER.World,
  creature: SpawnedCreature,
  out: Float32Array,
  offset = OBS_COUNT,
): void {
  const origin = rayOrigin(creature);
  for (let i = 0; i < RAYCAST_RAY_COUNT; i++) {
    const angle = RAYCAST_ANGLES_RAD[i] ?? 0;
    const toi = castWorldRay(
      world,
      origin.x,
      origin.y,
      Math.cos(angle),
      Math.sin(angle),
      RAYCAST_MAX_DIST,
    );
    out[offset + i] =
      Math.min(RAYCAST_MAX_DIST, Math.max(0, toi)) / RAYCAST_MAX_DIST;
  }
}

/**
 * Base loco obs + ray whiskers. `world` required for casts; without it, rays = 1 (miss).
 */
export function buildRaycastObservations(
  creature: SpawnedCreature,
  world: RAPIER.World | null | undefined,
  out?: Float32Array,
  ctx?: ObservationContext,
): Float32Array {
  const obs =
    out && out.length >= RAYCAST_OBS_COUNT
      ? out
      : new Float32Array(RAYCAST_OBS_COUNT);
  buildObservations(creature, obs, ctx);
  if (world) {
    sampleRaycastHits(world, creature, obs, OBS_COUNT);
  } else {
    for (let i = 0; i < RAYCAST_RAY_COUNT; i++) obs[OBS_COUNT + i] = 1;
  }
  return obs;
}
