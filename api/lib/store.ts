import { head, put } from '@vercel/blob';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isValidShareId } from './shareIds';

function localShareDir(): string {
  return join(process.cwd(), '.data', 'shares');
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
