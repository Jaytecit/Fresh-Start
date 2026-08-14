import {
  shapeForBoxingDesign,
  shapeForDanceDesign,
  shapeForDesign,
  shapeForJoustingDesign,
  type ShapeForDesignOptions,
} from '../sim/simulation';
import type { CreatureDesign } from '../creature/types';
import { shapesCompatible } from '../library/savedModels';
import { OBS_COUNT, RAYCAST_OBS_COUNT } from './constants';
import { transplantWeights, trimInputPrefix } from './transplantWeights';
import {
  obsPackFamily,
  type Genome,
  type NetworkShape,
  type TaskId,
} from './types';

export type EliteBundle = { shape: NetworkShape; genome: Genome };

export type AdaptEliteOptions = ShapeForDesignOptions & {
  /** Destination observation pack. Omitting treats the brain as loco. */
  task?: TaskId;
  /**
   * Pack the elite was trained on. Omit on body edits (same pack as `task`).
   * Required for skill switches so boxing/joust/dance (similar sizes) are not mixed.
   */
  sourceTask?: TaskId;
};

function expectedShapeFor(
  design: CreatureDesign,
  opts?: AdaptEliteOptions,
): NetworkShape {
  if (opts?.task === 'boxing') return shapeForBoxingDesign(design);
  if (opts?.task === 'jousting') return shapeForJoustingDesign(design);
  if (opts?.task === 'dance') return shapeForDanceDesign(design);
  return shapeForDesign(design, opts);
}

function transplantElite(
  elite: EliteBundle,
  expected: NetworkShape,
): EliteBundle | null {
  const weights = transplantWeights(
    elite.shape,
    elite.genome.weights,
    expected,
  );
  if (!weights) return null;
  return {
    shape: expected,
    genome: {
      ...elite.genome,
      weights,
    },
  };
}

/**
 * Keep a trained elite usable after a design edit or a skill switch.
 * Same pack + same actuators → unchanged; new muscles/wheels → transplant.
 * Loco → boxing / joust / dance → drop extra raycast inputs, then prefix-expand.
 * Other pack swaps (Box → Walk, Box → Joust) are refused.
 */
export function adaptEliteToDesign(
  elite: EliteBundle | null,
  design: CreatureDesign,
  shapeOpts?: AdaptEliteOptions,
): EliteBundle | null {
  if (!elite) return null;

  const destTask = shapeOpts?.task ?? 'run';
  const sourceTask = shapeOpts?.sourceTask ?? destTask;
  const sourceFamily = obsPackFamily(sourceTask);
  const destFamily = obsPackFamily(destTask);
  const expected = expectedShapeFor(design, shapeOpts);

  if (sourceFamily === destFamily) {
    if (shapesCompatible(elite.shape, expected)) return elite;
    if (elite.shape.inputCount === expected.inputCount) {
      return transplantElite(elite, expected);
    }
    const locoPrefix =
      elite.shape.inputCount === OBS_COUNT ||
      elite.shape.inputCount === RAYCAST_OBS_COUNT;
    if (!locoPrefix) return null;
    let src = elite;
    if (src.shape.inputCount > OBS_COUNT && destFamily !== 'loco') {
      const trimmed = trimInputPrefix(
        src.shape,
        src.genome.weights,
        OBS_COUNT,
      );
      if (!trimmed) return null;
      src = {
        shape: trimmed.shape,
        genome: { ...src.genome, weights: trimmed.weights },
      };
    }
    return transplantElite(src, expected);
  }

  if (sourceFamily !== 'loco' || destFamily === 'loco') return null;

  let src = elite;
  if (src.shape.inputCount > OBS_COUNT) {
    const trimmed = trimInputPrefix(
      src.shape,
      src.genome.weights,
      OBS_COUNT,
    );
    if (!trimmed) return null;
    src = {
      shape: trimmed.shape,
      genome: { ...src.genome, weights: trimmed.weights },
    };
  }

  if (shapesCompatible(src.shape, expected)) return src;
  return transplantElite(src, expected);
}
