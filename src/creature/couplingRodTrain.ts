import type { BoneDef, CreatureDesign, JointDef, MuscleDef } from './types';

/**
 * Muscle-driven two-wheel locomotive with quartered coupling rods.
 *
 * Why this geometry (vs a 180° “bicycle pedal” pair):
 * - Cranks are 90° apart, so one rod still has a moment arm when the other
 *   is at top/bottom dead center.
 * - Spawn phase is 45°, so neither rod starts at a dead center.
 * - Rods are rigid; muscles pull on hinge crank-spokes (rigid bones cannot
 *   host muscles).
 * - Rim joints are heavy (flywheel) and are not feet (foot damping would
 *   stall spin). Hubs are axles, not motor wheels.
 */
const SPOKES = 8;
const RADIUS = 1.12;
const HUB_Y = 1.52;
const AXLE = 3.55;
const PHASE = Math.PI / 4;
const RIM_MASS = 3.2;
const HUB_MASS = 1.8;
const MUSCLE_STRENGTH = 840;

function rimJoint(
  id: number,
  hubX: number,
  index: number,
): JointDef {
  const angle = PHASE + index * ((Math.PI * 2) / SPOKES);
  return {
    id,
    x: hubX + RADIUS * Math.cos(angle),
    y: HUB_Y + RADIUS * Math.sin(angle),
    mass: RIM_MASS,
  };
}

function buildQuarterRodTrain(): CreatureDesign {
  const joints: JointDef[] = [
    { id: 1, x: -AXLE, y: HUB_Y, mass: HUB_MASS },
    { id: 2, x: AXLE, y: HUB_Y, mass: HUB_MASS },
  ];
  for (let i = 0; i < SPOKES; i++) joints.push(rimJoint(10 + i, -AXLE, i));
  for (let i = 0; i < SPOKES; i++) joints.push(rimJoint(20 + i, AXLE, i));
  joints.push(
    { id: 30, x: -2.6, y: 4.55, mass: 0.95 },
    { id: 31, x: 2.6, y: 4.55, mass: 0.95 },
    { id: 32, x: 0, y: 4.55, mass: 1.05 },
    { id: 33, x: -3.2, y: 5.65, mass: 0.7 },
    { id: 34, x: 3.2, y: 5.65, mass: 0.7, isHead: true },
    { id: 35, x: 0, y: 5.65, mass: 0.75 },
    { id: 36, x: 0, y: 3.05, mass: 1.15 },
  );

  const bones: BoneDef[] = [];
  // Hinge spokes — wheel can spin around the axle; crank spokes host muscles.
  for (let i = 0; i < SPOKES; i++) {
    bones.push({ id: 101 + i, startJointId: 1, endJointId: 10 + i });
    bones.push({ id: 201 + i, startJointId: 2, endJointId: 20 + i });
  }
  // Rigid rims.
  for (let i = 0; i < SPOKES; i++) {
    const n = (i + 1) % SPOKES;
    bones.push({
      id: 111 + i,
      startJointId: 10 + i,
      endJointId: 10 + n,
      rigid: true,
    });
    bones.push({
      id: 211 + i,
      startJointId: 20 + i,
      endJointId: 20 + n,
      rigid: true,
    });
  }
  // Coupling rods at 90° (rim 0 = 45°, rim 2 = 135°).
  bones.push(
    { id: 301, startJointId: 10, endJointId: 20, rigid: true },
    { id: 302, startJointId: 12, endJointId: 22, rigid: true },
  );
  // Rigid cab + axles. Hinge 501/502 are the “feet” on the two bars.
  bones.push(
    { id: 401, startJointId: 30, endJointId: 1, rigid: true },
    { id: 402, startJointId: 31, endJointId: 2, rigid: true },
    { id: 403, startJointId: 36, endJointId: 1, rigid: true },
    { id: 404, startJointId: 36, endJointId: 2, rigid: true },
    { id: 405, startJointId: 32, endJointId: 36, rigid: true },
    { id: 410, startJointId: 33, endJointId: 35, rigid: true },
    { id: 411, startJointId: 35, endJointId: 34, rigid: true },
    { id: 412, startJointId: 33, endJointId: 34, rigid: true },
    { id: 413, startJointId: 33, endJointId: 30, rigid: true },
    { id: 414, startJointId: 34, endJointId: 31, rigid: true },
    { id: 415, startJointId: 35, endJointId: 32, rigid: true },
    { id: 416, startJointId: 30, endJointId: 36, rigid: true },
    { id: 417, startJointId: 31, endJointId: 36, rigid: true },
    { id: 501, startJointId: 30, endJointId: 32 },
    { id: 502, startJointId: 32, endJointId: 31 },
  );

  const muscles: MuscleDef[] = [
    // G1 — “left foot” on bar A (45° crank).
    {
      id: 1,
      startBoneId: 501,
      endBoneId: 101,
      canExpand: true,
      strength: MUSCLE_STRENGTH,
      driveGroup: 1,
    },
    {
      id: 2,
      startBoneId: 501,
      endBoneId: 201,
      canExpand: true,
      strength: MUSCLE_STRENGTH,
      driveGroup: 1,
    },
    // G2 — “right foot” on bar B (135° crank).
    {
      id: 3,
      startBoneId: 502,
      endBoneId: 103,
      canExpand: true,
      strength: MUSCLE_STRENGTH,
      driveGroup: 2,
    },
    {
      id: 4,
      startBoneId: 502,
      endBoneId: 203,
      canExpand: true,
      strength: MUSCLE_STRENGTH,
      driveGroup: 2,
    },
    // G3 / G4 — cross pulls so a timed gait can nudge through remaining dead spots.
    {
      id: 5,
      startBoneId: 501,
      endBoneId: 103,
      canExpand: true,
      strength: MUSCLE_STRENGTH,
      driveGroup: 3,
    },
    {
      id: 6,
      startBoneId: 502,
      endBoneId: 101,
      canExpand: true,
      strength: MUSCLE_STRENGTH,
      driveGroup: 3,
    },
    {
      id: 7,
      startBoneId: 502,
      endBoneId: 201,
      canExpand: true,
      strength: MUSCLE_STRENGTH,
      driveGroup: 4,
    },
    {
      id: 8,
      startBoneId: 501,
      endBoneId: 203,
      canExpand: true,
      strength: MUSCLE_STRENGTH,
      driveGroup: 4,
    },
  ];

  return { name: 'Quarter-Rod Train', joints, bones, muscles };
}

export const QUARTER_ROD_TRAIN: CreatureDesign = buildQuarterRodTrain();
