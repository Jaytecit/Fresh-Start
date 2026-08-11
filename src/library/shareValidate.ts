/**
 * C6 — Validate untrusted shared model JSON before store / open.
 */
import type { NetworkShape, TaskId } from '../brain/types';
import type { CreatureDesign } from '../creature/types';
import {
  importModelJson,
  type JsonResult,
  type ModelExport,
} from './jsonIO';
import type { DanceCurriculumMeta } from './savedModels';
import {
  SHARE_MAX_BONES,
  SHARE_MAX_HIDDEN_COUNT,
  SHARE_MAX_INPUT_COUNT,
  SHARE_MAX_JOINTS,
  SHARE_MAX_JSON_BYTES,
  SHARE_MAX_MUSCLES,
  SHARE_MAX_NAME_LENGTH,
  SHARE_MAX_OUTPUT_COUNT,
  SHARE_MAX_WEIGHT_COUNT,
  SHARE_MAX_WEIGHTS_B64_LENGTH,
  SHARE_SUPPORTED_MODEL_VERSION,
} from './shareLimits';

export type ShareValidateErrorCode =
  | 'too_large'
  | 'invalid_json'
  | 'invalid_model'
  | 'unsupported_version'
  | 'limits';

export type ShareValidateResult =
  | {
      ok: true;
      raw: string;
      model: ModelExport;
      imported: {
        name: string;
        task: TaskId;
        shape: NetworkShape;
        weights: Float32Array;
        fitness: number;
        design: CreatureDesign;
        danceMeta?: DanceCurriculumMeta;
      };
    }
  | { ok: false; code: ShareValidateErrorCode; error: string };

function utf8ByteLength(text: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text).length;
  }
  // Node fallback
  return Buffer.byteLength(text, 'utf8');
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function shapeWithinLimits(shape: NetworkShape): string | null {
  if (
    !isFiniteNumber(shape.inputCount) ||
    !isFiniteNumber(shape.hiddenCount) ||
    !isFiniteNumber(shape.outputCount) ||
    !isFiniteNumber(shape.weightCount)
  ) {
    return 'Neural network dimensions must be finite numbers.';
  }
  if (
    shape.inputCount < 1 ||
    shape.inputCount > SHARE_MAX_INPUT_COUNT ||
    shape.hiddenCount < 1 ||
    shape.hiddenCount > SHARE_MAX_HIDDEN_COUNT ||
    shape.outputCount < 1 ||
    shape.outputCount > SHARE_MAX_OUTPUT_COUNT ||
    shape.weightCount < 1 ||
    shape.weightCount > SHARE_MAX_WEIGHT_COUNT
  ) {
    return 'Neural network dimensions are out of allowed range.';
  }
  const expected =
    shape.inputCount * shape.hiddenCount +
    shape.hiddenCount +
    shape.hiddenCount * shape.outputCount +
    shape.outputCount;
  if (shape.weightCount !== expected) {
    return 'Neural network weightCount does not match layer sizes.';
  }
  return null;
}

/**
 * Validate a raw JSON string as a shareable Solemn Sandbox model.
 * Uses the canonical importer after structural / limit checks.
 */
