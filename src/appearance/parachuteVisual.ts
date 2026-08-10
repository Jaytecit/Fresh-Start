/**
 * Cosmetic parachute canopy morph (G10 visual deepen).
 * Tunables only — physics inflation lives on RuntimeBone.chuteInflation.
 */

/** World-up bulge scale as a fraction of bone halfLength at full inflation. */
export const PARA_VIS_BULGE = 0.85;

/** Extra stroke width multiplier at full inflation (1 = no widen). */
export const PARA_VIS_WIDTH_SCALE = 1.55;

/** Editor preview inflation when there is no live chuteInflation. */
export const PARA_VIS_EDITOR_INFLATION = 0.55;

/** Live / editor fill for parachute aero bones. */
export const PARA_VIS_FILL = '#d4a06a';
