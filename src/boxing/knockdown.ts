import { instantUprightQuality } from '../brain/fitness';
import { minJointClearance } from '../brain/observations';
import type { EnvTerrain } from '../env/types';
import {
  BOXING_COUNT_SECONDS,
  BOXING_DOWN_CLEARANCE,
  BOXING_DOWN_UPRIGHT,
  BOXING_RECOVER_UPRIGHT,
  BOXING_TKO_MIN_ACCURACY,
  BOXING_TKO_MIN_POWER,
} from '../physics/constants';
import type { SpawnedCreature } from '../physics/spawn';
import type { BoxingHitEvent, BoxingOwner } from './scoring';

export type BoxingStopReason = 'points' | 'draw' | 'count-out' | 'tko';

export interface BoxingFighterClock {
  /** Instant upright quality this step (head height vs designed). */
  upright: number;
  /** True when torso/head clearance says the body is on the canvas. */
  fallen: boolean;
  down: boolean;
  /** Seconds spent down on the current count. */
  countElapsed: number;
  /** Trips to the canvas this match (including a count-out). */
  knockdowns: number;
  countedOut: boolean;
}

export function createBoxingFighterClock(): BoxingFighterClock {
  return {
    upright: 1,
    fallen: false,
    down: false,
    countElapsed: 0,
    knockdowns: 0,
    countedOut: false,
  };
}

/** Bell between rounds: clear the count, keep knockdowns for the card. */
export function resetBoxingClockForRound(clock: BoxingFighterClock): void {
  clock.down = false;
  clock.countElapsed = 0;
  clock.countedOut = false;
  clock.fallen = false;
}

export function boxingCountRemaining(clock: BoxingFighterClock): number {
  if (!clock.down) return 0;
  return Math.max(0, Math.ceil(BOXING_COUNT_SECONDS - clock.countElapsed));
}

export function measureBoxingStance(
  creature: SpawnedCreature,
  terrain?: EnvTerrain | null,
): { upright: number; fallen: boolean } {
  const upright = instantUprightQuality(creature);
  const fallen = minJointClearance(creature, terrain) < BOXING_DOWN_CLEARANCE;
  return { upright, fallen };
}

/**
 * Advance the 10-count. Down = collapsed upright or fallen on the canvas.
 * Recovery needs both stance and clearance; unseeded randomness is never used.
 */
export function updateBoxingFighterClock(
  clock: BoxingFighterClock,
  upright: number,
  fallen: boolean,
  dt: number,
): void {
  clock.upright = upright;
  clock.fallen = fallen;
  if (clock.countedOut) return;

  const collapsed = upright < BOXING_DOWN_UPRIGHT;
  const shouldBeDown = fallen || collapsed;

  if (clock.down) {
    clock.countElapsed += dt;
    if (clock.countElapsed >= BOXING_COUNT_SECONDS) {
      clock.countedOut = true;
      return;
    }
    const recovered = !fallen && upright >= BOXING_RECOVER_UPRIGHT;
    if (recovered) {
      clock.down = false;
      clock.countElapsed = 0;
    }
    return;
  }

  if (shouldBeDown) {
    clock.down = true;
    clock.countElapsed = 0;
    clock.knockdowns += 1;
  }
}

/** Rare TKO: hard, well-aimed punch on a marked head. Deterministic thresholds. */
export function isBoxingTkoHit(event: BoxingHitEvent): boolean {
  return (
    event.targetIsHead &&
    event.power >= BOXING_TKO_MIN_POWER &&
    event.accuracy >= BOXING_TKO_MIN_ACCURACY
  );
}

export function resolveBoxingStop(
  clocks: readonly [BoxingFighterClock, BoxingFighterClock],
  tkoAttacker: BoxingOwner | null,
  points: readonly [number, number],
): { winner: BoxingOwner | null; reason: BoxingStopReason } {
  if (tkoAttacker !== null) {
    return { winner: tkoAttacker, reason: 'tko' };
  }
  const aOut = clocks[0].countedOut;
  const bOut = clocks[1].countedOut;
  if (aOut && !bOut) return { winner: 1, reason: 'count-out' };
  if (bOut && !aOut) return { winner: 0, reason: 'count-out' };
  if (aOut && bOut) return { winner: null, reason: 'draw' };
  if (points[0] === points[1]) return { winner: null, reason: 'draw' };
  return { winner: points[0] > points[1] ? 0 : 1, reason: 'points' };
}
