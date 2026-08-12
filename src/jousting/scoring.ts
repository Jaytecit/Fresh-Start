import {
  JOUST_MAX_POWER,
  JOUST_MIN_CLOSING_SPEED,
} from '../physics/constants';

export type JoustOwner = 0 | 1;

export interface JoustHitCandidate {
  attacker: JoustOwner;
  defender: JoustOwner;
  lanceJointId: number;
  targetJointId: number;
  targetValue: number;
  lanceMass: number;
  closingSpeed: number;
  relativeSpeed: number;
  centreDistance: number;
  combinedRadius: number;
  time: number;
}

export interface JoustHitEvent extends JoustHitCandidate {
  power: number;
  accuracy: number;
  points: number;
}

export interface JoustFighterHits {
  attempts: number;
  hits: number;
  totalPower: number;
  peakPower: number;
  totalAccuracy: number;
  hitPoints: number;
}

export function emptyJoustFighterHits(): JoustFighterHits {
  return {
    attempts: 0,
    hits: 0,
    totalPower: 0,
    peakPower: 0,
    totalAccuracy: 0,
    hitPoints: 0,
  };
}

export function clampTargetValue(value: number | undefined): number {
  if (!Number.isFinite(value)) return 1;
  return Math.round(Math.min(5, Math.max(1, value!)));
}

export function scoreJoustHit(
  candidate: JoustHitCandidate,
): JoustHitEvent | null {
  if (candidate.attacker === candidate.defender) return null;
  if (!Number.isFinite(candidate.closingSpeed)) return null;
  if (candidate.closingSpeed < JOUST_MIN_CLOSING_SPEED) return null;

  const power = Math.min(
    JOUST_MAX_POWER,
    Math.max(0, candidate.lanceMass * candidate.closingSpeed),
  );
  const accuracy = Math.min(
    1,
    Math.max(0, candidate.closingSpeed / Math.max(1e-6, candidate.relativeSpeed)),
  );
  const powerBonus = power >= 24 ? 3 : power >= 10 ? 2 : power >= 4 ? 1 : 0;
  const accuracyBonus = accuracy >= 0.66 ? 2 : accuracy >= 0.33 ? 1 : 0;
  return {
    ...candidate,
    targetValue: clampTargetValue(candidate.targetValue),
    power,
    accuracy,
    points: clampTargetValue(candidate.targetValue) + powerBonus + accuracyBonus,
  };
}

export function recordJoustHit(
  hits: [JoustFighterHits, JoustFighterHits],
  event: JoustHitEvent,
): void {
  const fighter = hits[event.attacker];
  fighter.hits++;
  fighter.hitPoints += event.points;
  fighter.totalPower += event.power;
  fighter.peakPower = Math.max(fighter.peakPower, event.power);
  fighter.totalAccuracy += event.accuracy;
}

export function meanHitPower(row: JoustFighterHits): number {
  return row.hits > 0 ? row.totalPower / row.hits : 0;
}

export function meanHitAccuracy(row: JoustFighterHits): number {
  return row.hits > 0 ? row.totalAccuracy / row.hits : 0;
}
