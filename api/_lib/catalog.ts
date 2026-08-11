/**
 * C7 — Public creations catalog helpers (self-contained for Vercel).
 */
import { isValidShareId } from './shareIds.js';
import { SHARE_MAX_NAME_LENGTH } from './shareLimits.js';

export interface CatalogEntry {
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
  listedAt: number;
}

export function blobPathForCatalog(id: string): string {
  return `catalog/${id}.json`;
}

export function catalogEntryFromSummary(
  id: string,
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
  },
  listedAt = Date.now(),
): CatalogEntry {
  return {
    id,
    name: summary.name.slice(0, SHARE_MAX_NAME_LENGTH),
    task: summary.task,
    fitness: summary.fitness,
    joints: summary.joints,
    bones: summary.bones,
    muscles: summary.muscles,
    inputCount: summary.inputCount,
    hiddenCount: summary.hiddenCount,
    outputCount: summary.outputCount,
    version: summary.version,
    listedAt,
  };
}

export function parseCatalogEntry(raw: string): CatalogEntry | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const v = parsed as Record<string, unknown>;
  if (
    typeof v.id !== 'string' ||
    !isValidShareId(v.id) ||
    typeof v.name !== 'string' ||
    typeof v.task !== 'string' ||
    typeof v.fitness !== 'number' ||
    !Number.isFinite(v.fitness) ||
    typeof v.joints !== 'number' ||
    typeof v.bones !== 'number' ||
    typeof v.muscles !== 'number' ||
    typeof v.inputCount !== 'number' ||
    typeof v.hiddenCount !== 'number' ||
    typeof v.outputCount !== 'number' ||
    typeof v.version !== 'number' ||
    typeof v.listedAt !== 'number' ||
    !Number.isFinite(v.listedAt)
  ) {
    return null;
  }
  return {
    id: v.id,
    name: String(v.name).slice(0, SHARE_MAX_NAME_LENGTH),
    task: v.task,
    fitness: v.fitness,
    joints: v.joints,
    bones: v.bones,
    muscles: v.muscles,
    inputCount: v.inputCount,
    hiddenCount: v.hiddenCount,
    outputCount: v.outputCount,
    version: v.version,
    listedAt: v.listedAt,
  };
}

/**
 * Accept either legacy raw model JSON, or `{ model, listPublic? }`.
 */
export function parseSharePostBody(raw: string): {
  modelRaw: string;
  listPublic: boolean;
} | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    'model' in (parsed as object)
  ) {
    const wrap = parsed as { model: unknown; listPublic?: unknown };
    if (wrap.model == null) return null;
    const modelRaw =
      typeof wrap.model === 'string'
        ? wrap.model
        : JSON.stringify(wrap.model);
    return {
      modelRaw,
      listPublic: wrap.listPublic === true,
    };
  }
  return { modelRaw: raw, listPublic: false };
}
