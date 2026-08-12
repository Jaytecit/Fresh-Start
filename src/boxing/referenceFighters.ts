import { BOXOBOT } from '../creature/boxoBot';
import type { CreatureDesign } from '../creature/types';

export { BOXOBOT };

export const UPRIGHT_FIGHTER: CreatureDesign = {
  name: 'Upright Fighter',
  joints: [
    { id: 1, x: -0.5, y: 0.4, mass: 0.7, isFoot: true },
    { id: 2, x: 0.5, y: 0.4, mass: 0.7, isFoot: true },
    { id: 3, x: -0.42, y: 1.35, mass: 1.1 },
    { id: 4, x: 0.42, y: 1.35, mass: 1.1 },
    { id: 5, x: 0, y: 2.35, mass: 1.1, isHead: true, isHitTarget: true, hitValue: 2 },
    { id: 6, x: -1.25, y: 1.82, mass: 0.55, isGlove: true },
    { id: 7, x: 1.25, y: 1.82, mass: 0.55, isGlove: true },
  ],
  bones: [
    { id: 1, startJointId: 1, endJointId: 3, mass: 0.7 },
    { id: 2, startJointId: 2, endJointId: 4, mass: 0.7 },
    { id: 3, startJointId: 3, endJointId: 4, mass: 1.0 },
    { id: 4, startJointId: 3, endJointId: 5, mass: 0.8 },
    { id: 5, startJointId: 4, endJointId: 5, mass: 0.8 },
    { id: 6, startJointId: 3, endJointId: 6, mass: 0.45 },
    { id: 7, startJointId: 4, endJointId: 7, mass: 0.45 },
  ],
  muscles: [
    { id: 1, startBoneId: 1, endBoneId: 3, canExpand: true, strength: 520, driveGroup: 1 },
    { id: 2, startBoneId: 2, endBoneId: 3, canExpand: true, strength: 520, driveGroup: 2 },
    { id: 3, startBoneId: 4, endBoneId: 6, canExpand: true, strength: 430, driveGroup: 3 },
    { id: 4, startBoneId: 5, endBoneId: 7, canExpand: true, strength: 430, driveGroup: 4 },
    { id: 5, startBoneId: 6, endBoneId: 7, canExpand: true, strength: 300, driveGroup: 5 },
  ],
};

export const GROUNDED_FIGHTER: CreatureDesign = {
  name: 'Grounded Fighter',
  joints: [
    { id: 1, x: -1.5, y: 0.4, mass: 0.65, isFoot: true },
    { id: 2, x: -0.5, y: 0.4, mass: 0.65, isFoot: true },
    { id: 3, x: 0.5, y: 0.4, mass: 0.65, isFoot: true },
    { id: 4, x: 1.5, y: 0.4, mass: 0.65, isFoot: true },
    { id: 5, x: -1.05, y: 1.0, mass: 1.2 },
    { id: 6, x: 1.05, y: 1.0, mass: 1.2 },
    { id: 7, x: 0, y: 1.35, mass: 1.4, isHead: true, isHitTarget: true, hitValue: 2 },
    { id: 8, x: -1.75, y: 1.25, mass: 0.55, isGlove: true },
    { id: 9, x: 1.75, y: 1.25, mass: 0.55, isGlove: true },
  ],
  bones: [
    { id: 1, startJointId: 1, endJointId: 5 },
    { id: 2, startJointId: 2, endJointId: 5 },
    { id: 3, startJointId: 3, endJointId: 6 },
    { id: 4, startJointId: 4, endJointId: 6 },
    { id: 5, startJointId: 5, endJointId: 6, mass: 1.2 },
    { id: 6, startJointId: 5, endJointId: 7 },
    { id: 7, startJointId: 6, endJointId: 7 },
    { id: 8, startJointId: 5, endJointId: 8, mass: 0.5 },
    { id: 9, startJointId: 6, endJointId: 9, mass: 0.5 },
  ],
  muscles: [
    { id: 1, startBoneId: 1, endBoneId: 5, canExpand: true, strength: 480, driveGroup: 1 },
    { id: 2, startBoneId: 4, endBoneId: 5, canExpand: true, strength: 480, driveGroup: 2 },
    { id: 3, startBoneId: 6, endBoneId: 8, canExpand: true, strength: 420, driveGroup: 3 },
    { id: 4, startBoneId: 7, endBoneId: 9, canExpand: true, strength: 420, driveGroup: 4 },
  ],
};

export const OPEN_FRAME_FIGHTER: CreatureDesign = {
  name: 'Open Frame Fighter',
  joints: [
    { id: 1, x: -0.9, y: 0.4, isFoot: true },
    { id: 2, x: 0.9, y: 0.4, isFoot: true },
    { id: 3, x: -1.15, y: 1.35 },
    { id: 4, x: 1.15, y: 1.35 },
    { id: 5, x: 0, y: 1.8, isHead: true, isHitTarget: true, hitValue: 2 },
    { id: 6, x: -1.85, y: 1.75, mass: 0.5, isGlove: true },
    { id: 7, x: 1.85, y: 1.75, mass: 0.5, isGlove: true },
    { id: 8, x: 0, y: 2.7, mass: 0.45, isGlove: true },
  ],
  bones: [
    { id: 1, startJointId: 1, endJointId: 3 },
    { id: 2, startJointId: 2, endJointId: 4 },
    { id: 3, startJointId: 3, endJointId: 4 },
    { id: 4, startJointId: 3, endJointId: 5 },
    { id: 5, startJointId: 4, endJointId: 5 },
    { id: 6, startJointId: 3, endJointId: 6 },
    { id: 7, startJointId: 4, endJointId: 7 },
    { id: 8, startJointId: 5, endJointId: 8 },
  ],
  muscles: [
    { id: 1, startBoneId: 1, endBoneId: 3, canExpand: true, strength: 460, driveGroup: 1 },
    { id: 2, startBoneId: 2, endBoneId: 3, canExpand: true, strength: 460, driveGroup: 2 },
    { id: 3, startBoneId: 4, endBoneId: 6, canExpand: true, strength: 400, driveGroup: 3 },
    { id: 4, startBoneId: 5, endBoneId: 7, canExpand: true, strength: 400, driveGroup: 4 },
    { id: 5, startBoneId: 4, endBoneId: 8, canExpand: true, strength: 340, driveGroup: 5 },
  ],
};

function scaledReference(
  design: CreatureDesign,
  name: string,
  sizeScale: number,
  massScale: number,
): CreatureDesign {
  return {
    ...design,
    name,
    joints: design.joints.map((joint) => ({
      ...joint,
      x: joint.x * sizeScale,
      y: joint.y * sizeScale,
      mass: (joint.mass ?? 1) * massScale,
    })),
    bones: design.bones.map((bone) => ({
      ...bone,
      mass: (bone.mass ?? 1) * massScale,
    })),
    muscles: design.muscles.map((muscle) => ({ ...muscle })),
  };
}

export const BOXING_REFERENCE_FIGHTERS: readonly CreatureDesign[] = [
  BOXOBOT,
  scaledReference(UPRIGHT_FIGHTER, 'Light Upright Fighter', 0.85, 0.75),
  UPRIGHT_FIGHTER,
  scaledReference(UPRIGHT_FIGHTER, 'Large Upright Fighter', 1.25, 1.35),
  scaledReference(GROUNDED_FIGHTER, 'Light Grounded Fighter', 0.85, 0.75),
  GROUNDED_FIGHTER,
  scaledReference(GROUNDED_FIGHTER, 'Large Grounded Fighter', 1.2, 1.3),
  OPEN_FRAME_FIGHTER,
] as const;