export function validateSharePayload(raw: string): ShareValidateResult {
  if (typeof raw !== 'string') {
    return {
      ok: false,
      code: 'invalid_json',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }
  if (utf8ByteLength(raw) > SHARE_MAX_JSON_BYTES) {
    return {
      ok: false,
      code: 'too_large',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      code: 'invalid_json',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      code: 'invalid_model',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }

  const data = parsed as Partial<ModelExport>;
  if (data.kind !== 'freshstart-model') {
    return {
      ok: false,
      code: 'invalid_model',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }
  if (data.version !== SHARE_SUPPORTED_MODEL_VERSION) {
    return {
      ok: false,
      code: 'unsupported_version',
      error:
        'This creature was created with an incompatible version of Solemn Sandbox.',
    };
  }
  if (typeof data.name !== 'string' || data.name.length > SHARE_MAX_NAME_LENGTH) {
    return {
      ok: false,
      code: 'limits',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }
  if (typeof data.weightsB64 !== 'string') {
    return {
      ok: false,
      code: 'invalid_model',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }
  if (data.weightsB64.length > SHARE_MAX_WEIGHTS_B64_LENGTH) {
    return {
      ok: false,
      code: 'limits',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }
  if (data.fitness !== undefined && !isFiniteNumber(data.fitness)) {
    return {
      ok: false,
      code: 'invalid_model',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }

  const design = data.design;
  if (!design || typeof design !== 'object') {
    return {
      ok: false,
      code: 'invalid_model',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }
  if (
    !Array.isArray(design.joints) ||
    !Array.isArray(design.bones) ||
    !Array.isArray(design.muscles)
  ) {
    return {
      ok: false,
      code: 'invalid_model',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }
  if (
    design.joints.length > SHARE_MAX_JOINTS ||
    design.bones.length > SHARE_MAX_BONES ||
    design.muscles.length > SHARE_MAX_MUSCLES
  ) {
    return {
      ok: false,
      code: 'limits',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }
  if (data.shape) {
    const shapeErr = shapeWithinLimits(data.shape as NetworkShape);
    if (shapeErr) {
      return { ok: false, code: 'limits', error: shapeErr };
    }
  }

  const imported: JsonResult<{
    name: string;
    task: TaskId;
    shape: NetworkShape;
    weights: Float32Array;
    fitness: number;
    design: CreatureDesign;
    danceMeta?: DanceCurriculumMeta;
  }> = importModelJson(raw);

  if (!imported.ok) {
    return {
      ok: false,
      code: 'invalid_model',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }

  const shapeErr = shapeWithinLimits(imported.value.shape);
  if (shapeErr) {
    return { ok: false, code: 'limits', error: shapeErr };
  }
  if (!isFiniteNumber(imported.value.fitness)) {
    return {
      ok: false,
      code: 'invalid_model',
      error: 'This shared file is not a valid Solemn Sandbox creature.',
    };
  }

  // Re-serialize through the parsed object to keep a stable store payload.
  const model: ModelExport = {
    kind: 'freshstart-model',
    version: SHARE_SUPPORTED_MODEL_VERSION,
    name: imported.value.name.slice(0, SHARE_MAX_NAME_LENGTH),
    task: imported.value.task,
    shape: { ...imported.value.shape },
    weightsB64: data.weightsB64,
    fitness: imported.value.fitness,
    design: imported.value.design,
    ...(imported.value.danceMeta
      ? { danceMeta: { ...imported.value.danceMeta } }
      : {}),
  };

  return {
    ok: true,
    raw: JSON.stringify(model),
    model,
    imported: imported.value,
  };
}

/** Compact public summary for share pages (no weights). */
export interface ShareSummary {
  id: string;
  name: string;
  task: string;
  fitness: number;
  joints: number;
  bones: number;
  muscles: number;
  inputCount: number;
  hiddenCount: number;
  outputCount: number;
  version: number;
}

export function summarizeShareModel(
  id: string,
  model: ModelExport,
): ShareSummary {
  return {
    id,
    name: model.name,
    task: model.task,
    fitness: model.fitness,
    joints: model.design.joints.length,
    bones: model.design.bones.length,
    muscles: model.design.muscles.length,
    inputCount: model.shape.inputCount,
    hiddenCount: model.shape.hiddenCount,
    outputCount: model.shape.outputCount,
    version: model.version,
  };
}

export function userFacingShareLoadError(
  code: ShareValidateErrorCode | 'not_found' | 'network',
): string {
  switch (code) {
    case 'not_found':
      return 'This shared creature could not be found.';
    case 'unsupported_version':
      return 'This creature was created with an incompatible version of Solemn Sandbox.';
    case 'network':
      return 'The creature could not be loaded. Check your connection and try again.';
    case 'too_large':
    case 'invalid_json':
    case 'invalid_model':
    case 'limits':
    default:
      return 'This shared file is not a valid Solemn Sandbox creature.';
  }
}
