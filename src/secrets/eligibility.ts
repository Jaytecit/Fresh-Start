/**
 * Morphology eligibility from design traits only.
 */
import type { CreatureDesign } from '../creature/types';
import { jointIsJoustTarget, jointIsLance } from '../jousting/marks';
import type { SecretGoalDefinition } from './definitions';

export interface MorphologyTraits {
  footCount: number;
  wheelCount: number;
  headCount: number;
  gloveCount: number;
  hitTargetCount: number;
  lanceCount: number;
  joustTargetCount: number;
  hasAero: boolean;
  totalAeroArea: number;
}

export function morphologyTraits(design: CreatureDesign): MorphologyTraits {
  let footCount = 0;
  let wheelCount = 0;
  let headCount = 0;
  let gloveCount = 0;
  let hitTargetCount = 0;
  let lanceCount = 0;
  let joustTargetCount = 0;
  for (const j of design.joints) {
    if (j.isFoot) footCount++;
    if (j.isWheel) wheelCount++;
    if (j.isHead) headCount++;
    if (j.isGlove) gloveCount++;
    if (j.isHitTarget) hitTargetCount++;
    if (jointIsLance(j)) lanceCount++;
  }
  const explicitTargets = design.joints.some((j) => j.isHitTarget === true);
  for (const j of design.joints) {
    if (jointIsJoustTarget(j, explicitTargets)) joustTargetCount++;
  }
  let totalAeroArea = 0;
  for (const b of design.bones) {
    totalAeroArea += b.aeroArea ?? 0;
  }
  return {
    footCount,
    wheelCount,
    headCount,
    gloveCount,
    hitTargetCount,
    lanceCount,
    joustTargetCount,
    hasAero: totalAeroArea > 0.05,
    totalAeroArea,
  };
}

export function secretEligible(
  design: CreatureDesign,
  def: SecretGoalDefinition,
): boolean {
  const traits = morphologyTraits(design);
  if (def.requiresWheels && traits.wheelCount < 1) return false;
  if (def.requiresAero && !traits.hasAero) return false;
  return true;
}
