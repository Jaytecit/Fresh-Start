/**
 * Boxing training rewards / penalties — separate from public match points.
 * Sensor hits stay non-solving; this only shapes GA fitness.
 */
import { instantUprightQuality } from '../brain/fitness';
import type { SpawnedCreature } from '../physics/spawn';
import {
  meanHitAccuracy,
  meanHitPower,
  type BoxingMatchScore,
  type BoxingOwner,
} from './scoring';

/**
 * Reference-fighter engage band (COM–COM, world units).
 * Matches two ~2.5 m uprights: clinch below 1.2, full credit through 5.
 * Live scoring / obs use `boxingEngageBand()` so ~5 m user bodies keep a
 * punching gap instead of being marked “far” the moment they stop overlapping.
 */
export const BOXING_ENGAGE_MIN = 1.2;
export const BOXING_ENGAGE_MAX = 5.0;
/** Combined width of two reference uprights (2.5 + 2.5). */
const BOXING_REFERENCE_PAIR_WIDTH = 5;
export const BOXING_ENGAGE_MIN_WIDTH_FRAC =
  BOXING_ENGAGE_MIN / BOXING_REFERENCE_PAIR_WIDTH;
export const BOXING_ENGAGE_MAX_WIDTH_FRAC =
  BOXING_ENGAGE_MAX / BOXING_REFERENCE_PAIR_WIDTH;

export interface BoxingFighterBehavior {
  steps: number;
  engagementSteps: number;
  farSteps: number;
  clinchSteps: number;
  /** Longest stretch without a new glove attempt (seconds). */
  maxAttemptIdleSeconds: number;
  /** Current no-attempt stretch (seconds). */
  attemptIdleSeconds: number;
  lastAttempts: number;
}

export interface BoxingBehaviorMetrics {
  fighters: [BoxingFighterBehavior, BoxingFighterBehavior];
}

export interface BoxingFitnessBreakdown {
  margin: number;
  offense: number;
  precision: number;
  engagement: number;
  stance: number;
  winBonus: number;
  damageTaken: number;
  inactivity: number;
  whiffSpam: number;
  camp: number;
  collapse: number;
  clinch: number;
  fitness: number;
}

/** Train-tab priority tilt for Boxing (score mix only; no physics). */
export interface BoxingPriorities {
  /** Point margin, clean hits, win bonus. */
  offense: number;
  /** Hit rate reward + whiff-spam penalty. */
  precision: number;
  /** Penalty for points conceded. */
  defense: number;
  /** Stay in range; punish camp / idle / clinch mush. */
  engagement: number;
  /** Stay upright; punish collapse. */
  stance: number;
}

export type BoxingPriorityKey = keyof BoxingPriorities;

export const DEFAULT_BOXING_PRIORITIES: BoxingPriorities = {
  offense: 0.5,
  precision: 0.5,
  defense: 0.5,
  engagement: 0.5,
  stance: 0.5,
};

export const BOXING_PRIORITY_LABELS: Record<BoxingPriorityKey, string> = {
  offense: 'Offense',
  precision: 'Precision',
  defense: 'Defense',
  engagement: 'Engagement',
  stance: 'Stance',
};

export const BOXING_PRIORITY_KEYS: readonly BoxingPriorityKey[] = [
  'offense',
  'precision',
  'defense',
  'engagement',
  'stance',
] as const;

/** Map slider [0,1] → term scale (0.5 → 1×). */
export function boxingPriorityScale(priority: number): number {
  const p = Math.min(1, Math.max(0, priority));
  return 0.25 + 1.5 * p;
}

/** Minimal match result surface needed for training fitness. */
export interface BoxingFitnessInput {
  score: BoxingMatchScore;
  winner: BoxingOwner | null;
  upright: [number, number];
  behavior: BoxingBehaviorMetrics;
  episodeDuration: number;
}

function emptyFighterBehavior(): BoxingFighterBehavior {
  return {
    steps: 0,
    engagementSteps: 0,
    farSteps: 0,
    clinchSteps: 0,
    maxAttemptIdleSeconds: 0,
    attemptIdleSeconds: 0,
    lastAttempts: 0,
  };
}

export function createBoxingBehaviorMetrics(): BoxingBehaviorMetrics {
  return {
    fighters: [emptyFighterBehavior(), emptyFighterBehavior()],
  };
}

