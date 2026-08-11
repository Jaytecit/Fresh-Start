import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isValidShareId } from '../../src/library/shareIds';
import {
  userFacingShareLoadError,
  validateSharePayload,
} from '../../src/library/shareValidate';
import { setCors } from '../lib/http';
import { loadShareJson } from '../lib/store';

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

  const id = String(req.query.id ?? '');
  if (!isValidShareId(id)) {
    res.status(404).json({ error: userFacingShareLoadError('not_found') });
    return;
  }

  let raw: string | null;
  try {
    raw = await loadShareJson(id);
  } catch (err) {
    console.error('[share] load failed', err);
    res.status(500).json({ error: userFacingShareLoadError('network') });
    return;
  }

  if (!raw) {
    res.status(404).json({ error: userFacingShareLoadError('not_found') });
    return;
  }

  const validated = validateSharePayload(raw);
  if (!validated.ok) {
    const status = validated.code === 'unsupported_version' ? 422 : 400;
    res.status(status).json({ error: userFacingShareLoadError(validated.code) });
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(validated.raw);
}
