import type { NetworkShape } from '../brain/types';
import {
  resolveSparringOpponent,
  type SparringOpponentId,
} from '../boxing/sparringOpponents';
import type { BoxingDivisionId } from '../boxing/divisions';
import { cloneDesign, type CreatureDesign } from '../creature/types';
import {
  resolveJoustSparringOpponent,
  type JoustSparringId,
} from '../jousting/sparringOpponents';
import {
  modelToSeed,
  shapesCompatible,
  type SavedModel,
} from '../library/savedModels';
import { resolveDesignForModel } from '../library/resolveModelDesign';
import type { CombatCornerValue } from './types';

export interface ResolvedFighter {
  design: CreatureDesign;
  shape: NetworkShape;
  weights: Float32Array;
}

export interface WorkspaceElite {
  design: CreatureDesign;
  shape: NetworkShape;
  weights: Float32Array;
}

function fromSaved(
  model: SavedModel,
  pool: Parameters<typeof resolveDesignForModel>[1],
  embedded?: CreatureDesign,
): ResolvedFighter | null {
  const design = embedded ?? resolveDesignForModel(model, pool);
  if (!design) return null;
  const seed = modelToSeed(model);
  return {
    design: cloneDesign(design),
    shape: seed.shape,
    weights: seed.weights,
  };
}

export function resolveBoxingCorner(
  corner: CombatCornerValue,
  opts: {
    workspace: WorkspaceElite | null;
    models: SavedModel[];
    pool: Parameters<typeof resolveDesignForModel>[1];
    divisionId: BoxingDivisionId;
    seed: number;
  },
): ResolvedFighter | null {
  if (corner.kind === 'workspace') {
    if (!opts.workspace) return null;
    return {
      design: cloneDesign(opts.workspace.design),
      shape: opts.workspace.shape,
      weights: opts.workspace.weights,
    };
  }
  if (corner.kind === 'saved') {
    const model = opts.models.find((m) => m.id === corner.modelId);
    if (!model) return null;
    return fromSaved(model, opts.pool, model.boxingDesign);
  }
  const sparring = resolveSparringOpponent(
    opts.divisionId,
    corner.id as SparringOpponentId,
    opts.seed,
  );
  return {
    design: cloneDesign(sparring.design),
    shape: sparring.shape,
    weights: sparring.weights,
  };
}

export function resolveJoustCorner(
  corner: CombatCornerValue,
  opts: {
    workspace: WorkspaceElite | null;
    models: SavedModel[];
    pool: Parameters<typeof resolveDesignForModel>[1];
    traineeDesign: CreatureDesign;
    seed: number;
  },
): ResolvedFighter | null {
  if (corner.kind === 'workspace') {
    if (!opts.workspace) return null;
    return {
      design: cloneDesign(opts.workspace.design),
      shape: opts.workspace.shape,
      weights: opts.workspace.weights,
    };
  }
  if (corner.kind === 'saved') {
    const model = opts.models.find((m) => m.id === corner.modelId);
    if (!model) return null;
    return fromSaved(model, opts.pool, model.joustingDesign);
  }
  const sparring = resolveJoustSparringOpponent(
    opts.traineeDesign,
    corner.id as JoustSparringId,
    opts.seed,
  );
  return {
    design: cloneDesign(sparring.design),
    shape: sparring.shape,
    weights: sparring.weights,
  };
}

export function shapesMatchBody(
  fighter: ResolvedFighter,
  expected: NetworkShape,
): boolean {
  return shapesCompatible(fighter.shape, expected);
}
