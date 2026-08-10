/** Tunables for H9 cosmetic cloth (not Rapier / not physics/constants). */

/** Default cape grid (finer than v1). */
export const CLOTH_CAPE_COLS = 10;
export const CLOTH_CAPE_ROWS = 14;

/** Fallback cell size when shoulder span is tiny. */
export const CLOTH_CAPE_MIN_CELL = 0.1;

/** Extra rows of drape below the pin line (in cells). */
export const CLOTH_CAPE_DROP_CELLS = 12;

/** World-space gravity on free particles (design Y-up) at weight=1. */
export const CLOTH_GRAVITY = -22;

/** Default garment weight (gravity scale). */
export const CLOTH_DEFAULT_WEIGHT = 1.55;

/** Velocity damping per second (Verlet). */
export const CLOTH_DAMPING = 3.2;

/** Base constraint solver iterations per step (scaled by stiffness). */
export const CLOTH_CONSTRAINT_ITERS = 8;

/** Max clamped frame dt for cloth (seconds). */
export const CLOTH_MAX_DT = 1 / 30;

/** Default fill color. */
export const CLOTH_DEFAULT_COLOR = 'rgba(120, 72, 160, 0.72)';

/** Stroke accent over mesh. */
export const CLOTH_STROKE_COLOR = 'rgba(40, 28, 55, 0.45)';

/** Authoring limits. */
export const CLOTH_MAX_COLS = 28;
export const CLOTH_MAX_ROWS = 32;
export const CLOTH_MIN_CELL = 0.05;
export const CLOTH_MAX_CELL = 1.5;

/** Material-draw covering: fineness 1…5 → target cells across longest span. */
export const CLOTH_COVER_CELLS_BY_FINENESS = [6, 10, 14, 18, 24] as const;

export const CLOTH_DEFAULT_FINENESS = 3;
export const CLOTH_DEFAULT_STIFFNESS = 1.15;
