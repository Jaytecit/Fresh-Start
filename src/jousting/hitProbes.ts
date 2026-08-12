import {
  JOUST_HIT_COOLDOWN,
  JOUST_LANCE_PROBE_RADIUS,
  JOUST_TARGET_PROBE_RADIUS,
} from '../physics/constants';
import {
  encodeGroups,
  type RuntimeJoint,
  type SpawnedCreature,
} from '../physics/spawn';
import { RAPIER } from '../physics/world';
import {
  designHasExplicitJoustTargets,
  jointIsJoustTarget,
  jointIsLance,
} from './marks';
import {
  scoreJoustHit,
  type JoustHitEvent,
  type JoustOwner,
} from './scoring';

type ProbeRole = 'lance' | 'target';

interface JoustProbe {
  owner: JoustOwner;
  role: ProbeRole;
  joint: RuntimeJoint;
  collider: RAPIER.Collider;
  radius: number;
  targetValue: number;
}

export interface JoustProbeSet {
  owner: JoustOwner;
  lances: JoustProbe[];
  targets: JoustProbe[];
  byHandle: Map<number, JoustProbe>;
}

export interface JoustHitTracker {
  activePairs: Set<string>;
  lastHitAt: Map<string, number>;
  attempts: [number, number];
}

const OWNER_A_LANCE = 0b0000_1000;
const OWNER_A_TARGET = 0b0001_0000;
const OWNER_B_LANCE = 0b0010_0000;
const OWNER_B_TARGET = 0b0100_0000;

function probeBits(owner: JoustOwner, role: ProbeRole): {
  membership: number;
  filter: number;
} {
  if (owner === 0 && role === 'lance') {
    return { membership: OWNER_A_LANCE, filter: OWNER_B_TARGET };
  }
  if (owner === 0) {
    return { membership: OWNER_A_TARGET, filter: OWNER_B_LANCE };
  }
  if (role === 'lance') {
    return { membership: OWNER_B_LANCE, filter: OWNER_A_TARGET };
  }
  return { membership: OWNER_B_TARGET, filter: OWNER_A_LANCE };
}

function createProbe(
  world: RAPIER.World,
  owner: JoustOwner,
  role: ProbeRole,
  joint: RuntimeJoint,
): JoustProbe {
  const radius =
    role === 'lance' ? JOUST_LANCE_PROBE_RADIUS : JOUST_TARGET_PROBE_RADIUS;
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
export function createJoustProbes(
  world: RAPIER.World,
  creature: SpawnedCreature,
  owner: JoustOwner,
): JoustProbeSet {
  const lances: JoustProbe[] = [];
  const targets: JoustProbe[] = [];
  const byHandle = new Map<number, JoustProbe>();
  const explicitTargets = designHasExplicitJoustTargets(creature.joints);
  for (const joint of creature.joints) {
    if (jointIsLance(joint)) {
      const probe = createProbe(world, owner, 'lance', joint);
      lances.push(probe);
      byHandle.set(probe.collider.handle, probe);
    }
    if (jointIsJoustTarget(joint, explicitTargets)) {
      const probe = createProbe(world, owner, 'target', joint);
      targets.push(probe);
      byHandle.set(probe.collider.handle, probe);
    }
  }
  return { owner, lances, targets, byHandle };
}

export function createJoustHitTracker(): JoustHitTracker {
  return { activePairs: new Set(), lastHitAt: new Map(), attempts: [0, 0] };
}

function pairKey(lance: JoustProbe, target: JoustProbe): string {
  return `${lance.owner}:${lance.joint.id}>${target.owner}:${target.joint.id}`;
}

/**
 * Consume sensor intersections after a fixed world step.
 * Same-owner rejection intentionally duplicates collision-group isolation.
 */
export function detectJoustHits(
  world: RAPIER.World,
  sets: readonly [JoustProbeSet, JoustProbeSet],
  tracker: JoustHitTracker,
  time: number,
): JoustHitEvent[] {
  const allByHandle = new Map<number, JoustProbe>();
  for (const set of sets) {
    for (const [handle, probe] of set.byHandle) allByHandle.set(handle, probe);
  }

  const currentPairs = new Set<string>();
  const events: JoustHitEvent[] = [];
  for (const set of sets) {
    for (const lance of set.lances) {
      world.intersectionPairsWith(lance.collider, (otherCollider) => {
        const target = allByHandle.get(otherCollider.handle);
        if (!target || target.role !== 'target') return;
        if (target.owner === lance.owner) return;

        const key = pairKey(lance, target);
        currentPairs.add(key);
        if (tracker.activePairs.has(key)) return;
        tracker.attempts[lance.owner]++;
        const lastHitAt = tracker.lastHitAt.get(key) ?? -Infinity;
        if (time - lastHitAt < JOUST_HIT_COOLDOWN) return;

        const lancePos = lance.joint.body.translation();
        const targetPos = target.joint.body.translation();
        const dx = targetPos.x - lancePos.x;
        const dy = targetPos.y - lancePos.y;
        const distance = Math.hypot(dx, dy);
        const invDistance = distance > 1e-6 ? 1 / distance : 0;
        const axisX = dx * invDistance;
        const axisY = dy * invDistance;
        const lanceVelocity = lance.joint.body.linvel();
        const targetVelocity = target.joint.body.linvel();
        const relativeVelocityX = lanceVelocity.x - targetVelocity.x;
        const relativeVelocityY = lanceVelocity.y - targetVelocity.y;
        const closingSpeed =
          relativeVelocityX * axisX + relativeVelocityY * axisY;
        const event = scoreJoustHit({
          attacker: lance.owner,
          defender: target.owner,
          lanceJointId: lance.joint.id,
          targetJointId: target.joint.id,
          targetValue: target.targetValue,
          lanceMass: lance.joint.body.mass(),
          closingSpeed,
          relativeSpeed: Math.hypot(relativeVelocityX, relativeVelocityY),
          centreDistance: distance,
          combinedRadius: lance.radius + target.radius,
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
