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

export type RaceDivisionId = 'upright' | 'grounded' | 'open-frame';

export interface RaceMetrics {
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
  wheels: number;
  aeroArea: number;
}

export interface RaceEligibility {
  divisionId: RaceDivisionId;
  ruleVersion: 1;
  eligible: boolean;
  reasons: string[];
  metrics: RaceMetrics;
}

export interface RaceDivisionDef {
  id: RaceDivisionId;
  name: string;
  ruleVersion: 1;
  description: string;
  evaluate(metrics: RaceMetrics): string[];
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

/** Authoritative, design-derived metrics used by every Race eligibility check. */
export function computeRaceMetrics(design: CreatureDesign): RaceMetrics {
  let totalMass = 0;
  let feet = 0;
  let wheels = 0;

  for (const joint of design.joints) {
    totalMass += jointMass(design, joint);
    if (joint.isFoot) feet++;
    if (joint.isWheel) wheels++;
  }

  let aeroArea = 0;
  for (const bone of design.bones) {
    if (isFeatureEnabled('rigidStruts') && isRigidBoneDef(bone)) continue;
    totalMass += bone.mass ?? DEFAULT_BONE_MASS;
    aeroArea += Math.max(0, bone.aeroArea ?? 0);
  }

  const width = span(design.joints.map((joint) => joint.x));
  const height = span(design.joints.map((joint) => joint.y));

  return {
    totalMass,
    width,
    height,
    coreWidth: width,
    coreHeight: height,
    aspectRatio: height / Math.max(0.25, width),
    joints: design.joints.length,
    bones: design.bones.length,
    muscles: design.muscles.length,
    actuators: countDesignActuatorChannels(design, true),
    feet,
    wheels,
    aeroArea,
  };
}

function commonReasons(
  m: RaceMetrics,
  options: { massMax: number; jointMax: number; allowWheels: boolean; allowAero: boolean },
): string[] {
  const reasons: string[] = [];
  if (!options.allowWheels && m.wheels > 0) {
    reasons.push('Wheels are not permitted in this division.');
  }
  if (!options.allowAero && m.aeroArea > 0.05) {
    reasons.push('Aero surfaces are not permitted in this division.');
  }
  if (m.totalMass > options.massMax) {
    reasons.push(
      `Total effective mass must be at most ${options.massMax.toFixed(0)} (found ${m.totalMass.toFixed(2)}).`,
    );
  }
  if (m.joints < 3 || m.joints > options.jointMax) {
    reasons.push(`Joint count must be 3–${options.jointMax} (found ${m.joints}).`);
  }
  if (m.actuators < 1 || m.actuators > 24) {
    reasons.push(`Actuator count must be 1–24 (found ${m.actuators}).`);
  }
  if (m.width <= 0 || m.height <= 0 || m.width > 10 || m.height > 10) {
    reasons.push('Design width and height must each be greater than 0 and at most 10.');
  }
  return reasons;
}

export const RACE_DIVISIONS: readonly RaceDivisionDef[] = [
  {
    id: 'upright',
    name: 'Upright',
    ruleVersion: 1,
    description: 'Tall two-foot runners — no wheels or aero.',
    evaluate(m) {
      const reasons = commonReasons(m, {
        massMax: 36,
        jointMax: 18,
        allowWheels: false,
        allowAero: false,
      });
      if (m.feet !== 2) {
        reasons.push(`Requires exactly 2 marked feet (found ${m.feet}).`);
      }
      if (m.aspectRatio < 1.05) {
        reasons.push(
          `Height/width ratio must be at least 1.05 (found ${m.aspectRatio.toFixed(2)}).`,
        );
      }
      return reasons;
    },
  },
  {
    id: 'grounded',
    name: 'Grounded',
    ruleVersion: 1,
    description: 'Low, wide runners on three or four feet.',
    evaluate(m) {
      const reasons = commonReasons(m, {
        massMax: 44,
        jointMax: 22,
        allowWheels: false,
        allowAero: false,
      });
      if (m.feet < 3 || m.feet > 4) {
        reasons.push(`Requires 3–4 marked feet (found ${m.feet}).`);
      }
      if (m.aspectRatio > 1.2) {
        reasons.push(
          `Height/width ratio must be at most 1.20 (found ${m.aspectRatio.toFixed(2)}).`,
        );
      }
      return reasons;
    },
  },
  {
    id: 'open-frame',
    name: 'Open Frame',
    ruleVersion: 1,
    description: 'Bounded experimental racers, including wheels and aero.',
    evaluate(m) {
      const reasons = commonReasons(m, {
        massMax: 48,
        jointMax: 24,
        allowWheels: true,
        allowAero: true,
      });
      if (m.feet > 6) {
        reasons.push(`At most 6 marked feet (found ${m.feet}).`);
      }
      return reasons;
    },
  },
] as const;

export function getRaceDivision(id: RaceDivisionId): RaceDivisionDef {
  const division = RACE_DIVISIONS.find((item) => item.id === id);
  if (!division) throw new Error(`Unknown Race division: ${id}`);
  return division;
}

export function raceEligibility(
  design: CreatureDesign,
  divisionId: RaceDivisionId,
): RaceEligibility {
  const division = getRaceDivision(divisionId);
  const metrics = computeRaceMetrics(design);
  const reasons = division.evaluate(metrics);
  return {
    divisionId,
    ruleVersion: division.ruleVersion,
    eligible: reasons.length === 0,
    reasons,
    metrics,
  };
}

export function eligibleRaceDivisions(design: CreatureDesign): RaceEligibility[] {
  return RACE_DIVISIONS.map((division) => raceEligibility(design, division.id)).filter(
    (result) => result.eligible,
  );
}
