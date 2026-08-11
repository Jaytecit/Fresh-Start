/**
 * C7 — Local filesystem catalog store (Vite dev + smoke tests).
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  isGalleryEntry,
  type GalleryEntry,
} from './galleryTypes';
import { GALLERY_MAX_ENTRIES } from './shareLimits';
import { isValidShareId } from './shareIds';

export function catalogFilePath(dir: string, id: string): string {
  return join(dir, `${id}.json`);
}

export async function ensureCatalogDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function writeCatalogFs(
  dir: string,
  entry: GalleryEntry,
): Promise<void> {
  if (!isValidShareId(entry.id)) throw new Error('invalid share id');
  await ensureCatalogDir(dir);
  await writeFile(
    catalogFilePath(dir, entry.id),
    JSON.stringify(entry),
    'utf8',
  );
}

export async function readCatalogFs(
  dir: string,
  id: string,
): Promise<GalleryEntry | null> {
  if (!isValidShareId(id)) return null;
  try {
    const raw = await readFile(catalogFilePath(dir, id), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return isGalleryEntry(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function listCatalogFs(
  dir: string,
  limit = GALLERY_MAX_ENTRIES,
): Promise<GalleryEntry[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const entries: GalleryEntry[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const id = name.slice(0, -'.json'.length);
    const entry = await readCatalogFs(dir, id);
    if (entry) entries.push(entry);
  }
  entries.sort((a, b) => b.listedAt - a.listedAt);
  return entries.slice(0, Math.max(0, limit));
}

export function galleryEntryFromShareSummary(
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
): GalleryEntry {
  return {
    id,
    name: summary.name,
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
