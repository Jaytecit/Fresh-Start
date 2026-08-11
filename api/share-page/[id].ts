import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isValidShareId } from '../../src/library/shareIds';
import type { ModelExport } from '../../src/library/jsonIO';
import {
  renderSharePageHtml,
  sharePageStateFromModel,
  type SharePageState,
} from '../../src/library/sharePageHtml';
import { validateSharePayload } from '../../src/library/shareValidate';
import { requestOrigin } from '../lib/http';
import { loadShareJson } from '../lib/store';

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
      const validated = validateSharePayload(raw);
      if (!validated.ok) {
        state =
          validated.code === 'unsupported_version'
            ? { kind: 'unsupported_version' }
            : { kind: 'invalid' };
      } else {
        state = sharePageStateFromModel(id, validated.model as ModelExport);
      }
    }
  }

  const html = renderSharePageHtml({ origin, id: isValidShareId(id) ? id : 'invalid', state });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(state.kind === 'ok' ? 200 : 404).send(html);
}
