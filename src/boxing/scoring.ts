import {
  BOXING_MAX_POWER,
  BOXING_MIN_CLOSING_SPEED,
} from '../physics/constants';
import type { BoxingDivisionId } from './divisions';

export type BoxingOwner = 0 | 1;

export interface BoxingHitCandidate {
  attacker: BoxingOwner;
  defender: BoxingOwner;
  gloveJointId: number;
  targetJointId: number;
  targetValue: number;
  targetIsHead: boolean;
  gloveMass: number;
  closingSpeed: number;
  relativeSpeed: number;
  centreDistance: number;
  combinedRadius: number;
  time: number;
}

export interface BoxingHitEvent extends BoxingHitCandidate {
  power: number;
  accuracy: number;
  points: number;
}

export interface BoxingFighterScore {
  points: number;
  attempts: number;
  hits: number;
  totalPower: number;
  peakPower: number;
  totalAccuracy: number;
  knockdowns: number;
}

export interface BoxingMatchScore {
  divisionId: BoxingDivisionId;
  ruleVersion: 1;
  fighters: [BoxingFighterScore, BoxingFighterScore];
  hits: BoxingHitEvent[];
}

export function emptyFighterScore(): BoxingFighterScore {
  return {
    points: 0,
    attempts: 0,
    hits: 0,
    totalPower: 0,
    peakPower: 0,
    totalAccuracy: 0,
    knockdowns: 0,
  };
}

export function createBoxingMatchScore(
  divisionId: BoxingDivisionId,
): BoxingMatchScore {
  return {
    divisionId,
    ruleVersion: 1,
    fighters: [emptyFighterScore(), emptyFighterScore()],
    hits: [],
  };
}

export function clampTargetValue(value: number | undefined): number {
  if (!Number.isFinite(value)) return 1;
  return Math.round(Math.min(5, Math.max(1, value!)));
}

export function scoreBoxingHit(
  candidate: BoxingHitCandidate,
): BoxingHitEvent | null {
  if (candidate.attacker === candidate.defender) return null;
  if (!Number.isFinite(candidate.closingSpeed)) return null;
  if (candidate.closingSpeed < BOXING_MIN_CLOSING_SPEED) return null;

  const power = Math.min(
    BOXING_MAX_POWER,
    Math.max(0, candidate.gloveMass * candidate.closingSpeed),
  );
  // Aim quality: fraction of relative glove speed directed at target centre.
  // This stays meaningful at first sensor entry, where penetration depth is tiny.
  const accuracy = Math.min(
    1,
    Math.max(0, candidate.closingSpeed / Math.max(1e-6, candidate.relativeSpeed)),
  );
  const powerBonus = power >= 16 ? 2 : power >= 6 ? 1 : 0;
  const accuracyBonus = accuracy >= 0.66 ? 2 : accuracy >= 0.33 ? 1 : 0;
  return {
    ...candidate,
    targetValue: clampTargetValue(candidate.targetValue),
    power,
    accuracy,
    points: clampTargetValue(candidate.targetValue) + powerBonus + accuracyBonus,
  };
}

export function recordBoxingHit(
  score: BoxingMatchScore,
  event: BoxingHitEvent,
): void {
  const fighter = score.fighters[event.attacker];
  fighter.hits++;
  fighter.points += event.points;
  fighter.totalPower += event.power;
  fighter.peakPower = Math.max(fighter.peakPower, event.power);
  fighter.totalAccuracy += event.accuracy;
  score.hits.push(event);
}

export function meanHitPower(score: BoxingFighterScore): number {
  return score.hits > 0 ? score.totalPower / score.hits : 0;
}

export function meanHitAccuracy(score: BoxingFighterScore): number {
  return score.hits > 0 ? score.totalAccuracy / score.hits : 0;
}
