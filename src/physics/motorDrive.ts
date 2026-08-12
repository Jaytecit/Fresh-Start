/**
 * Motor wheel torque — Rapier addTorque on tagged joints.
 */
import { MOTOR_TORQUE_SCALE } from './constants';
import type { SpawnedCreature } from './spawn';

/**
 * Apply torque to wheel joints.
 * `drives[i]` ∈ [-1,1] is the dedicated brain/manual channel for wheel i
 * (joint-array order among `isWheel` joints). Missing entries = 0.
 */
export function applyMotorTorques(
  creature: SpawnedCreature,
  drives: ArrayLike<number>,
): void {
  const wheels = creature.joints.filter((j) => j.isWheel);
  if (wheels.length === 0) return;
  for (let i = 0; i < wheels.length; i++) {
    const drive = drives[i] ?? 0;
    const strength = wheels[i].motorStrength ?? MOTOR_TORQUE_SCALE;
    const torque = -drive * strength; // negative = roll to +X with typical orientation
    wheels[i].body.wakeUp();
    wheels[i].body.addTorque(torque, true);
  }
}