export function creatureCom(creature: SpawnedCreature): {
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

export function comDistance(
  own: SpawnedCreature,
  opponent: SpawnedCreature,
): number {
  const a = creatureCom(own);
  const b = creatureCom(opponent);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

/** Current joint span along X (world). */
export function creatureSpanX(creature: SpawnedCreature): number {
  const joints = creature.joints;
  if (joints.length === 0) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const joint of joints) {
    const x = joint.body.translation().x;
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return Math.max(0, max - min);
}

export interface BoxingEngageBand {
  min: number;
  max: number;
}

/**
 * Clinch / engage / far thresholds from both fighters’ current widths.
 * Ratios preserve the reference 2.5 m + 2.5 m band.
 */
export function boxingEngageBand(
  own: SpawnedCreature,
  opponent: SpawnedCreature,
): BoxingEngageBand {
  const combined = creatureSpanX(own) + creatureSpanX(opponent);
  if (!(combined > 0.5)) {
    return { min: BOXING_ENGAGE_MIN, max: BOXING_ENGAGE_MAX };
  }
  return {
    min: combined * BOXING_ENGAGE_MIN_WIDTH_FRAC,
    max: combined * BOXING_ENGAGE_MAX_WIDTH_FRAC,
  };
}

/** 1 inside the combat band; falls off toward clinch and far range. */
export function boxingRangeQuality(
  distance: number,
  band: BoxingEngageBand = {
    min: BOXING_ENGAGE_MIN,
    max: BOXING_ENGAGE_MAX,
  },
): number {
  if (!Number.isFinite(distance) || distance < 0) return 0;
  const min = band.min;
  const max = band.max;
  if (!(max > min) || min < 0) return 0;
  if (distance >= min && distance <= max) return 1;
  if (distance < min) {
    return Math.max(0, distance / min);
  }
  const over = distance - max;
  return Math.max(0, 1 - over / max);
}

export function nearestRoleDistance(
  from: SpawnedCreature,
  fromRole: 'glove' | 'target',
  to: SpawnedCreature,
  toRole: 'glove' | 'target',
): number {
  const a = from.joints.filter((j) =>
    fromRole === 'glove' ? j.isGlove === true : j.isHitTarget === true,
  );
  const b = to.joints.filter((j) =>
    toRole === 'glove' ? j.isGlove === true : j.isHitTarget === true,
  );
  if (a.length === 0 || b.length === 0) return 10;
  let best = Infinity;
  for (const aj of a) {
    const ap = aj.body.translation();
    for (const bj of b) {
      const bp = bj.body.translation();
      const d = Math.hypot(bp.x - ap.x, bp.y - ap.y);
      if (d < best) best = d;
    }
  }
  return Number.isFinite(best) ? best : 10;
}

/** Max closing speed of own gloves toward nearest opponent target (m/s). */
export function ownGloveClosingSpeed(
  own: SpawnedCreature,
  opponent: SpawnedCreature,
): number {
  const gloves = own.joints.filter((j) => j.isGlove === true);
  const targets = opponent.joints.filter((j) => j.isHitTarget === true);
  if (gloves.length === 0 || targets.length === 0) return 0;
  let best = 0;
  for (const glove of gloves) {
    const gp = glove.body.translation();
    const gv = glove.body.linvel();
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

export function updateBoxingBehaviorMetrics(
  metrics: BoxingBehaviorMetrics,
  own: SpawnedCreature,
  opponent: SpawnedCreature,
  attempts: [number, number],
  dt: number,
): void {
  // COM distance is symmetric; both fighters share the same band classification.
  const distance = comDistance(own, opponent);
  const band = boxingEngageBand(own, opponent);
  for (const owner of [0, 1] as const) {
    const row = metrics.fighters[owner];
    row.steps++;
    if (distance < band.min) row.clinchSteps++;
    else if (distance > band.max) row.farSteps++;
    else row.engagementSteps++;

    const attemptCount = attempts[owner];
    if (attemptCount > row.lastAttempts) {
      row.attemptIdleSeconds = 0;
      row.lastAttempts = attemptCount;
    } else {
      row.attemptIdleSeconds += dt;
      row.maxAttemptIdleSeconds = Math.max(
        row.maxAttemptIdleSeconds,
        row.attemptIdleSeconds,
      );
    }
  }
}

export function computeBoxingTrainingFitness(
  result: BoxingFitnessInput,
  priorities: BoxingPriorities = DEFAULT_BOXING_PRIORITIES,
): BoxingFitnessBreakdown {
  const own = result.score.fighters[0];
  const rival = result.score.fighters[1];
  const behavior = result.behavior.fighters[0];
  const steps = Math.max(1, behavior.steps);
  const engagementFrac = behavior.engagementSteps / steps;
  const farFrac = behavior.farSteps / steps;
  const clinchFrac = behavior.clinchSteps / steps;
  const upright = Math.min(1, Math.max(0, result.upright[0]));
  const hitRate = own.attempts > 0 ? own.hits / own.attempts : 0;

  const so = boxingPriorityScale(priorities.offense);
  const sp = boxingPriorityScale(priorities.precision);
  const sd = boxingPriorityScale(priorities.defense);
  const se = boxingPriorityScale(priorities.engagement);
  const ss = boxingPriorityScale(priorities.stance);

  const margin = (own.points - rival.points) * 10 * so;
  const offense =
    (own.points * 1.5 +
      own.hits * 1 +
      meanHitAccuracy(own) * 5 +
      Math.min(20, meanHitPower(own)) * 0.25) *
    so;
  const precision = (own.attempts > 0 ? hitRate * 8 : 0) * sp;
  const engagement = engagementFrac * 6 * se;
  const stance = upright * 4 * ss;
  const winBonus = (result.winner === 0 ? 5 : 0) * so;

  const damageTaken = rival.points * 6 * sd;
  let inactivity = 0;
  if (own.attempts === 0) {
    inactivity = 10 + Math.min(result.episodeDuration, 12) * 0.5;
  } else {
    const idle = behavior.maxAttemptIdleSeconds;
    if (idle > 4) inactivity = (idle - 4) * 1.5;
  }
  inactivity *= se;
  const whiffSpam =
    (own.attempts >= 4 && hitRate < 0.15
      ? own.attempts * (0.15 - hitRate) * 4
      : 0) * sp;
  const camp = farFrac * 8 * se;
  const collapse = (upright < 0.45 ? (0.45 - upright) * 20 : 0) * ss;
  const clinch =
    (clinchFrac > 0.4 && own.hits === 0 ? (clinchFrac - 0.4) * 10 : 0) * se;

  const fitness =
    margin +
    offense +
    precision +
    engagement +
    stance +
    winBonus -
    damageTaken -
    inactivity -
    whiffSpam -
    camp -
    collapse -
    clinch;

  return {
    margin,
    offense,
    precision,
    engagement,
    stance,
    winBonus,
    damageTaken,
    inactivity,
    whiffSpam,
    camp,
    collapse,
    clinch,
    fitness,
  };
}

/** Instant upright for observations (1 when unmarked). */
export function boxingObsUpright(creature: SpawnedCreature): number {
  return instantUprightQuality(creature);
}
