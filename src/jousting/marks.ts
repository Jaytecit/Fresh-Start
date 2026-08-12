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

export function designHasExplicitJoustTargets(joints: {
  isHitTarget?: boolean;
}[]): boolean {
  return joints.some((joint) => joint.isHitTarget === true);
}
