import { countDesignActuatorChannels } from '../brain/driveGroups';
import {
  isRigidBoneDef,
  type CreatureDesign,
  type JointDef,
} from '../creature/types';
import {
  DEFAULT_BONE_MASS,
  DEFAULT_JOINT_MASS,
  clampFootMass,
  clampWheelMass,
} from '../physics/constants';
import { isFeatureEnabled } from '../port/featureFlags';

export type BoxingDivisionId = 'upright' | 'grounded' | 'open-frame';

export interface BoxingMetrics {
  totalMass: number;
  width: number;
  height: number;
  coreWidth: number;
  coreHeight: number;
  aspectRatio: number;
  joints: number;
  bones: number;
  muscles: number;
  actuators: number;
  feet: number;
  gloves: number;
  targets: number;
  wheels: number;
  aeroArea: number;
  conflictingMarks: number;
}

export interface BoxingEligibility {
  divisionId: BoxingDivisionId;
  ruleVersion: 1;
  eligible: boolean;
  reasons: string[];
  metrics: BoxingMetrics;
}

export interface BoxingDivisionDef {
  id: BoxingDivisionId;
  name: string;
  ruleVersion: 1;
  description: string;
  evaluate(metrics: BoxingMetrics): string[];
}

function jointMass(design: CreatureDesign, joint: JointDef): number {
  if (joint.isWheel && design.wheelMass !== undefined) {
    return clampWheelMass(design.wheelMass);
  }
  if (joint.isFoot && design.footMass !== undefined) {
    return clampFootMass(design.footMass);
  }
  return joint.mass ?? DEFAULT_JOINT_MASS;
}

function span(values: number[]): number {
  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
}

/** Authoritative, design-derived metrics used by every Boxing eligibility check. */
export function computeBoxingMetrics(design: CreatureDesign): BoxingMetrics {
  let totalMass = 0;
  let feet = 0;
  let gloves = 0;
  let targets = 0;
  let wheels = 0;
  let conflictingMarks = 0;
  const coreJoints: JointDef[] = [];

  for (const joint of design.joints) {
    totalMass += jointMass(design, joint);
    if (joint.isFoot) feet++;
    if (joint.isGlove) gloves++;
    if (joint.isHitTarget) targets++;
    if (joint.isWheel) wheels++;
    if (
      (joint.isGlove && joint.isHitTarget) ||
      (joint.isGlove && joint.isFoot)
    ) {
      conflictingMarks++;
    }
    if (!joint.isGlove) coreJoints.push(joint);
  }

  let aeroArea = 0;
  for (const bone of design.bones) {
    if (isFeatureEnabled('rigidStruts') && isRigidBoneDef(bone)) continue;
    totalMass += bone.mass ?? DEFAULT_BONE_MASS;
    aeroArea += Math.max(0, bone.aeroArea ?? 0);
  }

  const width = span(design.joints.map((joint) => joint.x));
  const height = span(design.joints.map((joint) => joint.y));
  const aspectJoints = coreJoints.length > 1 ? coreJoints : design.joints;
  const coreWidth = span(aspectJoints.map((joint) => joint.x));
  const coreHeight = span(aspectJoints.map((joint) => joint.y));

  return {
    totalMass,
    width,
    height,
    coreWidth,
    coreHeight,
    aspectRatio: coreHeight / Math.max(0.25, coreWidth),
    joints: design.joints.length,
    bones: design.bones.length,
    muscles: design.muscles.length,
    actuators: countDesignActuatorChannels(design, true),
    feet,
    gloves,
    targets,
    wheels,
    aeroArea,
    conflictingMarks,
  };
}

