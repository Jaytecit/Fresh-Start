import {
  shapeForBoxingDesign,
  shapeForDanceDesign,
  shapeForDesign,
  shapeForJoustingDesign,
  type ShapeForDesignOptions,
} from '../sim/simulation';
import type { CreatureDesign } from '../creature/types';
import { shapesCompatible } from '../library/savedModels';
import { transplantWeights } from './transplantWeights';
import type { Genome, NetworkShape, TaskId } from './types';

export type EliteBundle = { shape: NetworkShape; genome: Genome };

export type AdaptEliteOptions = ShapeForDesignOptions & {
  /**
   * Observation pack for the elite’s task. Boxing / dance brains use different
   * input layouts than loco — omitting this treats the brain as loco and will
   * fail to adapt after boxing training.
   */
  task?: TaskId;
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

/**
 * Keep a trained elite usable after a design edit.
 * Same actuator layout → unchanged; new muscles/wheels → transplant + expand.
 * Observation layout (loco / boxing / dance, raycast on/off) must match —
 * transplant rejects input changes across packs.
 */
export function adaptEliteToDesign(
  elite: EliteBundle | null,
  design: CreatureDesign,
  shapeOpts?: AdaptEliteOptions,
): EliteBundle | null {
  if (!elite) return null;

  const expected = expectedShapeFor(design, shapeOpts);
  if (shapesCompatible(elite.shape, expected)) return elite;

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
