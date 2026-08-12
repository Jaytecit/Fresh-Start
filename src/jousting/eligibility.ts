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
} from './marks';

export const JOUSTING_RULE_VERSION = 1 as const;

export interface JoustingMetrics {
  totalMass: number;
  width: number;
  height: number;
  coreWidth: number;
  coreHeight: number;
  joints: number;
  bones: number;
  muscles: number;
  actuators: number;
  feet: number;
  lances: number;
  targets: number;
  wheels: number;
  aeroArea: number;
  conflictingMarks: number;
}

export interface JoustingEligibility {
  ruleVersion: 1;
  eligible: boolean;
  reasons: string[];
  metrics: JoustingMetrics;
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

export function computeJoustingMetrics(design: CreatureDesign): JoustingMetrics {
  const explicitTargets = designHasExplicitJoustTargets(design.joints);
  let totalMass = 0;
  let feet = 0;
  let lances = 0;
  let targets = 0;
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
    if (lance && (target || joint.isFoot)) conflictingMarks++;
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
    joints: design.joints.length,
    bones: design.bones.length,
    muscles: design.muscles.length,
    actuators: countDesignActuatorChannels(design, true),
    feet,
    lances,
    targets,
    wheels,
    aeroArea,
    conflictingMarks,
  };
}

export function joustingEligibility(design: CreatureDesign): JoustingEligibility {
  const metrics = computeJoustingMetrics(design);
  const reasons: string[] = [];
  if (metrics.lances < 1) {
    reasons.push(`Requires at least 1 marked lance (found ${metrics.lances}).`);
  }
  if (metrics.targets < 1) {
    reasons.push(
      `Requires at least 1 hit target or head (found ${metrics.targets}).`,
    );
  }
  if (metrics.wheels > 0) reasons.push('Wheels are not permitted.');
  if (metrics.aeroArea > 0.05) reasons.push('Aero surfaces are not permitted.');
  if (metrics.conflictingMarks > 0) {
    reasons.push('A lance cannot also be a foot or scored target.');
  }
  if (metrics.totalMass > 48) {
    reasons.push(
      `Total effective mass must be at most 48 (found ${metrics.totalMass.toFixed(2)}).`,
    );
  }
  if (metrics.joints < 5 || metrics.joints > 24) {
    reasons.push(`Joint count must be 5–24 (found ${metrics.joints}).`);
  }
  if (metrics.actuators < 1 || metrics.actuators > 24) {
    reasons.push(`Actuator count must be 1–24 (found ${metrics.actuators}).`);
  }
  if (metrics.coreWidth <= 0 || metrics.coreHeight <= 0) {
    reasons.push('Core body width and height must be greater than 0.');
  }
  if (metrics.coreWidth > 8 || metrics.coreHeight > 8) {
    reasons.push('Core body width and height (excluding the lance) must each be at most 8.');
  }
  if (metrics.width > 18) {
    reasons.push(`Overall width including the lance must be at most 18 (found ${metrics.width.toFixed(2)}).`);
  }
  return {
    ruleVersion: JOUSTING_RULE_VERSION,
    eligible: reasons.length === 0,
    reasons,
    metrics,
  };
}