function commonReasons(
  m: BoxingMetrics,
  options: { gloveMin: number; gloveMax: number; massMax: number; jointMax: number },
): string[] {
  const reasons: string[] = [];
  if (m.gloves < options.gloveMin || m.gloves > options.gloveMax) {
    reasons.push(`Requires ${options.gloveMin === options.gloveMax ? options.gloveMin : `${options.gloveMin}–${options.gloveMax}`} marked gloves (found ${m.gloves}).`);
  }
  if (m.targets < 1 || m.targets > 4) {
    reasons.push(`Requires 1–4 marked hit targets (found ${m.targets}).`);
  }
  if (m.wheels > 0) reasons.push('Wheels are not permitted.');
  if (m.aeroArea > 0.05) reasons.push('Aero surfaces are not permitted.');
  if (m.conflictingMarks > 0) {
    reasons.push('A glove cannot also be a foot or hit target.');
  }
  if (m.totalMass > options.massMax) {
    reasons.push(`Total effective mass must be at most ${options.massMax.toFixed(0)} (found ${m.totalMass.toFixed(2)}).`);
  }
  if (m.joints < 5 || m.joints > options.jointMax) {
    reasons.push(`Joint count must be 5–${options.jointMax} (found ${m.joints}).`);
  }
  if (m.actuators < 1 || m.actuators > 24) {
    reasons.push(`Actuator count must be 1–24 (found ${m.actuators}).`);
  }
  if (m.width <= 0 || m.height <= 0 || m.width > 7 || m.height > 7) {
    reasons.push('Design width and height must each be greater than 0 and at most 7.');
  }
  return reasons;
}

export const BOXING_DIVISIONS: readonly BoxingDivisionDef[] = [
  {
    id: 'upright',
    name: 'Upright',
    ruleVersion: 1,
    description: 'Tall two-foot fighters with two marked gloves.',
    evaluate(m) {
      const reasons = commonReasons(m, {
        gloveMin: 2,
        gloveMax: 2,
        massMax: 32,
        jointMax: 18,
      });
      if (m.feet !== 2) reasons.push(`Requires exactly 2 marked feet (found ${m.feet}).`);
      if (m.aspectRatio < 1.05) {
        reasons.push(`Core height/width ratio must be at least 1.05 (found ${m.aspectRatio.toFixed(2)}).`);
      }
      return reasons;
    },
  },
  {
    id: 'grounded',
    name: 'Grounded',
    ruleVersion: 1,
    description: 'Low, wide fighters supported by three or four feet.',
    evaluate(m) {
      const reasons = commonReasons(m, {
        gloveMin: 2,
        gloveMax: 2,
        massMax: 40,
        jointMax: 20,
      });
      if (m.feet < 3 || m.feet > 4) {
        reasons.push(`Requires 3–4 marked feet (found ${m.feet}).`);
      }
      if (m.aspectRatio > 1.2) {
        reasons.push(`Core height/width ratio must be at most 1.20 (found ${m.aspectRatio.toFixed(2)}).`);
      }
      return reasons;
    },
  },
  {
    id: 'open-frame',
    name: 'Open Frame',
    ruleVersion: 1,
    description: 'Bounded experimental fighters ranked separately.',
    evaluate(m) {
      const reasons = commonReasons(m, {
        gloveMin: 2,
        gloveMax: 4,
        massMax: 36,
        jointMax: 22,
      });
      if (m.feet < 1 || m.feet > 4) {
        reasons.push(`Requires 1–4 marked feet (found ${m.feet}).`);
      }
      return reasons;
    },
  },
] as const;

export function getBoxingDivision(id: BoxingDivisionId): BoxingDivisionDef {
  const division = BOXING_DIVISIONS.find((item) => item.id === id);
  if (!division) throw new Error(`Unknown Boxing division: ${id}`);
  return division;
}

export function boxingEligibility(
  design: CreatureDesign,
  divisionId: BoxingDivisionId,
): BoxingEligibility {
  const division = getBoxingDivision(divisionId);
  const metrics = computeBoxingMetrics(design);
  const reasons = division.evaluate(metrics);
  return {
    divisionId,
    ruleVersion: division.ruleVersion,
    eligible: reasons.length === 0,
    reasons,
    metrics,
  };
}

export function eligibleBoxingDivisions(design: CreatureDesign): BoxingEligibility[] {
  return BOXING_DIVISIONS.map((division) => boxingEligibility(design, division.id)).filter(
    (result) => result.eligible,
  );
}
