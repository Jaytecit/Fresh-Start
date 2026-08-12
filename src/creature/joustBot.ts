import type { CreatureDesign } from '../creature/types';

/** Bundled Jousting reference body — long lance, two feet, scored torso. */
export const JOUSTBOT: CreatureDesign = {
  name: 'JoustBot',
  joints: [
    { id: 1, x: 0.6, y: 0.2, isFoot: true },
    { id: 2, x: 4.1, y: 0.2, isFoot: true },
    { id: 3, x: 0.9, y: 1.85 },
    { id: 4, x: 3.8, y: 1.85 },
    { id: 5, x: 1.1, y: 3.45 },
    { id: 6, x: 3.6, y: 3.45 },
    { id: 7, x: 2.35, y: 4.85, isHead: true, isHitTarget: true, hitValue: 3 },
    { id: 8, x: 10.4, y: 3.55, isLance: true },
  ],
  bones: [
    { id: 1, startJointId: 1, endJointId: 3 },
    { id: 2, startJointId: 3, endJointId: 5 },
    { id: 3, startJointId: 2, endJointId: 4 },
    { id: 4, startJointId: 4, endJointId: 6 },
    { id: 5, startJointId: 5, endJointId: 6 },
    { id: 6, startJointId: 5, endJointId: 7 },
    { id: 7, startJointId: 6, endJointId: 7 },
    { id: 8, startJointId: 7, endJointId: 8 },
    { id: 9, startJointId: 6, endJointId: 8 },
    { id: 10, startJointId: 1, endJointId: 5 },
    { id: 11, startJointId: 2, endJointId: 6 },
  ],
  muscles: [
    { id: 1, startBoneId: 1, endBoneId: 2, canExpand: true },
    { id: 2, startBoneId: 3, endBoneId: 4, canExpand: true },
    { id: 3, startBoneId: 10, endBoneId: 11, canExpand: true },
    { id: 4, startBoneId: 2, endBoneId: 4, canExpand: true },
    { id: 5, startBoneId: 6, endBoneId: 7, canExpand: true },
    { id: 6, startBoneId: 5, endBoneId: 8, canExpand: true },
    { id: 7, startBoneId: 7, endBoneId: 9, canExpand: true },
    { id: 8, startBoneId: 8, endBoneId: 9, canExpand: true },
  ],
};
