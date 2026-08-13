/** L2 — lance / target helpers. `isGlove` counts as a lance for the inspiration creature. */

export function jointIsLance(joint: {
  isLance?: boolean;
  isGlove?: boolean;
}): boolean {
  return joint.isLance === true || joint.isGlove === true;
}

/**
 * Hit-targets always score. If the design has no hit-targets, marked heads
 * count as joust targets.
 */
export function jointIsJoustTarget(
  joint: { isHitTarget?: boolean; isHead?: boolean },
  hasExplicitTargets: boolean,
): boolean {
  if (joint.isHitTarget === true) return true;
  return !hasExplicitTargets && joint.isHead === true;
}

/** Rider head: marked Head that is also a Hit Target. */
export function jointIsRiderHead(joint: {
  isHead?: boolean;
  isHitTarget?: boolean;
}): boolean {
  return joint.isHead === true && joint.isHitTarget === true;
}

/**
 * True when a rider-head joint sits at the creature's highest authored Y
 * (lance included — the rider must be the high point of the whole mount).
 */
export function riderHeadIsHighest(
  joints: readonly { y: number; isHead?: boolean; isHitTarget?: boolean }[],
): boolean {
  if (joints.length === 0) return false;
  let peakY = -Infinity;
  let riderPeakY = -Infinity;
  for (const joint of joints) {
    if (joint.y > peakY) peakY = joint.y;
    if (jointIsRiderHead(joint) && joint.y > riderPeakY) riderPeakY = joint.y;
  }
  return riderPeakY > -Infinity && riderPeakY >= peakY;
}

export function designHasExplicitJoustTargets(joints: {
  isHitTarget?: boolean;
}[]): boolean {
  return joints.some((joint) => joint.isHitTarget === true);
}
