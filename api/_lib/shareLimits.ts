/** Keep aligned with src/library/shareLimits.ts */
export const SHARE_MAX_JSON_BYTES = 256 * 1024;
export const SHARE_MAX_NAME_LENGTH = 80;
export const SHARE_MAX_JOINTS = 128;
export const SHARE_MAX_BONES = 192;
export const SHARE_MAX_MUSCLES = 256;
export const SHARE_MAX_INPUT_COUNT = 64;
export const SHARE_MAX_HIDDEN_COUNT = 128;
export const SHARE_MAX_OUTPUT_COUNT = 64;
export const SHARE_MAX_WEIGHT_COUNT = 32_768;
export const SHARE_MAX_WEIGHTS_B64_LENGTH = SHARE_MAX_WEIGHT_COUNT * 4 * 2;
export const SHARE_SUPPORTED_MODEL_VERSION = 1;
export const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{8,16}$/;
export const SHARE_RATE_LIMIT_WINDOW_MS = 60_000;
export const SHARE_RATE_LIMIT_MAX_POSTS = 10;
/** C7 — Max public gallery entries returned by GET /api/gallery. */
export const GALLERY_MAX_ENTRIES = 100;
