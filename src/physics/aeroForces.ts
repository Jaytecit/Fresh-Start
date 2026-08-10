/**
 * Aero forces (E6.6 / G10) — Fresh Start coefficients only.
 * Legacy area-only lift/drag when structural parts flag is off or type omitted.
 */
import {
  AERO_DRAG_COEFF,
  AERO_LIFT_COEFF,
  AERO_SPEED_FORCE_CAP,
  FIXED_DT,
  GLIDER_DRAG_COEFF,
  GLIDER_LIFT_COEFF,
  PARA_DEFLATE_RATE,
  PARA_DRAG_COEFF,
  PARA_INFLATE_RATE,
  PARA_STREAM_DRAG_SCALE,
  WING_FLAP_LIFT_COEFF,
  WING_PADDLE_DRAG_COEFF,
} from './constants';
import type { RuntimeBone, SpawnedCreature } from './spawn';
import { isFeatureEnabled } from '../port/featureFlags';

/** Bone local +Y → world axis from Rapier 2D rotation. */
function boneAxis(bone: RuntimeBone): { x: number; y: number } {
  const θ = bone.body.rotation();
  return { x: -Math.sin(θ), y: Math.cos(θ) };
}

function boneNormal(axis: { x: number; y: number }): { x: number; y: number } {
  return { x: -axis.y, y: axis.x };
}

/** Scale linvel down for force math so launch-pad ballistics cannot NaN the world. */
function cappedLinvel(bone: RuntimeBone): { x: number; y: number } {
  const v = bone.body.linvel();
  const x = Number.isFinite(v.x) ? v.x : 0;
  const y = Number.isFinite(v.y) ? v.y : 0;
  const speed = Math.hypot(x, y);
  if (speed <= AERO_SPEED_FORCE_CAP || speed < 1e-12) return { x, y };
  const s = AERO_SPEED_FORCE_CAP / speed;
  return { x: x * s, y: y * s };
}

function applyLegacyAero(bone: RuntimeBone, area: number): void {
  const v = cappedLinvel(bone);
  const speed = Math.hypot(v.x, v.y);
  if (speed < 1e-4) return;
  const nx = v.x / speed;
  const ny = v.y / speed;
  const drag = AERO_DRAG_COEFF * area * speed * speed;
  const lx = -ny;
  const ly = nx;
  const liftSign = ly >= 0 ? 1 : -1;
  const lift = AERO_LIFT_COEFF * area * speed * speed * liftSign;
  bone.body.wakeUp();
  bone.body.addForce(
    {
      x: -drag * nx + lift * lx,
      y: -drag * ny + lift * ly,
    },
    true,
  );
}

/**
 * Wing: downstroke produces world-up lift; upstroke is feathered (no lift).
 * Light normal drag both ways for air feel without canceling the stroke.
 */
function applyWing(bone: RuntimeBone, area: number): void {
  const v = cappedLinvel(bone);
  const axis = boneAxis(bone);
  const n = boneNormal(axis);
  const vn = v.x * n.x + v.y * n.y;
  const drag = WING_PADDLE_DRAG_COEFF * area * vn * Math.abs(vn);
  let fx = -drag * n.x;
  let fy = -drag * n.y;
  // Descending wing → upward lift (flap authority).
  if (v.y < 0) {
    const lift = WING_FLAP_LIFT_COEFF * area * v.y * v.y;
    fy += lift;
  }
  bone.body.wakeUp();
  bone.body.addForce({ x: fx, y: fy }, true);
}

/** Glider: rigid sail — lift from forward speed × AoA (pitch). */
function applyGlider(bone: RuntimeBone, area: number): void {
  const v = cappedLinvel(bone);
  const speed = Math.hypot(v.x, v.y);
  if (speed < 1e-4) return;
  const vx = v.x / speed;
  const vy = v.y / speed;
  const axis = boneAxis(bone);
  const n = boneNormal(axis);
  const along = vx * axis.x + vy * axis.y;
  const perp = vx * n.x + vy * n.y;
  const aoa = Math.atan2(perp, along);
  const q = area * speed * speed;
  const liftMag = GLIDER_LIFT_COEFF * q * Math.sin(2 * aoa);
  const dragMag = GLIDER_DRAG_COEFF * q * (0.18 + Math.sin(aoa) * Math.sin(aoa));
  // Lift perpendicular to velocity; sign from AoA so nose-up vs flow lifts +world-Y when possible.
  let lx = -vy;
  let ly = vx;
  if (ly < 0) {
    lx = -lx;
    ly = -ly;
  }
  const liftSign = Math.sin(aoa) >= 0 ? 1 : -1;
  bone.body.wakeUp();
  bone.body.addForce(
    {
      x: -dragMag * vx + liftMag * liftSign * lx,
      y: -dragMag * vy + liftMag * liftSign * ly,
    },
    true,
  );
}

/**
 * Parachute: inflate when falling into a cupped canopy; massive drag when open.
 * Pure / mostly horizontal motion → deflate (stream) so gait forward speed survives.
 */
function applyParachute(bone: RuntimeBone, area: number): void {
  const v = cappedLinvel(bone);
  const speed = Math.hypot(v.x, v.y);
  const axis = boneAxis(bone);
  const n = boneNormal(axis);
  let target = 0;
  if (speed >= 1e-4) {
    const vx = v.x / speed;
    const vy = v.y / speed;
    // Face-on to flow (either side of the plate).
    const cup = Math.abs(vx * n.x + vy * n.y);
    // Only inflate on descent — upward relative wind into the canopy.
    const descendFrac = Math.max(0, -vy);
    target = cup * descendFrac;
  }
  const rate = target > bone.chuteInflation ? PARA_INFLATE_RATE : PARA_DEFLATE_RATE;
  const alpha = 1 - Math.exp(-rate * FIXED_DT);
  bone.chuteInflation += (target - bone.chuteInflation) * alpha;
  bone.chuteInflation = Math.min(1, Math.max(0, bone.chuteInflation));

  if (speed < 1e-4) return;
  const vx = v.x / speed;
  const vy = v.y / speed;
  const open =
    PARA_STREAM_DRAG_SCALE +
    (1 - PARA_STREAM_DRAG_SCALE) * bone.chuteInflation * bone.chuteInflation;
  const drag = PARA_DRAG_COEFF * area * open * speed * speed;
  bone.body.wakeUp();
  bone.body.addForce({ x: -drag * vx, y: -drag * vy }, true);
}

/** Apply drag/lift/pressure on tagged bones. */
export function applyAeroForces(creature: SpawnedCreature): void {
  const structural = isFeatureEnabled('structuralAeroParts');
  for (const bone of creature.bones) {
    const area = bone.aeroArea;
    if (!area || area <= 0) continue;
    if (!structural || !bone.aeroType) {
      applyLegacyAero(bone, area);
      continue;
    }
    switch (bone.aeroType) {
      case 'wing':
        applyWing(bone, area);
        break;
      case 'glider':
        applyGlider(bone, area);
        break;
      case 'parachute':
        applyParachute(bone, area);
        break;
      default:
        applyLegacyAero(bone, area);
    }
  }
}
