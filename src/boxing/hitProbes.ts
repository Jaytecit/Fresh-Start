import {
  BOXING_GLOVE_PROBE_RADIUS,
  BOXING_HIT_COOLDOWN,
  BOXING_TARGET_PROBE_RADIUS,
} from '../physics/constants';
import {
  encodeGroups,
  type RuntimeJoint,
  type SpawnedCreature,
} from '../physics/spawn';
import { RAPIER } from '../physics/world';
import {
  scoreBoxingHit,
  type BoxingHitEvent,
  type BoxingOwner,
} from './scoring';

type ProbeRole = 'glove' | 'target';

interface BoxingProbe {
  owner: BoxingOwner;
  role: ProbeRole;
  joint: RuntimeJoint;
  collider: RAPIER.Collider;
  radius: number;
  targetValue: number;
}

export interface BoxingProbeSet {
  owner: BoxingOwner;
  gloves: BoxingProbe[];
  targets: BoxingProbe[];
  byHandle: Map<number, BoxingProbe>;
}

export interface BoxingHitTracker {
  activePairs: Set<string>;
  lastHitAt: Map<string, number>;
  attempts: [number, number];
}

const OWNER_A_GLOVE = 0b0000_1000;
const OWNER_A_TARGET = 0b0001_0000;
const OWNER_B_GLOVE = 0b0010_0000;
const OWNER_B_TARGET = 0b0100_0000;

function probeBits(owner: BoxingOwner, role: ProbeRole): {
  membership: number;
  filter: number;
} {
  if (owner === 0 && role === 'glove') {
    return { membership: OWNER_A_GLOVE, filter: OWNER_B_TARGET };
  }
  if (owner === 0) {
    return { membership: OWNER_A_TARGET, filter: OWNER_B_GLOVE };
  }
  if (role === 'glove') {
    return { membership: OWNER_B_GLOVE, filter: OWNER_A_TARGET };
  }
  return { membership: OWNER_B_TARGET, filter: OWNER_A_GLOVE };
}

function createProbe(
  world: RAPIER.World,
  owner: BoxingOwner,
  role: ProbeRole,
  joint: RuntimeJoint,
): BoxingProbe {
  const radius =
    role === 'glove'
      ? BOXING_GLOVE_PROBE_RADIUS
      : BOXING_TARGET_PROBE_RADIUS;
  const bits = probeBits(owner, role);
  const collider = world.createCollider(
    RAPIER.ColliderDesc.ball(radius)
      .setSensor(true)
      .setMass(0)
      .setCollisionGroups(encodeGroups(bits.membership, bits.filter))
      .setSolverGroups(encodeGroups(bits.membership, bits.filter)),
    joint.body,
  );
  return {
    owner,
    role,
    joint,
    collider,
    radius,
    targetValue: role === 'target' ? (joint.hitValue ?? 1) : 0,
  };
}

/** Add zero-mass, non-solving probes to an already spawned match creature. */
export function createBoxingProbes(
  world: RAPIER.World,
  creature: SpawnedCreature,
  owner: BoxingOwner,
): BoxingProbeSet {
  const gloves: BoxingProbe[] = [];
  const targets: BoxingProbe[] = [];
  const byHandle = new Map<number, BoxingProbe>();
  for (const joint of creature.joints) {
    if (joint.isGlove) {
      const probe = createProbe(world, owner, 'glove', joint);
      gloves.push(probe);
      byHandle.set(probe.collider.handle, probe);
    }
    if (joint.isHitTarget) {
      const probe = createProbe(world, owner, 'target', joint);
      targets.push(probe);
      byHandle.set(probe.collider.handle, probe);
    }
  }
  return { owner, gloves, targets, byHandle };
}

export function createBoxingHitTracker(): BoxingHitTracker {
  return { activePairs: new Set(), lastHitAt: new Map(), attempts: [0, 0] };
}

function pairKey(glove: BoxingProbe, target: BoxingProbe): string {
  return `${glove.owner}:${glove.joint.id}>${target.owner}:${target.joint.id}`;
}

/**
 * Consume sensor intersections after a fixed world step.
 * Same-owner rejection intentionally duplicates collision-group isolation.
 */
export function detectBoxingHits(
  world: RAPIER.World,
  sets: readonly [BoxingProbeSet, BoxingProbeSet],
  tracker: BoxingHitTracker,
  time: number,
): BoxingHitEvent[] {
  const allByHandle = new Map<number, BoxingProbe>();
  for (const set of sets) {
    for (const [handle, probe] of set.byHandle) allByHandle.set(handle, probe);
  }

  const currentPairs = new Set<string>();
  const events: BoxingHitEvent[] = [];
  for (const set of sets) {
    for (const glove of set.gloves) {
      world.intersectionPairsWith(glove.collider, (otherCollider) => {
        const target = allByHandle.get(otherCollider.handle);
        if (!target || target.role !== 'target') return;
        if (target.owner === glove.owner) return;

        const key = pairKey(glove, target);
        currentPairs.add(key);
        if (tracker.activePairs.has(key)) return;
        tracker.attempts[glove.owner]++;
        const lastHitAt = tracker.lastHitAt.get(key) ?? -Infinity;
        if (time - lastHitAt < BOXING_HIT_COOLDOWN) return;

        const glovePos = glove.joint.body.translation();
        const targetPos = target.joint.body.translation();
        const dx = targetPos.x - glovePos.x;
        const dy = targetPos.y - glovePos.y;
        const distance = Math.hypot(dx, dy);
        const invDistance = distance > 1e-6 ? 1 / distance : 0;
        const axisX = dx * invDistance;
        const axisY = dy * invDistance;
        const gloveVelocity = glove.joint.body.linvel();
        const targetVelocity = target.joint.body.linvel();
        const relativeVelocityX = gloveVelocity.x - targetVelocity.x;
        const relativeVelocityY = gloveVelocity.y - targetVelocity.y;
        const closingSpeed =
          relativeVelocityX * axisX + relativeVelocityY * axisY;
        const event = scoreBoxingHit({
          attacker: glove.owner,
          defender: target.owner,
          gloveJointId: glove.joint.id,
          targetJointId: target.joint.id,
          targetValue: target.targetValue,
          targetIsHead: target.joint.isHead === true,
          gloveMass: glove.joint.body.mass(),
          closingSpeed,
          relativeSpeed: Math.hypot(relativeVelocityX, relativeVelocityY),
          centreDistance: distance,
          combinedRadius: glove.radius + target.radius,
          time,
        });
        if (!event) return;
        tracker.lastHitAt.set(key, time);
        events.push(event);
      });
    }
  }
  tracker.activePairs = currentPairs;
  return events;
}
