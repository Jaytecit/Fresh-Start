/**
 * C2.9 — score-only AABB regions (no Rapier).
 * Penalty: time-in-zone. Reward: touch-once. Landing: touch-once after airborne.
 */
import {
  OBSTACLE_MAX_SIZE,
  OBSTACLE_MIN_SIZE,
} from '../physics/constants';
import type { SpawnedCreature } from '../physics/spawn';
import { isFeatureEnabled } from '../port/featureFlags';
import type { EnvironmentDesign, EnvScoreRegion, ScoreRegionKind } from '../env/types';
import {
  LANDING_MIN_AIR_TIME,
  SCORE_REGION_DEFAULT_H,
  SCORE_REGION_DEFAULT_LANDING_H,
  SCORE_REGION_DEFAULT_LANDING_RATE,
  SCORE_REGION_DEFAULT_LANDING_W,
  SCORE_REGION_DEFAULT_PENALTY_RATE,
  SCORE_REGION_DEFAULT_REWARD_RATE,
  SCORE_REGION_DEFAULT_W,
  SCORE_REGION_MAX_RATE,
  SCORE_REGION_MIN_RATE,
} from './constants';

export interface ScoreRegionAccum {
  /** Accumulated penalty magnitude (≥ 0). */
  penalty: number;
  /** Accumulated reward magnitude (≥ 0) from `reward` regions. */
  reward: number;
  /** Accumulated landing magnitude (≥ 0) from `landing` regions. */
  landingReward: number;
  /** Reward / landing region ids already granted this episode. */
  touchedRewardIds: Set<string>;
}

export function emptyScoreRegionAccum(): ScoreRegionAccum {
  return {
    penalty: 0,
    reward: 0,
    landingReward: 0,
    touchedRewardIds: new Set(),
  };
}

export function clampRegionSize(v: number): number {
  if (!Number.isFinite(v)) return OBSTACLE_MIN_SIZE;
  return Math.min(OBSTACLE_MAX_SIZE, Math.max(OBSTACLE_MIN_SIZE, Math.abs(v)));
}

export function clampRegionRate(v: number): number {
  if (!Number.isFinite(v)) return SCORE_REGION_MIN_RATE;
  return Math.min(SCORE_REGION_MAX_RATE, Math.max(SCORE_REGION_MIN_RATE, v));
}

export function clampScoreRegion(r: EnvScoreRegion): EnvScoreRegion {
  return {
    id: r.id,
    kind: r.kind,
    x: Number.isFinite(r.x) ? r.x : 0,
    y: Number.isFinite(r.y) ? r.y : 0,
    w: clampRegionSize(r.w),
    h: clampRegionSize(r.h),
    rate: clampRegionRate(r.rate),
    ...(typeof r.rot === 'number' && Number.isFinite(r.rot)
      ? { rot: r.rot }
      : {}),
  };
}

let regionIdSeq = 0;

export function defaultScoreRegion(kind: ScoreRegionKind): EnvScoreRegion {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `region_${Date.now().toString(36)}_${(regionIdSeq++).toString(36)}`;
  if (kind === 'landing') {
    return {
      id,
      kind,
      x: 8,
      y: SCORE_REGION_DEFAULT_LANDING_H / 2,
      w: SCORE_REGION_DEFAULT_LANDING_W,
      h: SCORE_REGION_DEFAULT_LANDING_H,
      rate: SCORE_REGION_DEFAULT_LANDING_RATE,
    };
  }
  return {
    id,
    kind,
    x: 0,
    y: SCORE_REGION_DEFAULT_H / 2,
    w: SCORE_REGION_DEFAULT_W,
    h: SCORE_REGION_DEFAULT_H,
    rate:
      kind === 'penalty'
        ? SCORE_REGION_DEFAULT_PENALTY_RATE
        : SCORE_REGION_DEFAULT_REWARD_RATE,
  };
}

/** Regions active for scoring when the feature flag is on. */
export function activeScoreRegions(env: EnvironmentDesign): EnvScoreRegion[] {
  if (!isFeatureEnabled('scoreRegions')) return [];
  return (env.regions ?? []).map(clampScoreRegion);
}

function jointsForRegionOverlap(
  creature: SpawnedCreature,
  region: EnvScoreRegion,
): SpawnedCreature['joints'] {
  if (region.kind === 'landing') {
    // Prefer marked feet (including wheeled feet), then marked wheels, else all joints.
    const markedFeet = creature.joints.filter((j) => j.isFoot);
    if (markedFeet.length > 0) return markedFeet;
    const wheels = creature.joints.filter((j) => j.isWheel);
    if (wheels.length > 0) return wheels;
    return creature.joints;
  }
  return creature.joints;
}

export function jointOverlapsRegion(
  creature: SpawnedCreature,
  region: EnvScoreRegion,
): boolean {
  const r = clampScoreRegion(region);
  const hx = r.w / 2;
  const hy = r.h / 2;
  const rot = r.rot ?? 0;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (const j of jointsForRegionOverlap(creature, r)) {
    const p = j.body.translation();
    const dx = p.x - r.x;
    const dy = p.y - r.y;
    const lx = dx * c + dy * s;
    const ly = -dx * s + dy * c;
    if (Math.abs(lx) <= hx && Math.abs(ly) <= hy) {
      return true;
    }
  }
  return false;
}

/**
 * Advance region accumulators for one fixed-dt step.
 * Penalty accrues every overlapping step; reward/landing grant once per id.
 * Landing requires `airTime >= LANDING_MIN_AIR_TIME`.
 */
export function updateScoreRegionAccum(
  creature: SpawnedCreature,
  regions: EnvScoreRegion[],
  dt: number,
  state: ScoreRegionAccum,
  airTime = 0,
): ScoreRegionAccum {
  if (regions.length === 0 || dt <= 0) return state;
  let penalty = state.penalty;
  let reward = state.reward;
  let landingReward = state.landingReward;
  let touched = state.touchedRewardIds;
  const canLand = airTime >= LANDING_MIN_AIR_TIME;
  for (const region of regions) {
    if (!jointOverlapsRegion(creature, region)) continue;
    const r = clampScoreRegion(region);
    if (r.kind === 'penalty') {
      penalty += r.rate * dt;
      continue;
    }
    if (touched.has(r.id)) continue;
    if (r.kind === 'landing' && !canLand) continue;
    if (touched === state.touchedRewardIds) {
      touched = new Set(state.touchedRewardIds);
    }
    touched.add(r.id);
    if (r.kind === 'landing') landingReward += r.rate;
    else reward += r.rate;
  }
  if (
    penalty === state.penalty &&
    reward === state.reward &&
    landingReward === state.landingReward &&
    touched === state.touchedRewardIds
  ) {
    return state;
  }
  return { penalty, reward, landingReward, touchedRewardIds: touched };
}

/** Apply region delta after task base score, before non-negative clamp. */
export function applyRegionScore(
  baseFitness: number,
  accum: ScoreRegionAccum,
  landingMult = 1,
): number {
  const land = accum.landingReward * Math.max(0, landingMult);
  return baseFitness - accum.penalty + accum.reward + land;
}

/** True after any landing region has granted its touch-once bonus. */
export function hasSuccessfulLanding(accum: ScoreRegionAccum): boolean {
  return accum.landingReward > 0;
}

/**
 * C2.9 deepen — stop this individual's episode after a credited landing.
 * Does not mark a fall; scoring keeps the landing bonus.
 */
export function shouldEndEpisodeOnLanding(accum: ScoreRegionAccum): boolean {
  return isFeatureEnabled('endEpisodeOnLanding') && hasSuccessfulLanding(accum);
}
