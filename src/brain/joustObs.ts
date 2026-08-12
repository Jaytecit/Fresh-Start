import { instantUprightQuality } from '../brain/fitness';
import type { SpawnedCreature } from '../physics/spawn';
import {
  designHasExplicitJoustTargets,
  jointIsJoustTarget,
  jointIsLance,
} from '../jousting/marks';
import { creatureCom } from '../jousting/pass';

/** Jousting observation pack version — bump when channel layout changes. */
export const JOUST_OBS_PACK_VERSION = 1;
export const JOUST_OBS_COUNT = 20;

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

/** L6 — opponent-relative observation pack; separate from locomotion / boxing. */
export function buildJoustObservations(
  own: SpawnedCreature,
  opponent: SpawnedCreature,
  ownTotal: number,
  opponentTotal: number,
  phase01: number,
  timeRemaining01: number,
  episodeTime: number,
  out = new Float32Array(JOUST_OBS_COUNT),
): Float32Array {
  const a = creatureCom(own);
  const b = creatureCom(opponent);
  const facing = b.x >= a.x ? 1 : -1;
  out.fill(0);
  out[0] = Math.max(-1, Math.min(1, a.y / 8));
  out[1] = Math.max(-1, Math.min(1, (a.vx * facing) / 24));
  out[2] = Math.max(-1, Math.min(1, a.vy / 20));
  out[3] = Math.max(-1, Math.min(1, ((b.x - a.x) * facing) / 60));
  out[4] = Math.max(-1, Math.min(1, (b.y - a.y) / 8));
  out[5] = Math.max(-1, Math.min(1, ((b.vx - a.vx) * facing) / 24));
  out[6] = Math.max(-1, Math.min(1, (b.vy - a.vy) / 20));

  const ownLance = rolePositions(own, 'lance');
  const oppTarget = rolePositions(opponent, 'target');
  const oppLance = rolePositions(opponent, 'lance');
  const ownTarget = rolePositions(own, 'target');
  const aim = nearest(ownLance, oppTarget);
  const threat = nearest(oppLance, ownTarget);
  writeRelative(out, 7, aim.from, aim.to, facing);
  writeRelative(out, 9, threat.from, threat.to, facing);

  out[11] = Math.max(-1, Math.min(1, (ownTotal - opponentTotal) / 30));
  out[12] = Math.max(0, Math.min(1, phase01));
  out[13] = Math.max(0, Math.min(1, timeRemaining01));
  out[14] = Math.max(0, Math.min(1, instantUprightQuality(own)));
  out[15] = Math.max(0, Math.min(1, instantUprightQuality(opponent)));
  out[16] = Math.max(0, Math.min(1, Math.hypot(b.x - a.x, b.y - a.y) / 80));
  out[17] = Math.max(-1, Math.min(1, lanceClosingSpeed(own, opponent) / 16));
  out[18] = Math.sin(episodeTime * Math.PI * 2);
  out[19] = Math.cos(episodeTime * Math.PI * 2);
  return out;
}
