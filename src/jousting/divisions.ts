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
import {
  designHasExplicitJoustTargets,
  jointIsJoustTarget,
  jointIsLance,
  jointIsRiderHead,
  riderHeadIsHighest,
} from './marks';

export const JOUSTING_RULE_VERSION = 1 as const;

export type JoustingDivisionId = 'mounted' | 'grounded' | 'open-frame';

export interface JoustingMetrics {
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
  lances: number;
  targets: number;
  riderHeads: number;
  riderIsHighest: boolean;
  wheels: number;
  aeroArea: number;
  conflictingMarks: number;
}

export interface JoustingEligibility {
  divisionId: JoustingDivisionId;
  ruleVersion: 1;
  eligible: boolean;
  reasons: string[];
  metrics: JoustingMetrics;
}

export interface JoustingDivisionDef {
  id: JoustingDivisionId;
  name: string;
  ruleVersion: 1;
  description: string;
  evaluate(metrics: JoustingMetrics): string[];
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

/** Authoritative, design-derived metrics used by every Jousting eligibility check. */
export function computeJoustingMetrics(design: CreatureDesign): JoustingMetrics {
  const explicitTargets = designHasExplicitJoustTargets(design.joints);
  let totalMass = 0;
  let feet = 0;
  let lances = 0;
  let targets = 0;
  let riderHeads = 0;
  let wheels = 0;
  let conflictingMarks = 0;
  const coreJoints: JointDef[] = [];

  for (const joint of design.joints) {
    totalMass += jointMass(design, joint);
    if (joint.isFoot) feet++;
    if (joint.isWheel) wheels++;
    const lance = jointIsLance(joint);
    const target = jointIsJoustTarget(joint, explicitTargets);
    if (lance) lances++;
    if (target) targets++;
    if (jointIsRiderHead(joint)) riderHeads++;
    if (lance && (target || joint.isFoot || jointIsRiderHead(joint))) {
      conflictingMarks++;
    }
    if (!lance) coreJoints.push(joint);
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
    lances,
    targets,
    riderHeads,
    riderIsHighest: riderHeadIsHighest(design.joints),
    wheels,
    aeroArea,
    conflictingMarks,
  };
}

function commonReasons(
  m: JoustingMetrics,
  options: { lanceMin: number; lanceMax: number; massMax: number; jointMax: number },
): string[] {
  const reasons: string[] = [];
  if (m.lances < options.lanceMin || m.lances > options.lanceMax) {
    reasons.push(
      `Requires ${options.lanceMin === options.lanceMax ? options.lanceMin : `${options.lanceMin}–${options.lanceMax}`} marked lance${options.lanceMax === 1 ? '' : 's'} (found ${m.lances}).`,
    );
  }
  if (m.riderHeads < 1) {
    reasons.push(
      `Requires a rider: mark a Head that is also a Hit Target (found ${m.riderHeads}).`,
    );
  }
  if (m.riderHeads >= 1 && !m.riderIsHighest) {
    reasons.push(
      "The rider's head (Hit Target) must be the highest point on the creature.",
    );
  }
  if (m.wheels > 0) reasons.push('Wheels are not permitted.');
  if (m.aeroArea > 0.05) reasons.push('Aero surfaces are not permitted.');
  if (m.conflictingMarks > 0) {
    reasons.push('A lance cannot also be a foot, scored target, or rider head.');
  }
  if (m.totalMass > options.massMax) {
    reasons.push(
      `Total effective mass must be at most ${options.massMax.toFixed(0)} (found ${m.totalMass.toFixed(2)}).`,
    );
  }
  if (m.joints < 5 || m.joints > options.jointMax) {
    reasons.push(`Joint count must be 5–${options.jointMax} (found ${m.joints}).`);
  }
  if (m.actuators < 1 || m.actuators > 24) {
    reasons.push(`Actuator count must be 1–24 (found ${m.actuators}).`);
  }
  if (m.coreWidth <= 0 || m.coreHeight <= 0) {
    reasons.push('Core body width and height must be greater than 0.');
  }
  if (m.coreWidth > 8 || m.coreHeight > 8) {
    reasons.push(
      'Core body width and height (excluding the lance) must each be at most 8.',
    );
  }
  if (m.width > 18) {
    reasons.push(
      `Overall width including the lance must be at most 18 (found ${m.width.toFixed(2)}).`,
    );
  }
  return reasons;
}

export const JOUSTING_DIVISIONS: readonly JoustingDivisionDef[] = [
  {
    id: 'mounted',
    name: 'Mounted',
    ruleVersion: 1,
    description:
      'Tall two-foot chargers with a rider head (Hit Target) at the highest point.',
    evaluate(m) {
      const reasons = commonReasons(m, {
        lanceMin: 1,
        lanceMax: 1,
        massMax: 48,
        jointMax: 24,
      });
      if (m.feet !== 2) {
        reasons.push(`Requires exactly 2 marked feet (found ${m.feet}).`);
      }
      if (m.aspectRatio < 1.05) {
        reasons.push(
          `Core height/width ratio must be at least 1.05 (found ${m.aspectRatio.toFixed(2)}).`,
        );
      }
      return reasons;
    },
  },
  {
    id: 'grounded',
    name: 'Grounded',
    ruleVersion: 1,
    description:
      'Low, wide chargers on three or four feet, still with a high rider head.',
    evaluate(m) {
      const reasons = commonReasons(m, {
        lanceMin: 1,
        lanceMax: 1,
        massMax: 56,
        jointMax: 26,
      });
      if (m.feet < 3 || m.feet > 4) {
        reasons.push(`Requires 3–4 marked feet (found ${m.feet}).`);
      }
      if (m.aspectRatio > 1.2) {
        reasons.push(
          `Core height/width ratio must be at most 1.20 (found ${m.aspectRatio.toFixed(2)}).`,
        );
      }
      return reasons;
    },
  },
  {
    id: 'open-frame',
    name: 'Open Frame',
    ruleVersion: 1,
    description: 'Bounded experimental jousters ranked separately.',
    evaluate(m) {
      const reasons = commonReasons(m, {
        lanceMin: 1,
        lanceMax: 2,
        massMax: 52,
        jointMax: 26,
      });
      if (m.feet < 1 || m.feet > 4) {
        reasons.push(`Requires 1–4 marked feet (found ${m.feet}).`);
      }
      return reasons;
    },
  },
] as const;

export function getJoustingDivision(id: JoustingDivisionId): JoustingDivisionDef {
  const division = JOUSTING_DIVISIONS.find((item) => item.id === id);
  if (!division) throw new Error(`Unknown Jousting division: ${id}`);
  return division;
}

export function joustingEligibility(
  design: CreatureDesign,
  divisionId: JoustingDivisionId = 'mounted',
): JoustingEligibility {
  const division = getJoustingDivision(divisionId);
  const metrics = computeJoustingMetrics(design);
  const reasons = division.evaluate(metrics);
  return {
    divisionId,
    ruleVersion: division.ruleVersion,
    eligible: reasons.length === 0,
    reasons,
    metrics,
  };
}

export function eligibleJoustingDivisions(
  design: CreatureDesign,
): JoustingEligibility[] {
  return JOUSTING_DIVISIONS.map((division) =>
    joustingEligibility(design, division.id),
  ).filter((result) => result.eligible);
}
