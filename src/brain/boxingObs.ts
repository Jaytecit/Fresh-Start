import {
  boxingEngageBand,
  boxingObsUpright,
  boxingRangeQuality,
  comDistance,
  nearestRoleDistance,
  ownGloveClosingSpeed,
} from '../boxing/rewards';
import type { SpawnedCreature } from '../physics/spawn';

/** Boxing observation pack version — bump when channel layout changes. */
export const BOXING_OBS_PACK_VERSION = 2;
export const BOXING_OBS_COUNT = 24;

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

/** K6 — opponent-relative observation pack v2; separate from locomotion brains. */
export function buildBoxingObservations(
  own: SpawnedCreature,
  opponent: SpawnedCreature,
  ownPoints: number,
  opponentPoints: number,
  timeRemaining01: number,
  episodeTime: number,
  out = new Float32Array(BOXING_OBS_COUNT),
): Float32Array {
  const a = meanState(own);
  const b = meanState(opponent);
  // Normalize both corners so "forward/toward the opponent" is always +X.
  const facing = b.x >= a.x ? 1 : -1;
  out.fill(0);
  out[0] = Math.max(-1, Math.min(1, a.y / 6));
  out[1] = Math.max(-1, Math.min(1, (a.vx * facing) / 20));
  out[2] = Math.max(-1, Math.min(1, a.vy / 20));
  out[3] = Math.max(-1, Math.min(1, ((b.x - a.x) * facing) / 10));
  out[4] = Math.max(-1, Math.min(1, (b.y - a.y) / 6));
  out[5] = Math.max(
    -1,
    Math.min(1, ((b.vx - a.vx) * facing) / 20),
  );
  out[6] = Math.max(-1, Math.min(1, (b.vy - a.vy) / 20));

  const ownGloves = jointPositions(own, 'glove');
  const opponentTargets = jointPositions(opponent, 'target');
  const opponentGloves = jointPositions(opponent, 'glove');
  const ownTargets = jointPositions(own, 'target');
  writeRelative(out, 7, ownGloves[0], opponentTargets[0], facing);
  writeRelative(out, 9, ownGloves[1], opponentTargets[0], facing);
  writeRelative(out, 11, opponentGloves[0], ownTargets[0], facing);
  writeRelative(out, 13, opponentGloves[1], ownTargets[0], facing);

  out[15] = Math.max(-1, Math.min(1, (ownPoints - opponentPoints) / 20));
  out[16] = Math.max(0, Math.min(1, timeRemaining01));
  out[17] = Math.sin(episodeTime * Math.PI * 2);
  out[18] = Math.cos(episodeTime * Math.PI * 2);
  out[19] = 1;

  // v2 — stance, engagement band, threat, closing intent
  out[20] = Math.max(0, Math.min(1, boxingObsUpright(own)));
  out[21] = Math.max(
    0,
    Math.min(
      1,
      boxingRangeQuality(
        comDistance(own, opponent),
        boxingEngageBand(own, opponent),
      ),
    ),
  );
  out[22] = Math.max(
    0,
    Math.min(1, nearestRoleDistance(opponent, 'glove', own, 'target') / 6),
  );
  out[23] = Math.max(
    -1,
    Math.min(1, ownGloveClosingSpeed(own, opponent) / 12),
  );
  return out;
}
