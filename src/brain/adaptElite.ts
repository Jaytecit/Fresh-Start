import {
  shapeForDesign,
  type ShapeForDesignOptions,
} from '../sim/simulation';
import type { CreatureDesign } from '../creature/types';
import { shapesCompatible } from '../library/savedModels';
import { transplantWeights } from './transplantWeights';
import type { Genome, NetworkShape } from './types';

export type EliteBundle = { shape: NetworkShape; genome: Genome };

/**
 * Keep a trained elite usable after a design edit.
 * Same actuator layout → unchanged; new muscles/wheels → transplant + expand.
 * Observation layout (e.g. raycast on/off) must match — transplant rejects input changes.
 */
export function adaptEliteToDesign(
  elite: EliteBundle | null,
  design: CreatureDesign,
  shapeOpts?: ShapeForDesignOptions,
): EliteBundle | null {
  if (!elite) return null;

  const expected = shapeForDesign(design, shapeOpts);
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
