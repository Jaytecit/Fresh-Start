/**
 * Local share API for `npm run dev` / `vite preview` (filesystem store).
 * Production uses Vercel serverless routes + Blob.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { createShareId, isValidShareId } from '../src/library/shareIds.ts';
import { SHARE_MAX_JSON_BYTES } from '../src/library/shareLimits.ts';
import {
  renderSharePageHtml,
  sharePageStateFromModel,
} from '../src/library/sharePageHtml.ts';
import {
  readShareFs,
  writeShareFs,
} from '../src/library/shareStoreFs.ts';
import { validateSharePayload } from '../src/library/shareValidate.ts';

function shareDir(root: string): string {
  return join(root, '.data', 'shares');
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function originFromReq(req: IncomingMessage): string {
  const host = req.headers.host || 'localhost:3001';
  const local =
    host.includes('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('0.0.0.0') ||
    host.startsWith('[::1]');
  const proto = local ? 'http' : 'https';
  return `${proto}://${host}`;
}

export function solemnShareApiPlugin(projectRoot: string): Plugin {
  const dir = shareDir(projectRoot);

  const mount = (middlewares: {
    use: (fn: (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => void) => void;
  }) => {
    middlewares.use(async (req, res, next) => {
      try {
        if (!req.url) return next();
        const url = new URL(req.url, 'http://localhost');
        const { pathname } = url;

        if (pathname === '/api/share' && req.method === 'POST') {
          const raw = await readBody(req);
          if (Buffer.byteLength(raw, 'utf8') > SHARE_MAX_JSON_BYTES) {
            return sendJson(res, 413, {
              error: 'The creature could not be shared.',
            });
          }
          const validated = validateSharePayload(raw);
          if (!validated.ok) {
            return sendJson(res, 400, {
              error: 'The creature could not be shared.',
            });
          }
          const id = createShareId();
          await writeShareFs(dir, id, validated.raw);
          const origin = originFromReq(req);
          return sendJson(res, 201, {
            id,
            url: `${origin}/share/${id}`,
          });
        }

        const apiMatch = pathname.match(/^\/api\/share\/([A-Za-z0-9_-]+)$/);
        if (apiMatch && req.method === 'GET') {
          const id = apiMatch[1]!;
          if (!isValidShareId(id)) {
            return sendJson(res, 404, {
              error: 'This shared creature could not be found.',
            });
          }
          const raw = await readShareFs(dir, id);
          if (!raw) {
            return sendJson(res, 404, {
              error: 'This shared creature could not be found.',
            });
          }
          const validated = validateSharePayload(raw);
          if (!validated.ok) {
            return sendJson(res, 400, {
              error: 'This shared file is not a valid Solemn Sandbox creature.',
            });
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(validated.raw);
          return;
        }

        const pageMatch = pathname.match(/^\/share\/([A-Za-z0-9_-]+)$/);
        if (pageMatch && (req.method === 'GET' || req.method === 'HEAD')) {
          const id = pageMatch[1]!;
          const origin = originFromReq(req);
          if (!isValidShareId(id)) {
            const html = renderSharePageHtml({
              origin,
              id,
              state: { kind: 'not_found' },
            });
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
            return;
          }
          const raw = await readShareFs(dir, id);
          if (!raw) {
            const html = renderSharePageHtml({
              origin,
              id,
              state: { kind: 'not_found' },
            });
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
            return;
          }
          const validated = validateSharePayload(raw);
          if (!validated.ok) {
            const html = renderSharePageHtml({
              origin,
              id,
              state:
                validated.code === 'unsupported_version'
                  ? { kind: 'unsupported_version' }
                  : { kind: 'invalid' },
            });
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
            return;
          }
          const html = renderSharePageHtml({
            origin,
            id,
            state: sharePageStateFromModel(id, validated.model),
          });
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
          return;
        }

        return next();
      } catch (err) {
        console.error('[vite-share-api]', err);
        res.statusCode = 500;
        res.end('Share API error');
      }
    });
  };

  return {
    name: 'solemn-share-api',
    configureServer(server) {
      mount(server.middlewares);
    },
    configurePreviewServer(server) {
      mount(server.middlewares);
    },
  };
}
