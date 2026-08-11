/**
 * C6 — Local filesystem share store (Vite dev + smoke tests).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isValidShareId } from './shareIds';

export function shareFilePath(dir: string, id: string): string {
  return join(dir, `${id}.json`);
}

export async function ensureShareDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function writeShareFs(
  dir: string,
  id: string,
  json: string,
): Promise<void> {
  if (!isValidShareId(id)) throw new Error('invalid share id');
  await ensureShareDir(dir);
  await writeFile(shareFilePath(dir, id), json, 'utf8');
}

export async function readShareFs(
  dir: string,
  id: string,
): Promise<string | null> {
  if (!isValidShareId(id)) return null;
  try {
    return await readFile(shareFilePath(dir, id), 'utf8');
  } catch {
    return null;
  }
}
