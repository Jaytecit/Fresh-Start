import { instantUprightQuality } from '../brain/fitness';
import type { SpawnedCreature } from '../physics/spawn';
import {
  designHasExplicitJoustTargets,
  jointIsJoustTarget,
  jointIsLance,
} from '../jousting/marks';
import { creatureCom } from '../jousting/pass';
import { OBS_COUNT } from './constants';
import {
  buildObservations,
  type ObservationContext,
} from './observations';

/** Jousting observation pack version — bump when channel layout changes. */
export const JOUST_OBS_PACK_VERSION = 2;
/** Opponent / lance suffix after the locomotion prefix. */
export const JOUST_OBS_SUFFIX = 14;
export const JOUST_OBS_COUNT = OBS_COUNT + JOUST_OBS_SUFFIX;

function writeRelative(
  out: Float32Array,
  offset: number,
  from: { x: number; y: number } | undefined,
  to: { x: number; y: number } | undefined,
  facing: number,
): void {
  out[offset] =
    from && to
      ? Math.max(-1, Math.min(1, ((to.x - from.x) * facing) / 12))
      : 0;
  out[offset + 1] =
    from && to ? Math.max(-1, Math.min(1, (to.y - from.y) / 8)) : 0;
}

function rolePositions(
  creature: SpawnedCreature,
  role: 'lance' | 'target',
): { x: number; y: number }[] {
  const explicit = designHasExplicitJoustTargets(creature.joints);
  return creature.joints
    .filter((joint) =>
      role === 'lance'
        ? jointIsLance(joint)
        : jointIsJoustTarget(joint, explicit),
    )
    .map((joint) => joint.body.translation());
}

function nearest(
  from: { x: number; y: number }[],
  to: { x: number; y: number }[],
): { from?: { x: number; y: number }; to?: { x: number; y: number } } {
  if (from.length === 0 || to.length === 0) return {};
  let best = Infinity;
  let a = from[0];
  let b = to[0];
  for (const f of from) {
    for (const t of to) {
      const d = Math.hypot(t.x - f.x, t.y - f.y);
      if (d < best) {
        best = d;
        a = f;
        b = t;
      }
    }
  }
  return { from: a, to: b };
}

function lanceClosingSpeed(
  own: SpawnedCreature,
  opponent: SpawnedCreature,
): number {
  const lances = own.joints.filter((j) => jointIsLance(j));
  const explicit = designHasExplicitJoustTargets(opponent.joints);
  const targets = opponent.joints.filter((j) =>
    jointIsJoustTarget(j, explicit),
  );
  if (lances.length === 0 || targets.length === 0) return 0;
  let best = 0;
  for (const lance of lances) {
    const gp = lance.body.translation();
    const gv = lance.body.linvel();
    for (const target of targets) {
      const tp = target.body.translation();
      const dx = tp.x - gp.x;
      const dy = tp.y - gp.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1e-6) continue;
      const closing = (gv.x * dx + gv.y * dy) / dist;
      if (closing > best) best = closing;
    }
  }
  return best;
}

/**
 * Joust pack v2: locomotion prefix (OBS_COUNT) + opponent/lance suffix.
 * 12–15 opponent relative pose/vel · 16–17 aim · 18–19 threat
 * 20 score · 21 phase · 22 time · 23 opponent upright · 24 range · 25 closing
 */
export function buildJoustObservations(
  own: SpawnedCreature,
  opponent: SpawnedCreature,
  ownTotal: number,
  opponentTotal: number,
  phase01: number,
  timeRemaining01: number,
  episodeTime: number,
  out = new Float32Array(JOUST_OBS_COUNT),
  ctx?: ObservationContext,
): Float32Array {
  const buf =
    out.length >= JOUST_OBS_COUNT ? out : new Float32Array(JOUST_OBS_COUNT);
  buf.fill(0);
  buildObservations(own, buf, ctx ?? { timeSec: episodeTime });

  const a = creatureCom(own);
  const b = creatureCom(opponent);
  const facing = b.x >= a.x ? 1 : -1;
  const s = OBS_COUNT;
  buf[s] = Math.max(-1, Math.min(1, ((b.x - a.x) * facing) / 60));
  buf[s + 1] = Math.max(-1, Math.min(1, (b.y - a.y) / 8));
  buf[s + 2] = Math.max(-1, Math.min(1, ((b.vx - a.vx) * facing) / 24));
  buf[s + 3] = Math.max(-1, Math.min(1, (b.vy - a.vy) / 20));

  const ownLance = rolePositions(own, 'lance');
  const oppTarget = rolePositions(opponent, 'target');
  const oppLance = rolePositions(opponent, 'lance');
  const ownTarget = rolePositions(own, 'target');
  const aim = nearest(ownLance, oppTarget);
  const threat = nearest(oppLance, ownTarget);
  writeRelative(buf, s + 4, aim.from, aim.to, facing);
  writeRelative(buf, s + 6, threat.from, threat.to, facing);

  buf[s + 8] = Math.max(-1, Math.min(1, (ownTotal - opponentTotal) / 30));
  buf[s + 9] = Math.max(0, Math.min(1, phase01));
  buf[s + 10] = Math.max(0, Math.min(1, timeRemaining01));
  buf[s + 11] = Math.max(0, Math.min(1, instantUprightQuality(opponent)));
  buf[s + 12] = Math.max(
    0,
    Math.min(1, Math.hypot(b.x - a.x, b.y - a.y) / 80),
  );
  buf[s + 13] = Math.max(-1, Math.min(1, lanceClosingSpeed(own, opponent) / 16));
  return buf;
}
