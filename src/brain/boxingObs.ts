import {
  boxingEngageBand,
  boxingRangeQuality,
  comDistance,
  ownGloveClosingSpeed,
} from '../boxing/rewards';
import type { SpawnedCreature } from '../physics/spawn';
import { OBS_COUNT } from './constants';
import {
  buildObservations,
  type ObservationContext,
} from './observations';

/** Boxing observation pack version — bump when channel layout changes. */
export const BOXING_OBS_PACK_VERSION = 3;
/** Opponent / glove suffix after the locomotion prefix. */
export const BOXING_OBS_SUFFIX = 12;
export const BOXING_OBS_COUNT = OBS_COUNT + BOXING_OBS_SUFFIX;

function meanState(creature: SpawnedCreature): {
  x: number;
  y: number;
  vx: number;
  vy: number;
} {
  if (creature.joints.length === 0) return { x: 0, y: 0, vx: 0, vy: 0 };
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  for (const joint of creature.joints) {
    const p = joint.body.translation();
    const v = joint.body.linvel();
    x += p.x;
    y += p.y;
    vx += v.x;
    vy += v.y;
  }
  const n = creature.joints.length;
  return { x: x / n, y: y / n, vx: vx / n, vy: vy / n };
}

function writeRelative(
  out: Float32Array,
  offset: number,
  from: { x: number; y: number } | undefined,
  to: { x: number; y: number } | undefined,
  facing: number,
): void {
  out[offset] =
    from && to
      ? Math.max(-1, Math.min(1, ((to.x - from.x) * facing) / 6))
      : 0;
  out[offset + 1] =
    from && to ? Math.max(-1, Math.min(1, (to.y - from.y) / 6)) : 0;
}

function jointPositions(
  creature: SpawnedCreature,
  role: 'glove' | 'target',
): { x: number; y: number }[] {
  return creature.joints
    .filter((joint) =>
      role === 'glove' ? joint.isGlove === true : joint.isHitTarget === true,
    )
    .map((joint) => joint.body.translation());
}

/**
 * Boxing pack v3: locomotion prefix (OBS_COUNT) + opponent/glove suffix.
 * 12–15 opponent relative pose/vel (facing-normalized)
 * 16–19 own gloves → opponent target
 * 20 score delta · 21 time remaining · 22 range quality · 23 closing speed
 */
export function buildBoxingObservations(
  own: SpawnedCreature,
  opponent: SpawnedCreature,
  ownPoints: number,
  opponentPoints: number,
  timeRemaining01: number,
  episodeTime: number,
  out = new Float32Array(BOXING_OBS_COUNT),
  ctx?: ObservationContext,
): Float32Array {
  const buf =
    out.length >= BOXING_OBS_COUNT ? out : new Float32Array(BOXING_OBS_COUNT);
  buf.fill(0);
  buildObservations(own, buf, ctx ?? { timeSec: episodeTime });

  const a = meanState(own);
  const b = meanState(opponent);
  const facing = b.x >= a.x ? 1 : -1;
  const s = OBS_COUNT;
  buf[s] = Math.max(-1, Math.min(1, ((b.x - a.x) * facing) / 10));
  buf[s + 1] = Math.max(-1, Math.min(1, (b.y - a.y) / 6));
  buf[s + 2] = Math.max(-1, Math.min(1, ((b.vx - a.vx) * facing) / 20));
  buf[s + 3] = Math.max(-1, Math.min(1, (b.vy - a.vy) / 20));

  const ownGloves = jointPositions(own, 'glove');
  const opponentTargets = jointPositions(opponent, 'target');
  writeRelative(buf, s + 4, ownGloves[0], opponentTargets[0], facing);
  writeRelative(buf, s + 6, ownGloves[1], opponentTargets[0], facing);

  buf[s + 8] = Math.max(-1, Math.min(1, (ownPoints - opponentPoints) / 20));
  buf[s + 9] = Math.max(0, Math.min(1, timeRemaining01));
  buf[s + 10] = Math.max(
    0,
    Math.min(
      1,
      boxingRangeQuality(
        comDistance(own, opponent),
        boxingEngageBand(own, opponent),
      ),
    ),
  );
  buf[s + 11] = Math.max(
    -1,
    Math.min(1, ownGloveClosingSpeed(own, opponent) / 12),
  );
  return buf;
}
