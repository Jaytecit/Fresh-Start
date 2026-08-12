import {
  encodeGroups,
  type SpawnedCreature,
} from '../physics/spawn';
import type { JoustOwner } from './scoring';

/** Jouster A solid membership bit (joints/bones of owner 0). */
export const JOUST_A_SOLID = 0b1000_0000;
/** Jouster B solid membership bit (joints/bones of owner 1). */
export const JOUST_B_SOLID = 0b1_0000_0000;

const JOINT_BIT = 0b0001;
const BONE_BIT = 0b0010;
const WORLD_BIT = 0b0100;

export function joustSolidGroups(
  owner: JoustOwner,
  kind: 'joint' | 'bone',
): number {
  const part = kind === 'joint' ? JOINT_BIT : BONE_BIT;
  const own = owner === 0 ? JOUST_A_SOLID : JOUST_B_SOLID;
  const opponent = owner === 0 ? JOUST_B_SOLID : JOUST_A_SOLID;
  return encodeGroups(part | own, WORLD_BIT | opponent);
}

/**
 * Enable A↔B solid solving on an already spawned Jousting match creature.
 * Skips sensor probe colliders; leaves ordinary spawn paths untouched.
 */
export function enableJoustOpponentContact(
  creature: SpawnedCreature,
  owner: JoustOwner,
): void {
  const jointGroups = joustSolidGroups(owner, 'joint');
  const boneGroups = joustSolidGroups(owner, 'bone');
  for (const joint of creature.joints) {
    for (let i = 0; i < joint.body.numColliders(); i++) {
      const collider = joint.body.collider(i);
      if (collider.isSensor()) continue;
      collider.setCollisionGroups(jointGroups);
      collider.setSolverGroups(jointGroups);
    }
  }
  for (const bone of creature.bones) {
    for (let i = 0; i < bone.body.numColliders(); i++) {
      const collider = bone.body.collider(i);
      if (collider.isSensor()) continue;
      collider.setCollisionGroups(boneGroups);
      collider.setSolverGroups(boneGroups);
    }
  }
}
