/**
 * C7 — Public creations catalog entry (no weights).
 * Stored at catalog/{id}.json beside shares/{id}.json.
 */

export interface GalleryEntry {
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
  /** ms epoch when listed publicly */
  listedAt: number;
}

export function isGalleryEntry(value: unknown): value is GalleryEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.task === 'string' &&
    typeof v.fitness === 'number' &&
    Number.isFinite(v.fitness) &&
    typeof v.joints === 'number' &&
    typeof v.bones === 'number' &&
    typeof v.muscles === 'number' &&
    typeof v.inputCount === 'number' &&
    typeof v.hiddenCount === 'number' &&
    typeof v.outputCount === 'number' &&
    typeof v.version === 'number' &&
    typeof v.listedAt === 'number' &&
    Number.isFinite(v.listedAt)
  );
}
