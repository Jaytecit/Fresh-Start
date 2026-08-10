/**
 * Planted surface purchase — ball-foot grip assist on ground / obstacles.
 * Fresh Start product damping (not parent plant-grip / X-lock).
 * Used in Idle and during Evolve/brain so scoot cannot ice-skate for distance.
 *
 * Strength scales with the Train-dock Anti-scoot slider (universal):
 * - Anti-roll on any planted surface (balls otherwise roll under Coulomb μ)
 * - Low-speed bidirectional stance stick (|along| < STANCE_STICK_SPEED) so
 *   muscle-driven micro-skid dies and feet stay planted for push-off
 * - Above the stick band, adverse along-surface damp only:
 *   tilted → downhill only (uphill / forward up the slab preserved)
 *   flat → world-left (−X) only (fast +X forward preserved)
 * - Ramp proximity fallback when thin slabs miss Rapier contact pairs
 */
import type { EnvTerrain, ObstacleKind } from '../env/types';
import { sampleTerrainHeight } from '../env/terrainMath';
import {
  ANTI_SCOOT,
  ANTI_SCOOT_MAX,
  GRAVITY_Y,
  PLANT_SLIDE_Y,
  STANCE_STICK_SPEED,
  SURFACE_ANTI_ROLL,
  SURFACE_STANCE_STICK,
  SURFACE_TANGENT_BRAKE,
} from './constants';
import type { ObstacleHandle, ObstacleVisual } from './obstacles';
import type { SpawnedCreature } from './spawn';
import { RAPIER } from './world';

type GripBody = {
  angvel: () => number;
  setAngvel: (w: number, wake: boolean) => void;
  linvel: () => { x: number; y: number };
  setLinvel: (v: { x: number; y: number }, wake: boolean) => void;
};

export function clampAntiScoot(value: number): number {
  if (!Number.isFinite(value)) return ANTI_SCOOT;
  return Math.min(ANTI_SCOOT_MAX, Math.max(0, value));
}

/**
 * Ball-foot purchase on a surface.
 * Stance stick (low speed) + adverse damp (high speed) + anti-roll.
 * Same rule on ground / ramps / objects.
 */
function applySurfacePurchase(
  body: GripBody,
  antiScoot: number,
  surfaceRot: number,
): void {
  const purchaseScale = Math.max(0, antiScoot / ANTI_SCOOT);
  if (purchaseScale <= 0) return;

  if (SURFACE_ANTI_ROLL > 0) {
    const keepW =
      1 -
      Math.min(1, Math.max(0, SURFACE_ANTI_ROLL * purchaseScale));
    const w = body.angvel();
    if (Math.abs(w) >= 1e-6) body.setAngvel(w * keepW, true);
  }

  if (SURFACE_TANGENT_BRAKE <= 0 && SURFACE_STANCE_STICK <= 0) return;

  const tx = Math.cos(surfaceRot);
  const ty = Math.sin(surfaceRot);
  const v = body.linvel();
  const along = v.x * tx + v.y * ty;
  if (Math.abs(along) < 1e-6) return;

  // Low-speed band: kill both directions so stance push transfers to the body
  // instead of feet jittering (+X preserved / −X scrubbed) under muscle load.
  if (
    SURFACE_STANCE_STICK > 0 &&
    Math.abs(along) < STANCE_STICK_SPEED
  ) {
    const keepT =
      1 -
      Math.min(1, Math.max(0, SURFACE_STANCE_STICK * purchaseScale));
    const along2 = along * keepT;
    const d = along2 - along;
    body.setLinvel({ x: v.x + d * tx, y: v.y + d * ty }, true);
    return;
  }

  if (SURFACE_TANGENT_BRAKE <= 0) return;

  const tilted = Math.abs(ty) > 0.08;
  // Tilted: gravity's along-slab sign (downhill). Flat: along-surface that
  // points world-left (−X) so fast forward (+X) is not braked.
  const adverseSign = tilted
    ? Math.sign(GRAVITY_Y * ty) || -1
    : tx >= 0
      ? -1
      : 1;

  const keepT =
    1 -
    Math.min(1, Math.max(0, SURFACE_TANGENT_BRAKE * purchaseScale));
  if (along * adverseSign > 0) {
    const along2 = along * keepT;
    const d = along2 - along;
    body.setLinvel({ x: v.x + d * tx, y: v.y + d * ty }, true);
  }
}

type ObsInfo = { kind: ObstacleKind; rot: number };

function obstacleInfoByHandle(
  obstacles: ObstacleHandle | null,
): Map<number, ObsInfo> {
  const map = new Map<number, ObsInfo>();
  if (!obstacles) return map;
  for (let i = 0; i < obstacles.bodies.length; i++) {
    const v = obstacles.visuals[i];
    if (!v) continue;
    map.set(obstacles.bodies[i]!.handle, { kind: v.kind, rot: v.rot });
  }
  return map;
}

