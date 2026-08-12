/**
 * Launch pad — foot contact → multi-step vertical boost (per-pad apex).
 * Each pad fires once per episode/run; detection stays close to the drawn slab.
 * Post-step linvel (same family as plant-slide brake).
 */
import {
  clampLaunchPadApex,
  LAUNCH_PAD_APEX_H,
  LAUNCH_PAD_BOOST_STEPS,
  LAUNCH_PAD_CLEARANCE,
  LAUNCH_PAD_PROXIMITY,
  launchPadVyForApex,
} from './constants';
import type { ObstacleHandle, ObstacleVisual } from './obstacles';
import type { RuntimeJoint, SpawnedCreature } from './spawn';
import { RAPIER } from './world';

export type LaunchPadCooldown = {
  /** Body handles of pads that have already fired this episode/run. */
  spentPads: Set<number>;
  /** Remaining fixed-dt steps to re-assert boostVy. */
  boostStepsLeft: number;
  /** Target upward speed for the in-progress boost. */
  boostVy: number;
};

export function createLaunchPadCooldown(): LaunchPadCooldown {
  return { spentPads: new Set(), boostStepsLeft: 0, boostVy: 0 };
}

/** Reset spent/boost state (call when a new episode starts on a reused creature). */
export function resetLaunchPadCooldown(cooldown: LaunchPadCooldown): void {
  cooldown.spentPads.clear();
  cooldown.boostStepsLeft = 0;
  cooldown.boostVy = 0;
}

function padEntries(
  obstacles: ObstacleHandle | null,
): Array<{ handle: number; visual: ObstacleVisual }> {
  const out: Array<{ handle: number; visual: ObstacleVisual }> = [];
  if (!obstacles) return out;
  for (let i = 0; i < obstacles.bodies.length; i++) {
    const v = obstacles.visuals[i];
    if (!v || v.kind !== 'pad') continue;
    out.push({ handle: obstacles.bodies[i]!.handle, visual: v });
  }
  return out;
}

function bodyTouchesPadHandle(
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  padHandle: number,
): boolean {
  let hit = false;
  for (let i = 0; i < body.numColliders(); i++) {
    world.contactPairsWith(body.collider(i), (other) => {
      const parent = other.parent();
      if (parent && parent.handle === padHandle) hit = true;
    });
    if (hit) return true;
  }
  return false;
}

/**
 * True when a foot center is on/just above the pad top face,
 * laterally within the drawn half-width (plus a tiny foot-radius slop).
 */
function footNearPadTop(
  px: number,
  py: number,
  footRadius: number,
  v: ObstacleVisual,
  clearance: number,
): boolean {
  const c = Math.cos(v.rot);
  const s = Math.sin(v.rot);
  const dx = px - v.x;
  const dy = py - v.y;
  const localX = dx * c + dy * s;
  const localY = -dx * s + dy * c;
  const edgeSlop = footRadius * 0.25;
  if (Math.abs(localX) > v.hx + edgeSlop) return false;
  const aboveTop = localY - v.hy;
  return aboveTop >= -footRadius * 0.35 && aboveTop <= clearance;
}

/** Contact joints for pad trigger — marked feet (incl. wheels), else wheels, else all. */
function padTriggerFeet(creature: SpawnedCreature): RuntimeJoint[] {
  const markedFeet = creature.joints.filter((j) => j.isFoot);
  if (markedFeet.length > 0) return markedFeet;
  const wheels = creature.joints.filter((j) => j.isWheel);
  if (wheels.length > 0) return wheels;
  return creature.joints;
}

function allCreatureBodies(creature: SpawnedCreature): RAPIER.RigidBody[] {
  const out: RAPIER.RigidBody[] = [];
  for (const j of creature.joints) out.push(j.body);
  for (const b of creature.bones) out.push(b.body);
  return out;
}

/** First unspent pad a foot is contacting / standing on, if any. */
function findFootTouchingPad(
  world: RAPIER.World,
  creature: SpawnedCreature,
  pads: Array<{ handle: number; visual: ObstacleVisual }>,
  spentPads: ReadonlySet<number>,
): { handle: number; visual: ObstacleVisual } | null {
  if (pads.length === 0) return null;
  const feet = padTriggerFeet(creature);
  for (const pad of pads) {
    if (spentPads.has(pad.handle)) continue;
    for (const foot of feet) {
      if (bodyTouchesPadHandle(world, foot.body, pad.handle)) return pad;
      const t = foot.body.translation();
      if (
        footNearPadTop(
          t.x,
          t.y,
          foot.radius,
          pad.visual,
          LAUNCH_PAD_PROXIMITY,
        )
      ) {
        return pad;
      }
    }
  }
  return null;
}

/**
 * Shared upward boost — exact vy (not Math.max).
 * Preserving contact-solver spikes via max() tears impulse joints apart
 * across the re-assert window and feeds NaNs into the next world.step().
 */
function assertLaunchVelocity(bodies: RAPIER.RigidBody[], boostVy: number): void {
  for (const b of bodies) {
    const v = b.linvel();
    const vx = Number.isFinite(v.x) ? v.x : 0;
    b.setLinvel({ x: vx, y: boostVy }, true);
    b.wakeUp();
  }
}

/** True while post-contact boost re-assert is still running. */
export function isLaunchBoosting(cooldown: LaunchPadCooldown): boolean {
  return cooldown.boostStepsLeft > 0;
}

/**
 * If a foot contacts / stands on an unspent launch pad, clear the deck and
 * drive a shared upward linvel for several steps. Each pad fires once per run.
 */
export function applyLaunchPads(
  world: RAPIER.World,
  creature: SpawnedCreature,
  obstacles: ObstacleHandle | null,
  _timeSec: number,
  cooldown: LaunchPadCooldown,
): boolean {
  const bodies = allCreatureBodies(creature);
  if (bodies.length === 0) return false;

  // Continue a launch already in progress (fight contact / joint scrubbing).
  if (cooldown.boostStepsLeft > 0) {
    assertLaunchVelocity(bodies, cooldown.boostVy);
    cooldown.boostStepsLeft -= 1;
    return true;
  }

  const pads = padEntries(obstacles);
  if (pads.length === 0) return false;
  const pad = findFootTouchingPad(
    world,
    creature,
    pads,
    cooldown.spentPads,
  );
  if (!pad) return false;

  const apex = clampLaunchPadApex(pad.visual.launchApex ?? LAUNCH_PAD_APEX_H);
  const boostVy = launchPadVyForApex(apex);

  for (const b of bodies) {
    const t = b.translation();
    const x = Number.isFinite(t.x) ? t.x : 0;
    const y = Number.isFinite(t.y) ? t.y : 0;
    b.setTranslation({ x, y: y + LAUNCH_PAD_CLEARANCE }, true);
    // Kill spin so wings/links don't whip into the deck during boost.
    b.setAngvel(0, true);
  }
  assertLaunchVelocity(bodies, boostVy);
  cooldown.boostVy = boostVy;
  cooldown.boostStepsLeft = LAUNCH_PAD_BOOST_STEPS;
  cooldown.spentPads.add(pad.handle);
  return true;
}
