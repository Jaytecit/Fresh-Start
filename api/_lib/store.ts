import { head, list, put } from '@vercel/blob';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  blobPathForCatalog,
  parseCatalogEntry,
  type CatalogEntry,
} from './catalog.js';
import { isValidShareId } from './shareIds.js';
import { GALLERY_MAX_ENTRIES } from './shareLimits.js';

function localShareDir(): string {
  return join(process.cwd(), '.data', 'shares');
}

function localCatalogDir(): string {
  return join(process.cwd(), '.data', 'catalog');
}

function hasBlobAuth(): boolean {
  return Boolean(
    process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN,
  );
}

export function blobPathForShare(id: string): string {
  return `shares/${id}.json`;
}

function blobAuthOptions(): { token?: string } {
  if (process.env.BLOB_STORE_ID) return {};
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return { token: process.env.BLOB_READ_WRITE_TOKEN };
  }
  return {};
}

async function writeShareFs(id: string, json: string): Promise<void> {
  const dir = localShareDir();
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${id}.json`), json, 'utf8');
}

async function readShareFs(id: string): Promise<string | null> {
  try {
    return await readFile(join(localShareDir(), `${id}.json`), 'utf8');
  } catch {
    return null;
  }
}

async function writeCatalogFs(entry: CatalogEntry): Promise<void> {
  const dir = localCatalogDir();
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${entry.id}.json`),
    JSON.stringify(entry),
    'utf8',
  );
}

async function listCatalogFs(limit: number): Promise<CatalogEntry[]> {
  let names: string[];
  try {
    names = await readdir(localCatalogDir());
  } catch {
    return [];
  }
  const entries: CatalogEntry[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    try {
      const raw = await readFile(join(localCatalogDir(), name), 'utf8');
      const entry = parseCatalogEntry(raw);
      if (entry) entries.push(entry);
    } catch {
      /* skip bad file */
    }
  }
  entries.sort((a, b) => b.listedAt - a.listedAt);
  return entries.slice(0, limit);
}

export async function storeShareJson(id: string, json: string): Promise<void> {
  if (!isValidShareId(id)) throw new Error('invalid share id');
  if (hasBlobAuth()) {
    await put(blobPathForShare(id), json, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      ...blobAuthOptions(),
    });
    return;
  }
  if (process.env.VERCEL) {
    throw new Error(
      'Vercel Blob is not connected (need BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN)',
    );
  }
  await writeShareFs(id, json);
}

export async function loadShareJson(id: string): Promise<string | null> {
  if (!isValidShareId(id)) return null;
  if (hasBlobAuth()) {
    try {
      const meta = await head(blobPathForShare(id), {
        ...blobAuthOptions(),
      });
      const res = await fetch(meta.url);
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }
  if (process.env.VERCEL) {
    return null;
  }
  return readShareFs(id);
}

export async function storeCatalogEntry(entry: CatalogEntry): Promise<void> {
  if (!isValidShareId(entry.id)) throw new Error('invalid share id');
  const json = JSON.stringify(entry);
  if (hasBlobAuth()) {
    await put(blobPathForCatalog(entry.id), json, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      ...blobAuthOptions(),
    });
    return;
  }
  if (process.env.VERCEL) {
    throw new Error(
      'Vercel Blob is not connected (need BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN)',
    );
  }
  await writeCatalogFs(entry);
}

export async function listCatalogEntries(
  limit = GALLERY_MAX_ENTRIES,
): Promise<CatalogEntry[]> {
  const capped = Math.min(Math.max(1, limit), GALLERY_MAX_ENTRIES);
  if (hasBlobAuth()) {
    const { blobs } = await list({
      prefix: 'catalog/',
      limit: Math.min(1000, capped * 3),
      ...blobAuthOptions(),
    });
    const sorted = [...blobs].sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
    const entries: CatalogEntry[] = [];
    for (const blob of sorted) {
      if (entries.length >= capped) break;
      try {
        const res = await fetch(blob.url);
        if (!res.ok) continue;
        const entry = parseCatalogEntry(await res.text());
        if (entry) entries.push(entry);
      } catch {
        /* skip */
      }
    }
    entries.sort((a, b) => b.listedAt - a.listedAt);
    return entries.slice(0, capped);
  }
  if (process.env.VERCEL) {
    return [];
  }
  return listCatalogFs(capped);
}
