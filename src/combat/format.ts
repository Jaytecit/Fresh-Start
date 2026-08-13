/**
 * Combat match format (rounds × round length). Not physics tunables —
 * duration defaults still live in `src/physics/constants.ts`.
 */
import type { CombatMode } from './types';
import {
  BOXING_MATCH_SECONDS,
  JOUST_MAX_SECONDS,
} from '../physics/constants';
import { EPISODE_SECONDS } from '../brain/constants';

export const COMBAT_ROUND_COUNTS = [1, 2, 3, 4, 5, 6, 8, 10, 12] as const;
export const COMBAT_ROUNDS_DEFAULT = 1;
export const COMBAT_ROUNDS_MAX = 12;

/** Playback only — Rapier still steps at `FIXED_DT`. 0.25× normal speed. */
export const COMBAT_SLOMO_TIME_SCALE = 0.25;

export const BOXING_ROUND_SECONDS_OPTIONS = [15, 30, 45, 60, 90] as const;
export const JOUST_ROUND_SECONDS_OPTIONS = [6, 8, 12, 16, 20] as const;
export const RACE_ROUND_SECONDS_OPTIONS = [10, 15, 20, 30, 45, 60] as const;

export function clampCombatRounds(n: number): number {
  if (!Number.isFinite(n)) return COMBAT_ROUNDS_DEFAULT;
  const rounded = Math.round(n);
  return Math.min(COMBAT_ROUNDS_MAX, Math.max(1, rounded));
}

export function roundSecondsOptions(
  mode: CombatMode,
): readonly number[] {
  if (mode === 'boxing') return BOXING_ROUND_SECONDS_OPTIONS;
  if (mode === 'joust') return JOUST_ROUND_SECONDS_OPTIONS;
  return RACE_ROUND_SECONDS_OPTIONS;
}

export function defaultRoundSeconds(mode: CombatMode): number {
  if (mode === 'boxing') return BOXING_MATCH_SECONDS;
  if (mode === 'joust') return JOUST_MAX_SECONDS;
  return EPISODE_SECONDS;
}

export function clampRoundSeconds(mode: CombatMode, seconds: number): number {
  const options = roundSecondsOptions(mode);
  if (!Number.isFinite(seconds)) return defaultRoundSeconds(mode);
  const rounded = Math.round(seconds);
  if (options.includes(rounded)) return rounded;
  let best = options[0]!;
  let bestDist = Math.abs(rounded - best);
  for (const option of options) {
    const dist = Math.abs(rounded - option);
    if (dist < bestDist) {
      best = option;
      bestDist = dist;
    }
  }
  return best;
}

export function roundLengthLabel(mode: CombatMode): string {
  if (mode === 'joust') return 'Pass length';
  if (mode === 'race') return 'Heat length';
  return 'Round length';
}
