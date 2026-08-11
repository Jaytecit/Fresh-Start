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

/** True when Vercel Blob auth is available (OIDC store id and/or RW token). */
function hasBlobAuth(): boolean {
  return Boolean(
    process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN,
  );
}

export function blobPathForShare(id: string): string {
  return `shares/${id}.json`;
}

/**
 * Prefer SDK default auth:
 * 1) OIDC via BLOB_STORE_ID + VERCEL_OIDC_TOKEN on Vercel
 * 2) BLOB_READ_WRITE_TOKEN fallback
 * Only pass an explicit token when the RW token is set and OIDC is not.
 */
function blobAuthOptions(): { token?: string } {
  if (process.env.BLOB_STORE_ID) return {};
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return { token: process.env.BLOB_READ_WRITE_TOKEN };
  }
  return {};
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
  await writeShareFs(localShareDir(), id, json);
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
  return readShareFs(localShareDir(), id);
}
