import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  SHARE_RATE_LIMIT_MAX_POSTS,
  SHARE_RATE_LIMIT_WINDOW_MS,
} from '../../src/library/shareLimits';

const postHits = new Map<string, number[]>();

export function setCors(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export function clientIp(req: VercelRequest): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) {
    return xf.split(',')[0]!.trim();
  }
  if (Array.isArray(xf) && xf[0]) return xf[0].split(',')[0]!.trim();
  return req.socket?.remoteAddress || 'unknown';
}

/** Best-effort per-IP POST throttle (per serverless isolate). */
export function allowSharePost(ip: string): boolean {
  const now = Date.now();
  const prev = postHits.get(ip) ?? [];
  const recent = prev.filter((t) => now - t < SHARE_RATE_LIMIT_WINDOW_MS);
  if (recent.length >= SHARE_RATE_LIMIT_MAX_POSTS) {
    postHits.set(ip, recent);
    return false;
  }
  recent.push(now);
  postHits.set(ip, recent);
  return true;
}

export function requestOrigin(req: VercelRequest): string {
  const proto = String(req.headers['x-forwarded-proto'] || 'https');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  if (host) return `${proto}://${host}`;
  return 'https://solemn-sandbox.vercel.app';
}

export function readRawBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === 'string') return Promise.resolve(req.body);
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(JSON.stringify(req.body));
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
