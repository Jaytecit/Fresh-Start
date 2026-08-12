import {
  cloneAppearance,
  type AppearanceRig,
} from '../appearance/types';

export interface JointDef {
  id: number;
  x: number;
  y: number;
  mass?: number;
  /** Marked foot for lift/contact scoring. */
  isFoot?: boolean;
  /** Marked head / designed highest point for upright scoring. */
  isHead?: boolean;
  /** Boxing strike point; only scores against an opponent target probe. */
  isGlove?: boolean;
  /** L2 — Jousting lance tip; `isGlove` also counts as a lance. */
  isLance?: boolean;
  /** Boxing body target; never acts as match health. */
  isHitTarget?: boolean;
  /** Base points for this target before power / accuracy bonuses. */
  hitValue?: number;
  /** Motor/wheeled joint — dedicated brain/manual torque channel. */
  isWheel?: boolean;
  motorStrength?: number;
}

/** Structural aero part kind. Omit / none = legacy area-only forces. */
export type AeroType = 'wing' | 'glider' | 'parachute';

export interface BoneDef {
  id: number;
  startJointId: number;
  endJointId: number;
  mass?: number;
  /**
   * Rigid strut: Rapier fixed joint between joint balls, no capsule body.
   * Cannot host muscles or aero. Omit / false = hinged bone (default).
   */
  rigid?: boolean;
  /** Aero surface area scale; force tag. */
  aeroArea?: number;
  /** Structural aero part type. Requires aeroArea > 0 to act. */
  aeroType?: AeroType;
}

/** True when the bone is authored as a solid strut (ignores feature flag). */
export function isRigidBoneDef(bone: Pick<BoneDef, 'rigid'>): boolean {
  return bone.rigid === true;
}

export interface MuscleDef {
  id: number;
  startBoneId: number;
  endBoneId: number;
  /** Max active force multiplier; defaults to MUSCLE_MAX_FORCE. */
  strength?: number;
  canExpand?: boolean;
  /** Shared brain channel id; siblings reuse one output. */
  driveGroup?: number;
}

export interface CreatureDesign {
  name: string;
  joints: JointDef[];
  bones: BoneDef[];
  muscles: MuscleDef[];
  appearance?: AppearanceRig;
  /**
   * Mass for joints marked `isFoot` (weighted feet).
   * Applied in every mode at spawn; omit → DEFAULT_JOINT_MASS / joint.mass.
   */
  footMass?: number;
  /**
   * Mass for joints marked `isWheel` (weighted wheels).
   * Applied in every mode at spawn; omit → DEFAULT_JOINT_MASS / joint.mass.
   * Wins over `footMass` when a joint is both foot and wheel.
   */
  wheelMass?: number;
}

export function nextId(items: { id: number }[]): number {
  let max = 0;
  for (const item of items) max = Math.max(max, item.id);
  return max + 1;
}

export function cloneDesign(design: CreatureDesign): CreatureDesign {
  return {
    name: design.name,
    joints: design.joints.map((j) => ({ ...j })),
    bones: design.bones.map((b) => ({ ...b })),
    muscles: design.muscles.map((m) => ({ ...m })),
    appearance: cloneAppearance(design.appearance),
    ...(design.footMass !== undefined ? { footMass: design.footMass } : {}),
    ...(design.wheelMass !== undefined ? { wheelMass: design.wheelMass } : {}),
  };
}
