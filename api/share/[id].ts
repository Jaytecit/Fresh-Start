import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../lib/http';
import { isValidShareId } from '../lib/shareIds';
import { loadShareJson } from '../lib/store';
import { validateShareBody } from '../lib/validateShare';

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
    res.status(404).json({
      error: 'This shared creature could not be found.',
    });
    return;
  }

  let raw: string | null;
  try {
    raw = await loadShareJson(id);
  } catch (err) {
    console.error('[share] load failed', err);
    res.status(500).json({
      error: 'The creature could not be loaded. Check your connection and try again.',
    });
    return;
  }

  if (!raw) {
    res.status(404).json({
      error: 'This shared creature could not be found.',
    });
    return;
  }

  const validated = validateShareBody(raw);
  if (!validated.ok) {
    const status = validated.code === 'unsupported_version' ? 422 : 400;
    res.status(status).json({
      error:
        validated.code === 'unsupported_version'
          ? 'This creature was created with an incompatible version of Solemn Sandbox.'
          : 'This shared file is not a valid Solemn Sandbox creature.',
    });
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(validated.raw);
}
