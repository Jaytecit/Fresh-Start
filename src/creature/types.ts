import {
  cloneAppearance,
  type AppearanceRig,
} from '../appearance/types';

export interface JointDef {
  id: number;
  x: number;
  y: number;
  mass?: number;
  /** Marked foot for lift/contact scoring (C1.1). */
  isFoot?: boolean;
  /** Marked head / designed highest point for upright scoring. */
  isHead?: boolean;
  /** Motor/wheeled joint (E6.5) — dedicated brain/manual torque channel. */
  isWheel?: boolean;
  motorStrength?: number;
}

/** G10 structural aero part kind. Omit / none = legacy G9 area-only forces. */
export type AeroType = 'wing' | 'glider' | 'parachute';

export interface BoneDef {
  id: number;
  startJointId: number;
  endJointId: number;
  mass?: number;
  /**
   * G8 — rigid strut: Rapier fixed joint between joint balls, no capsule body.
   * Cannot host muscles or aero. Omit / false = hinged bone (default).
   */
  rigid?: boolean;
  /** Aero surface area scale (E6.6 / G10); force tag. */
  aeroArea?: number;
  /** Structural aero part type (G10). Requires aeroArea > 0 to act. */
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
  /** Shared brain channel id; siblings reuse one output (C1.2). */
  driveGroup?: number;
}

export interface CreatureDesign {
  name: string;
  joints: JointDef[];
  bones: BoneDef[];
  muscles: MuscleDef[];
  appearance?: AppearanceRig;
  /**
   * Mass for joints marked `isFoot` (C1.1 weighted feet).
   * Applied in every mode at spawn; omit → DEFAULT_JOINT_MASS / joint.mass.
   */
  footMass?: number;
  /**
   * Mass for joints marked `isWheel` (E6.5 weighted wheels).
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
