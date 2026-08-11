import { head, put } from '@vercel/blob';
import { isValidShareId } from '../../src/library/shareIds';
import {
  readShareFs,
  writeShareFs,
} from '../../src/library/shareStoreFs';
import { join } from 'node:path';

function localShareDir(): string {
  return join(process.cwd(), '.data', 'shares');
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function blobPathForShare(id: string): string {
  return `shares/${id}.json`;
}

export async function storeShareJson(id: string, json: string): Promise<void> {
  if (!isValidShareId(id)) throw new Error('invalid share id');
  if (hasBlobToken()) {
    await put(blobPathForShare(id), json, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return;
  }
  if (process.env.VERCEL) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is required for sharing on Vercel',
    );
  }
  await writeShareFs(localShareDir(), id, json);
}

export async function loadShareJson(id: string): Promise<string | null> {
  if (!isValidShareId(id)) return null;
  if (hasBlobToken()) {
    try {
      const meta = await head(blobPathForShare(id), {
        token: process.env.BLOB_READ_WRITE_TOKEN,
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
  return readShareFs(localShareDir(), id);
}
