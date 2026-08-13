import { cloneDesign } from '../creature/types';
import {
  designCandidatePool,
  resolveDesignForModel,
} from '../library/resolveModelDesign';
import { modelToSeed, type SavedModel } from '../library/savedModels';

/** Build head-to-head entries from saved models + design pool. */
export function headToHeadEntriesFromModels(
  modelA: SavedModel,
  modelB: SavedModel,
  pool: ReturnType<typeof designCandidatePool>,
): {
  entries: [
    { design: ReturnType<typeof cloneDesign>; shape: SavedModel['shape']; weights: Float32Array },
    { design: ReturnType<typeof cloneDesign>; shape: SavedModel['shape']; weights: Float32Array },
  ];
} | null {
  const dA = resolveDesignForModel(modelA, pool);
  const dB = resolveDesignForModel(modelB, pool);
  if (!dA || !dB) return null;
  const seedA = modelToSeed(modelA);
  const seedB = modelToSeed(modelB);
  return {
    entries: [
      { design: cloneDesign(dA), shape: seedA.shape, weights: seedA.weights },
      { design: cloneDesign(dB), shape: seedB.shape, weights: seedB.weights },
    ],
  };
}
