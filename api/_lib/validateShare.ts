/**
 * Server-side share validation (self-contained for Vercel bundling).
 * Client still uses the full importModelJson path on open.
 */
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
} from './shareLimits.js';

export type ServerShareOk = {
  ok: true;
  raw: string;
  summary: {
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
  };
  preview: {
    name: string;
    joints: Array<{
      id: number;
      x: number;
      y: number;
      isFoot?: boolean;
      isHead?: boolean;
      isWheel?: boolean;
    }>;
    bones: Array<{
      id: number;
      startJointId: number;
      endJointId: number;
      rigid?: boolean;
    }>;
    muscles: Array<{
      id: number;
      startBoneId: number;
      endBoneId: number;
    }>;
  };
};

export type ServerShareResult =
  | ServerShareOk
  | {
      ok: false;
      code: 'too_large' | 'invalid_json' | 'invalid_model' | 'unsupported_version' | 'limits';
    };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function validateShareBody(raw: string): ServerShareResult {
  if (typeof raw !== 'string') {
    return { ok: false, code: 'invalid_json' };
  }
  if (Buffer.byteLength(raw, 'utf8') > SHARE_MAX_JSON_BYTES) {
    return { ok: false, code: 'too_large' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, code: 'invalid_json' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, code: 'invalid_model' };
  }

  const data = parsed as Record<string, unknown>;
  if (data.kind !== 'freshstart-model') {
    return { ok: false, code: 'invalid_model' };
  }
  if (data.version !== SHARE_SUPPORTED_MODEL_VERSION) {
    return { ok: false, code: 'unsupported_version' };
  }
  if (typeof data.name !== 'string' || data.name.length > SHARE_MAX_NAME_LENGTH) {
    return { ok: false, code: 'limits' };
  }
  if (typeof data.task !== 'string' || !data.task) {
    return { ok: false, code: 'invalid_model' };
  }
  if (typeof data.weightsB64 !== 'string' || !data.weightsB64) {
    return { ok: false, code: 'invalid_model' };
  }
  if (data.weightsB64.length > SHARE_MAX_WEIGHTS_B64_LENGTH) {
    return { ok: false, code: 'limits' };
  }
  if (data.fitness !== undefined && !isFiniteNumber(data.fitness)) {
    return { ok: false, code: 'invalid_model' };
  }

  const shape = data.shape as Record<string, unknown> | undefined;
  if (!shape || typeof shape !== 'object') {
    return { ok: false, code: 'invalid_model' };
  }
  const inputCount = shape.inputCount;
  const hiddenCount = shape.hiddenCount;
  const outputCount = shape.outputCount;
  const weightCount = shape.weightCount;
  if (
    !isFiniteNumber(inputCount) ||
    !isFiniteNumber(hiddenCount) ||
    !isFiniteNumber(outputCount) ||
    !isFiniteNumber(weightCount) ||
    inputCount < 1 ||
    inputCount > SHARE_MAX_INPUT_COUNT ||
    hiddenCount < 1 ||
    hiddenCount > SHARE_MAX_HIDDEN_COUNT ||
    outputCount < 1 ||
    outputCount > SHARE_MAX_OUTPUT_COUNT ||
    weightCount < 1 ||
    weightCount > SHARE_MAX_WEIGHT_COUNT
  ) {
    return { ok: false, code: 'limits' };
  }
  const expected =
    hiddenCount * inputCount +
    hiddenCount +
    outputCount * hiddenCount +
    outputCount;
  if (weightCount !== expected) {
    return { ok: false, code: 'limits' };
  }

  let decodedLen = 0;
  try {
    decodedLen = Buffer.from(data.weightsB64, 'base64').byteLength;
  } catch {
    return { ok: false, code: 'invalid_model' };
  }
  if (decodedLen !== weightCount * 4) {
    return { ok: false, code: 'invalid_model' };
  }

  const design = data.design as Record<string, unknown> | undefined;
  if (!design || typeof design !== 'object') {
    return { ok: false, code: 'invalid_model' };
  }
  if (
    !Array.isArray(design.joints) ||
    !Array.isArray(design.bones) ||
    !Array.isArray(design.muscles)
  ) {
    return { ok: false, code: 'invalid_model' };
  }
  if (
    design.joints.length > SHARE_MAX_JOINTS ||
    design.bones.length > SHARE_MAX_BONES ||
    design.muscles.length > SHARE_MAX_MUSCLES
  ) {
    return { ok: false, code: 'limits' };
  }

  const joints = design.joints as Array<Record<string, unknown>>;
  const bones = design.bones as Array<Record<string, unknown>>;
  const muscles = design.muscles as Array<Record<string, unknown>>;

  for (const j of joints) {
    if (
      !isFiniteNumber(j.id) ||
      !isFiniteNumber(j.x) ||
      !isFiniteNumber(j.y)
    ) {
      return { ok: false, code: 'invalid_model' };
    }
  }
  for (const b of bones) {
    if (
      !isFiniteNumber(b.id) ||
      !isFiniteNumber(b.startJointId) ||
      !isFiniteNumber(b.endJointId)
    ) {
      return { ok: false, code: 'invalid_model' };
    }
  }
  for (const m of muscles) {
    if (
      !isFiniteNumber(m.id) ||
      !isFiniteNumber(m.startBoneId) ||
      !isFiniteNumber(m.endBoneId)
    ) {
      return { ok: false, code: 'invalid_model' };
    }
  }

  const compact = JSON.stringify({
    kind: 'freshstart-model',
    version: SHARE_SUPPORTED_MODEL_VERSION,
    name: data.name,
    task: data.task,
    shape: {
      inputCount,
      hiddenCount,
      outputCount,
      weightCount,
    },
    weightsB64: data.weightsB64,
    fitness: isFiniteNumber(data.fitness) ? data.fitness : 0,
    design: data.design,
    ...(data.danceMeta && typeof data.danceMeta === 'object'
      ? { danceMeta: data.danceMeta }
      : {}),
  });

  return {
    ok: true,
    raw: compact,
    summary: {
      name: data.name,
      task: data.task,
      fitness: isFiniteNumber(data.fitness) ? data.fitness : 0,
      joints: joints.length,
      bones: bones.length,
      muscles: muscles.length,
      inputCount,
      hiddenCount,
      outputCount,
      version: SHARE_SUPPORTED_MODEL_VERSION,
    },
    preview: {
      name: typeof design.name === 'string' ? design.name : data.name,
      joints: joints.map((j) => ({
        id: j.id as number,
        x: j.x as number,
        y: j.y as number,
        ...(j.isFoot === true ? { isFoot: true } : {}),
        ...(j.isHead === true ? { isHead: true } : {}),
        ...(j.isWheel === true ? { isWheel: true } : {}),
      })),
      bones: bones.map((b) => ({
        id: b.id as number,
        startJointId: b.startJointId as number,
        endJointId: b.endJointId as number,
        ...(b.rigid === true ? { rigid: true } : {}),
      })),
      muscles: muscles.map((m) => ({
        id: m.id as number,
        startBoneId: m.startBoneId as number,
        endBoneId: m.endBoneId as number,
      })),
    },
  };
}
