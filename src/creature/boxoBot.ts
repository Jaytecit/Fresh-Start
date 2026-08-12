import type { CreatureDesign } from './types';

/**
 * Bundled Boxing default fighter and upright sparring partner — BoxoBot.
 */
export const BOXOBOT: CreatureDesign = {
  "name": "BoxoBot",
  "joints": [
    {
      "id": 1,
      "x": -4,
      "y": 1.5
    },
    {
      "id": 3,
      "x": -4,
      "y": 2.5
    },
    {
      "id": 5,
      "x": -4,
      "y": 5
    },
    {
      "id": 6,
      "x": -1,
      "y": 5,
      "isGlove": true
    },
    {
      "id": 7,
      "x": -3,
      "y": 1
    },
    {
      "id": 8,
      "x": -3,
      "y": 0.5
    },
    {
      "id": 9,
      "x": -1.5,
      "y": 5,
      "isGlove": true
    },
    {
      "id": 10,
      "x": -2.5,
      "y": 4
    },
    {
      "id": 11,
      "x": -2,
      "y": 4
    },
    {
      "id": 12,
      "x": -4,
      "y": 7,
      "isHead": true,
      "isHitTarget": true,
      "hitValue": 3
    },
    {
      "id": 13,
      "x": -5,
      "y": 1
    },
    {
      "id": 14,
      "x": -5,
      "y": 0.5
    },
    {
      "id": 15,
      "x": -2,
      "y": 0.5,
      "isFoot": true
    },
    {
      "id": 16,
      "x": -6,
      "y": 0.5,
      "isFoot": true
    }
  ],
  "bones": [
    {
      "id": 1,
      "startJointId": 3,
      "endJointId": 1,
      "rigid": true
    },
    {
      "id": 2,
      "startJointId": 1,
      "endJointId": 8,
      "rigid": true
    },
    {
      "id": 3,
      "startJointId": 8,
      "endJointId": 7,
      "rigid": true
    },
    {
      "id": 4,
      "startJointId": 7,
      "endJointId": 3,
      "rigid": true
    },
    {
      "id": 5,
      "startJointId": 5,
      "endJointId": 3,
      "rigid": true
    },
    {
      "id": 6,
      "startJointId": 5,
      "endJointId": 10
    },
    {
      "id": 7,
      "startJointId": 10,
      "endJointId": 9
    },
    {
      "id": 8,
      "startJointId": 5,
      "endJointId": 11
    },
    {
      "id": 9,
      "startJointId": 11,
      "endJointId": 6
    },
    {
      "id": 10,
      "startJointId": 12,
      "endJointId": 5,
      "rigid": true
    },
    {
      "id": 11,
      "startJointId": 13,
      "endJointId": 3,
      "rigid": true
    },
    {
      "id": 12,
      "startJointId": 13,
      "endJointId": 14,
      "rigid": true
    },
    {
      "id": 13,
      "startJointId": 14,
      "endJointId": 1,
      "rigid": true
    },
    {
      "id": 14,
      "startJointId": 12,
      "endJointId": 3
    },
    {
      "id": 16,
      "startJointId": 14,
      "endJointId": 16
    },
    {
      "id": 17,
      "startJointId": 8,
      "endJointId": 15
    },
    {
      "id": 18,
      "startJointId": 13,
      "endJointId": 16,
      "rigid": true
    },
    {
      "id": 19,
      "startJointId": 7,
      "endJointId": 15,
      "rigid": true
    }
  ],
  "muscles": [
    {
      "id": 1,
      "startBoneId": 6,
      "endBoneId": 7,
      "canExpand": true
    },
    {
      "id": 2,
      "startBoneId": 8,
      "endBoneId": 9,
      "canExpand": true
    },
    {
      "id": 3,
      "startBoneId": 8,
      "endBoneId": 14,
      "canExpand": true
    },
    {
      "id": 4,
      "startBoneId": 6,
      "endBoneId": 14,
      "canExpand": true
    },
    {
      "id": 5,
      "startBoneId": 14,
      "endBoneId": 16,
      "canExpand": true
    },
    {
      "id": 6,
      "startBoneId": 14,
      "endBoneId": 17,
      "canExpand": true
    }
  ],
  "appearance": {
    "version": 1,
    "googlyEyes": [],
    "bodyParts": [],
    "cloth": []
  },
  "footMass": 3.75
};
