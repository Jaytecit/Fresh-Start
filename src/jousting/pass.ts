import { instantUprightQuality } from '../brain/fitness';
import { JOUST_AFTERMATH_SECONDS } from '../physics/constants';
import type { SpawnedCreature } from '../physics/spawn';
import type { JoustHitEvent } from './scoring';

export type JoustClashReason = 'hit' | 'cross' | 'closest' | 'timeout';
export type JoustPassPhase = 'charge' | 'aftermath' | 'done';

export interface JoustCom {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function creatureCom(creature: SpawnedCreature): JoustCom {
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

export interface JoustPassState {
  phase: JoustPassPhase;
  clashT: number | null;
  clashReason: JoustClashReason | null;
  clashCom: [JoustCom, JoustCom] | null;
  minComDist: number;
  closingAtClosest: number;
  prevComDist: number;
  approached: boolean;
  aftermathUprightSum: [number, number];
  aftermathUprightSteps: [number, number];
  peakKnockback: [number, number];
  knockdown: [boolean, boolean];
}

export function createJoustPassState(): JoustPassState {
  return {
    phase: 'charge',
    clashT: null,
    clashReason: null,
    clashCom: null,
    minComDist: Infinity,
    closingAtClosest: 0,
    prevComDist: Infinity,
    approached: false,
    aftermathUprightSum: [0, 0],
    aftermathUprightSteps: [0, 0],
    peakKnockback: [0, 0],
    knockdown: [false, false],
  };
}

function beginClash(
  pass: JoustPassState,
  time: number,
  reason: JoustClashReason,
  a: JoustCom,
  b: JoustCom,
): void {
  if (pass.phase !== 'charge') return;
  pass.phase = 'aftermath';
  pass.clashT = time;
  pass.clashReason = reason;
  pass.clashCom = [
    { ...a },
    { ...b },
  ];
}

/**
 * Advance the single-pass clock. Returns true when the scorecard should freeze.
 */
export function updateJoustPass(
  pass: JoustPassState,
  own: SpawnedCreature,
  opponent: SpawnedCreature,
  time: number,
  _dt: number,
  maxSeconds: number,
  newHits: readonly JoustHitEvent[],
): boolean {
  const a = creatureCom(own);
  const b = creatureCom(opponent);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const closing = pass.prevComDist - dist;
  if (dist < pass.minComDist) {
    pass.minComDist = dist;
    const relVx = a.vx - b.vx;
    const relVy = a.vy - b.vy;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const inv = dist > 1e-6 ? 1 / dist : 0;
    pass.closingAtClosest = relVx * dx * inv + relVy * dy * inv;
  }
  if (dist < 18) pass.approached = true;
  pass.prevComDist = dist;

  if (pass.phase === 'charge') {
    if (newHits.length > 0) {
      beginClash(pass, time, 'hit', a, b);
    } else if (a.x >= b.x) {
      beginClash(pass, time, 'cross', a, b);
    } else if (
      pass.approached &&
      closing < -0.02 &&
      dist > pass.minComDist + 0.6
    ) {
      beginClash(pass, time, 'closest', a, b);
    } else if (time >= maxSeconds) {
      beginClash(pass, time, 'timeout', a, b);
    }
  }

  if (pass.phase === 'aftermath' && pass.clashCom) {
    const uprightA = instantUprightQuality(own);
    const uprightB = instantUprightQuality(opponent);
    pass.aftermathUprightSum[0] += uprightA;
    pass.aftermathUprightSum[1] += uprightB;
    pass.aftermathUprightSteps[0]++;
    pass.aftermathUprightSteps[1]++;
    if (uprightA < 0.35) pass.knockdown[0] = true;
    if (uprightB < 0.35) pass.knockdown[1] = true;
    // A charges +X: knockback scored by A is how far B moved further +X.
    pass.peakKnockback[0] = Math.max(
      pass.peakKnockback[0],
      b.x - pass.clashCom[1].x,
    );
    pass.peakKnockback[1] = Math.max(
      pass.peakKnockback[1],
      pass.clashCom[0].x - a.x,
    );
    if (time - (pass.clashT ?? time) >= JOUST_AFTERMATH_SECONDS) {
      pass.phase = 'done';
      return true;
    }
  }

  return pass.phase === 'done';
}

export function aftermathUpright(pass: JoustPassState, owner: 0 | 1): number {
  const steps = pass.aftermathUprightSteps[owner];
  if (steps <= 0) return 0;
  return pass.aftermathUprightSum[owner] / steps;
}
