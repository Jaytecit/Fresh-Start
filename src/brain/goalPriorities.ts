/**
 * D13 — goal priority remapping (score mix only; no physics).
 */
import { GOAL_PRIORITY_DISTANCE_SCALE } from './constants';
import { isFlightTask, type TaskId } from './types';

export interface GoalPriorities {
  /** Emphasize forward distance. */
  distance: number;
  /** Emphasize staying upright. */
  upright: number;
  /** Emphasize not falling (penalty when fell). */
  dontFall: number;
}

export type GoalPriorityKey = keyof GoalPriorities;

export const DEFAULT_GOAL_PRIORITIES: GoalPriorities = {
  distance: 0.5,
  upright: 0.5,
  dontFall: 0.5,
};

/** Tasks where forward distance genuinely feeds the goal's score. */
const DISTANCE_TASKS: ReadonlySet<TaskId> = new Set<TaskId>([
  'run',
  'speed',
  'sprint',
  'rough',
  'longjump',
  'climb',
  'motor',
  'motor_ramp',
  'motor_gap',
  'motor_hurdles',
  'motor_sprint',
  'flight_distance',
  'flight_glider',
]);

/**
 * Priority sliders that can actually tilt the selected goal's score.
 * - `upright` is inert for flight tasks and `hang` (upright gate returns 1).
 * - `distance` is inert for height/posture goals (jump, stay, clear_bar, …).
 * - `dance` is imitation-trained, so no slider applies.
 */
export function relevantPriorityKeys(task: TaskId): GoalPriorityKey[] {
  if (task === 'dance') return [];
  const keys: GoalPriorityKey[] = [];
  if (DISTANCE_TASKS.has(task)) keys.push('distance');
  if (!isFlightTask(task) && task !== 'hang') keys.push('upright');
  keys.push('dontFall');
  return keys;
}

/** Remap a scored fitness using priority sliders in [0, 1]. */
export function applyGoalPriorities(
  baseFitness: number,
  opts: {
    distance: number;
    uprightQuality: number;
    fell: boolean;
    priorities: GoalPriorities;
    /** When provided, sliders irrelevant to this task are ignored. */
    task?: TaskId;
  },
): number {
  const { priorities } = opts;
  const relevant = opts.task
    ? relevantPriorityKeys(opts.task)
    : (['distance', 'upright', 'dontFall'] as GoalPriorityKey[]);
  if (relevant.length === 0) return baseFitness;
  const d = relevant.includes('distance') ? priorities.distance : 0;
  const u = relevant.includes('upright') ? priorities.upright : 0;
  const f = relevant.includes('dontFall') ? priorities.dontFall : 0;
  const sum = d + u + f;
  if (sum < 1e-6) return baseFitness;

  const distTerm = Math.max(0, opts.distance);
  const uprightTerm = Math.max(0, Math.min(1, opts.uprightQuality));
  const fallTerm = opts.fell ? 0 : 1;

  // Blend: keep most of base fitness, tilt with weighted components.
  const tilt =
    (d / sum) * Math.min(1, distTerm / GOAL_PRIORITY_DISTANCE_SCALE) +
    (u / sum) * uprightTerm +
    (f / sum) * fallTerm;
  const blended = baseFitness * (0.55 + 0.9 * tilt);
  return Math.max(0, blended);
}

/** D13 stage trainer — optional auto goal chain. */
export interface StageTrainerStep {
  goalId: string;
  /** Fitness threshold to advance (opt-in). */
  threshold: number;
}

export const DEFAULT_RUN_STAGES: StageTrainerStep[] = [
  { goalId: 'stay', threshold: 4 },
  { goalId: 'run', threshold: 6 },
  { goalId: 'sprint', threshold: 8 },
];
