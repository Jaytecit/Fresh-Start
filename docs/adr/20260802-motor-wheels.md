# Capability ADR — Motor wheel torque

## Status

Accepted / Implemented

## Goal

Allow brain (or manual) drives to spin designated wheel joints via Rapier torque each fixed step. Wheels are first-class actuators (dedicated MLP outputs), so wheeled carts can Evolve without muscles.

## Rapier design

- Optional `JointDef.isWheel` + `motorStrength?`
- Optional design-level `CreatureDesign.wheelMass` (same clamp range as `footMass`) applied to all `isWheel` joints at spawn / live retune — heavier wheels bias CG for airborne undercarriage pivot
- Optional design-level `CreatureDesign.wheelRadius` applied to all `isWheel` joint **ball colliders** at spawn / live retune (physical radius, not a visual-only scale)
- When a joint is both foot and wheel, `wheelMass` wins over `footMass`
- Brain/manual channel layout: collapsed muscle channels, then one channel per wheel (joint-array order)
- Each physics step after muscle forces: `addTorque` on wheel joint bodies from that wheel’s channel (`extractWheelDrives` → `applyMotorTorques`)
- Torque constants in `physics/constants.ts`: `MOTOR_TORQUE_SCALE`; mass clamps `WHEEL_MASS_*`; radius clamps `WHEEL_RADIUS_*` (default `JOINT_RADIUS`)
- Still uses fixed-dt + resetForces/resetTorques every step
- Collision groups unchanged (wheels are joint balls)
- Evolve / head-to-head require muscles **or** wheels (`designHasActuators`)

## Explicit non-goals

- No wheel-as-separate-body / axle constraint (joint ball + torque is enough for a motor task)

## Smoke gate

`scripts/smoke-tasks.mts` — wheeled design under constant torque moves in +X vs idle; larger `wheelRadius` produces a larger Rapier ball and rests higher.

## Rollback

`featureFlags.motorWheels`; ignore `isWheel` when flag off / task ≠ motor.
