import type { MorphGenes } from '../creature/morphGenes';
import type { CreatureDesign } from '../creature/types';

export type TaskId =
  | 'run'
  | 'jump'
  | 'climb'
  | 'motor'
  | 'flight'
  /** Wing climb / sustain + landing. */
  | 'flight_wing'
  /** Glider range + landing. */
  | 'flight_glider'
  /** Parachute soft descent + landing. */
  | 'flight_para'
  /** Aero-agnostic peak / mean altitude. */
  | 'flight_height'
  /** Aero-agnostic airborne range. */
  | 'flight_distance'
  | 'rough'
  /** Timed course via C2.10 markers. */
  | 'sprint'
  /** Peak burst + travel. */
  | 'speed'
  /** Integrated supported upright posture. */
  | 'stay'
  /** Isolated hang-time jump. */
  | 'hang'
  /** Isolated long jump (horizontal). */
  | 'longjump'
  /** Clear a virtual height bar. */
  | 'clear_bar'
  /** Repeated short hops (bounce cadence). */
  | 'hop'
  /** Wheeled ramp launch + air. */
  | 'motor_ramp'
  /** Wheeled gap / pit cross. */
  | 'motor_gap'
  /** Wheeled low-obstacle sequence. */
  | 'motor_hurdles'
  /** Wheeled race (markers when present). */
  | 'motor_sprint'
  /** K6 — division-matched points boxing. */
  | 'boxing'
  /** L6 — single-pass jousting scorecard. */
  | 'jousting'
  /** H6 — disco imitation / freestyle (not GA-evolved). */
  | 'dance';

/** True for generic + specialist flight tasks (plant-brake skip, scoring family). */
export function isFlightTask(task: TaskId): boolean {
  return (
    task === 'flight' ||
    task === 'flight_wing' ||
    task === 'flight_glider' ||
    task === 'flight_para' ||
    task === 'flight_height' ||
    task === 'flight_distance'
  );
}

/** Wheeled motor family (skip plant-slide brake like classic motor). */
export function isMotorTask(task: TaskId): boolean {
  return (
    task === 'motor' ||
    task === 'motor_ramp' ||
    task === 'motor_gap' ||
    task === 'motor_hurdles' ||
    task === 'motor_sprint'
  );
}

export interface NetworkShape {
  inputCount: number;
  hiddenCount: number;
  outputCount: number;
  /** Total weights + biases in the flat genome. */
  weightCount: number;
}

export interface Genome {
  weights: Float32Array;
  fitness: number;
  /** Soft morph genes (fixed topology); omitted when morph evolve is off. */
  morph?: MorphGenes;
  /** Per-member body graph; omitted when structural morph evolve is off. */
  topology?: CreatureDesign;
}

export interface EvolutionProgress {
  generation: number;
  evaluated: number;
  populationSize: number;
  bestFitness: number;
  meanFitness: number;
  running: boolean;
  status: string;
  /** 1-based batch index when simulating in batches. */
  batch?: number;
  batchCount?: number;
  focusIndex?: number;
  /** Creatures currently on screen in this batch. */
  cohortSize?: number;
  episodeT?: number;
  episodeDuration?: number;
}
