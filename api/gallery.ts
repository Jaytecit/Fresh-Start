import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_lib/http.js';
import { GALLERY_MAX_ENTRIES } from './_lib/shareLimits.js';
import { listCatalogEntries } from './_lib/store.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const entries = await listCatalogEntries(GALLERY_MAX_ENTRIES);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).json({ entries });
  } catch (err) {
    console.error('[gallery] list failed', err);
    res.status(500).json({
      error:
        'The public creations library could not be loaded. Check your connection and try again.',
    });
  }
}
