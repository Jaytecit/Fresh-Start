/**
 * C6 — Client helpers for creating and loading public shares.
 */
import { isValidShareId } from './shareIds';
import {
  userFacingShareLoadError,
  validateSharePayload,
  type ShareValidateErrorCode,
} from './shareValidate';

export type CreateShareResult =
  | { ok: true; id: string; url: string }
  | { ok: false; error: string };

export type FetchShareResult =
  | { ok: true; raw: string }
  | {
      ok: false;
      code: ShareValidateErrorCode | 'not_found' | 'network';
      error: string;
    };

export function sharePagePath(id: string): string {
  return `/share/${id}`;
}

export function shareOpenAppPath(id: string): string {
  return `/?share=${encodeURIComponent(id)}`;
}

export function absoluteShareUrl(id: string, origin = window.location.origin): string {
  return `${origin.replace(/\/$/, '')}${sharePagePath(id)}`;
}

export async function createShare(modelJson: string): Promise<CreateShareResult> {
  const validated = validateSharePayload(modelJson);
  if (!validated.ok) {
    return { ok: false, error: 'The creature could not be shared.' };
  }
  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: validated.raw,
    });
    if (!res.ok) {
      let message = 'The creature could not be shared.';
      try {
        const body = (await res.json()) as { error?: string };
        if (typeof body.error === 'string' && body.error.trim()) {
          message = body.error;
        }
      } catch {
        /* keep default */
      }
      return { ok: false, error: message };
    }
    const body = (await res.json()) as { id?: string; url?: string };
    if (typeof body.id !== 'string' || !isValidShareId(body.id)) {
      return { ok: false, error: 'The creature could not be shared.' };
    }
    const url =
      typeof body.url === 'string' && body.url
        ? body.url
        : absoluteShareUrl(body.id);
    return { ok: true, id: body.id, url };
  } catch (err) {
    console.error('[share] create failed', err);
    return { ok: false, error: 'The creature could not be shared.' };
  }
}

export async function fetchShare(id: string): Promise<FetchShareResult> {
  if (!isValidShareId(id)) {
    return {
      ok: false,
      code: 'not_found',
      error: userFacingShareLoadError('not_found'),
    };
  }
  try {
    const res = await fetch(`/api/share/${encodeURIComponent(id)}`);
    if (res.status === 404) {
      return {
        ok: false,
        code: 'not_found',
        error: userFacingShareLoadError('not_found'),
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        code: 'network',
        error: userFacingShareLoadError('network'),
      };
    }
    const raw = await res.text();
    const validated = validateSharePayload(raw);
    if (!validated.ok) {
      return {
        ok: false,
        code: validated.code,
        error: userFacingShareLoadError(validated.code),
      };
    }
    return { ok: true, raw: validated.raw };
  } catch (err) {
    console.error('[share] fetch failed', err);
    return {
      ok: false,
      code: 'network',
      error: userFacingShareLoadError('network'),
    };
  }
}
