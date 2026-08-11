import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requestOrigin } from '../_lib/http.js';
import { isValidShareId } from '../_lib/shareIds.js';
import {
  renderSharePageHtml,
  type SharePageState,
} from '../_lib/sharePageHtml.js';
import { loadShareJson } from '../_lib/store.js';
import { validateShareBody } from '../_lib/validateShare.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }

  const id = String(req.query.id ?? '');
  const origin = requestOrigin(req);

  let state: SharePageState;
  if (!isValidShareId(id)) {
    state = { kind: 'not_found' };
  } else {
    let raw: string | null = null;
    try {
      raw = await loadShareJson(id);
    } catch (err) {
      console.error('[share-page] load failed', err);
      raw = null;
    }
    if (!raw) {
      state = { kind: 'not_found' };
    } else {
      const validated = validateShareBody(raw);
      if (!validated.ok) {
        state =
          validated.code === 'unsupported_version'
            ? { kind: 'unsupported_version' }
            : { kind: 'invalid' };
      } else {
        state = {
          kind: 'ok',
          summary: validated.summary,
          preview: validated.preview,
        };
      }
    }
  }

  const html = renderSharePageHtml({
    origin,
    id: isValidShareId(id) ? id : 'invalid',
    state,
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(state.kind === 'ok' ? 200 : 404).send(html);
}
