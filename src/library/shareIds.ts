/**
 * C6 — Non-sequential, non-guessable share IDs.
 */
import { SHARE_ID_PATTERN } from './shareLimits';

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** ~12-char URL-safe id from cryptographically strong randomness. */
export function createShareId(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export function isValidShareId(id: unknown): id is string {
  return typeof id === 'string' && SHARE_ID_PATTERN.test(id);
}