type ObstacleTouch = {
  any: boolean;
  ramp: boolean;
  surfaceRot: number;
};

function touchingWorldSurface(
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  infoByHandle: Map<number, ObsInfo>,
): ObstacleTouch {
  const out: ObstacleTouch = { any: false, ramp: false, surfaceRot: 0 };
  for (let i = 0; i < body.numColliders(); i++) {
    world.contactPairsWith(body.collider(i), (other) => {
      if (other.shapeType() === RAPIER.ShapeType.HalfSpace) {
        out.any = true;
        if (!out.ramp) out.surfaceRot = 0;
        return;
      }
      const parent = other.parent();
      if (!parent) return;
      const info = infoByHandle.get(parent.handle);
      if (!info) return;
      out.any = true;
      if (info.kind === 'ramp') {
        out.ramp = true;
        out.surfaceRot = info.rot;
      } else if (!out.ramp) {
        // Flat/elevated non-ramp obstacle — use its authored rotation.
        out.surfaceRot = info.rot;
      }
    });
  }
  return out;
}

function clearanceToRampTop(
  px: number,
  py: number,
  v: ObstacleVisual,
): number | null {
  const c = Math.cos(v.rot);
  const s = Math.sin(v.rot);
  const dx = px - v.x;
  const dy = py - v.y;
  const localX = dx * c + dy * s;
  const localY = -dx * s + dy * c;
  if (Math.abs(localX) > v.hx + 0.05) return null;
  return localY - v.hy;
}

function nearRampPurchase(
  px: number,
  py: number,
  obstacles: ObstacleHandle | null,
  clearance: number,
): ObstacleTouch | null {
  if (!obstacles) return null;
  let best: ObstacleTouch | null = null;
  let bestClear = Infinity;
  for (let i = 0; i < obstacles.visuals.length; i++) {
    const v = obstacles.visuals[i];
    if (!v || v.kind !== 'ramp') continue;
    const clear = clearanceToRampTop(px, py, v);
    if (clear == null || clear < -0.05 || clear >= clearance) continue;
    if (clear >= bestClear) continue;
    bestClear = clear;
    best = { any: true, ramp: true, surfaceRot: v.rot };
  }
  return best;
}

function resolveSurfaceTouch(
  world: RAPIER.World | null | undefined,
  body: RAPIER.RigidBody,
  infoByHandle: Map<number, ObsInfo>,
  obstacles: ObstacleHandle | null | undefined,
  clearance: number,
): ObstacleTouch {
  const touch = world
    ? touchingWorldSurface(world, body, infoByHandle)
    : { any: false, ramp: false, surfaceRot: 0 };
  if (touch.ramp) return touch;
  const t = body.translation();
  const near = nearRampPurchase(t.x, t.y, obstacles ?? null, clearance);
  if (near) return near;
  return touch;
}

/**
 * Apply anti-scoot-scaled purchase after world.step.
 * `antiScoot` is the Train-dock slider (defaults to ANTI_SCOOT).
 */
export function applyPlantSlideBrake(
  creature: SpawnedCreature,
  terrain?: EnvTerrain | null,
  world?: RAPIER.World | null,
  obstacles?: ObstacleHandle | null,
  antiScoot: number = ANTI_SCOOT,
): void {
  const scale = clampAntiScoot(antiScoot);
  if (
    scale <= 0 ||
    (SURFACE_ANTI_ROLL <= 0 &&
      SURFACE_TANGENT_BRAKE <= 0 &&
      SURFACE_STANCE_STICK <= 0)
  ) {
    return;
  }

  const infoByHandle =
    world && obstacles ? obstacleInfoByHandle(obstacles) : new Map();

  const marked = creature.joints.filter((j) => j.isFoot && !j.isWheel);
  const footTargets =
    marked.length > 0
      ? marked
      : creature.joints.filter((j) => !j.isWheel);

  for (const j of footTargets) {
    const t = j.body.translation();
    const onTerrain =
      terrain != null &&
      t.y - sampleTerrainHeight(terrain, t.x) < PLANT_SLIDE_Y;
    const touch = resolveSurfaceTouch(
      world,
      j.body,
      infoByHandle,
      obstacles,
      PLANT_SLIDE_Y,
    );
    if (touch.ramp) {
      applySurfacePurchase(j.body, scale, touch.surfaceRot);
      continue;
    }
    if (!onTerrain && !touch.any) continue;
    applySurfacePurchase(
      j.body,
      scale,
      touch.any ? touch.surfaceRot : 0,
    );
  }
}

/** @deprecated Use applyPlantSlideBrake */
export const applyIdlePlantBrake = applyPlantSlideBrake;
