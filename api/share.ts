import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  catalogEntryFromSummary,
  parseSharePostBody,
} from './_lib/catalog.js';
import {
  allowSharePost,
  clientIp,
  readRawBody,
  requestOrigin,
  setCors,
} from './_lib/http.js';
import { createShareId } from './_lib/shareIds.js';
import { SHARE_MAX_JSON_BYTES } from './_lib/shareLimits.js';
import { storeCatalogEntry, storeShareJson } from './_lib/store.js';
import { validateShareBody } from './_lib/validateShare.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!allowSharePost(clientIp(req))) {
    res.status(429).json({ error: 'The creature could not be shared.' });
    return;
  }

  let raw: string;
  try {
    raw = await readRawBody(req);
  } catch (err) {
    console.error('[share] body read failed', err);
    res.status(400).json({ error: 'The creature could not be shared.' });
    return;
  }

  if (!raw || Buffer.byteLength(raw, 'utf8') > SHARE_MAX_JSON_BYTES + 512) {
    res.status(413).json({ error: 'The creature could not be shared.' });
    return;
  }

  const parsed = parseSharePostBody(raw);
  if (!parsed) {
    res.status(400).json({ error: 'The creature could not be shared.' });
    return;
  }

  if (Buffer.byteLength(parsed.modelRaw, 'utf8') > SHARE_MAX_JSON_BYTES) {
    res.status(413).json({ error: 'The creature could not be shared.' });
    return;
  }

  const validated = validateShareBody(parsed.modelRaw);
  if (!validated.ok) {
    res.status(400).json({ error: 'The creature could not be shared.' });
    return;
  }

  const id = createShareId();
  try {
    await storeShareJson(id, validated.raw);
    if (parsed.listPublic) {
      await storeCatalogEntry(
        catalogEntryFromSummary(id, validated.summary),
      );
    }
  } catch (err) {
    console.error('[share] store failed', err);
    res.status(500).json({ error: 'The creature could not be shared.' });
    return;
  }

  const origin = requestOrigin(req);
  res.status(201).json({
    id,
    url: `${origin}/share/${id}`,
    listed: parsed.listPublic,
  });
}
