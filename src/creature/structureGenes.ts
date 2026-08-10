/**
 * D18 — Structural morphology genes (grow/prune from authored design).
 * Topology may change; soft morph (D17) still applies on top.
 */
import {
  countBrainActuatorChannels,
  countWheelActuators,
  designHasActuators,
} from '../brain/driveGroups';
import { deleteJoint } from '../editor/editOps';
import {
  mutateMorphGenes,
  zeroMorphGenes,
  type MorphGenes,
} from './morphGenes';
import {
  cloneDesign,
  isRigidBoneDef,
  nextId,
  type CreatureDesign,
  type JointDef,
} from './types';

/** Max joints added beyond the authored base. */
export const STRUCT_MAX_EXTRA_JOINTS = 4;
/** Max bones added beyond the authored base. */
export const STRUCT_MAX_EXTRA_BONES = 4;
/** Max muscles added beyond the authored base. */
export const STRUCT_MAX_EXTRA_MUSCLES = 6;
/** Distal segment length when growing (m). */
export const STRUCT_GROW_LENGTH = 0.42;
/** Chance to attempt one structural op per mutate call. */
export const STRUCT_MUTATION_CHANCE = 0.4;

export interface StructureChannelBudget {
  maxMuscleChannels: number;
  maxWheelChannels: number;
  /** Total padded MLP outputs. */
  outputCount: number;
}

/** Conservative pad so grown muscles/wheels fit one shared NetworkShape. */
export function structureChannelBudget(
  base: CreatureDesign,
  includeWheels = true,
): StructureChannelBudget {
  const maxMuscleChannels =
    countBrainActuatorChannels(base.muscles) + STRUCT_MAX_EXTRA_MUSCLES;
  const maxWheelChannels = includeWheels
    ? countWheelActuators(base.joints) + STRUCT_MAX_EXTRA_JOINTS
    : 0;
  return {
    maxMuscleChannels: Math.max(1, maxMuscleChannels),
    maxWheelChannels,
    outputCount: Math.max(1, maxMuscleChannels + maxWheelChannels),
  };
}

/**
 * Remap padded brain outputs onto a member's contiguous channel vector.
 * Layout: muscles [0, maxMuscle), wheels [maxMuscle, maxMuscle+maxWheel).
 */
export function remapPaddedActuatorDrives(
  design: CreatureDesign,
  paddedDrives: ArrayLike<number>,
  maxMuscleChannels: number,
  includeWheels = true,
): number[] {
  const muscleCh = countBrainActuatorChannels(design.muscles);
  const wheelN = includeWheels ? countWheelActuators(design.joints) : 0;
  const out = new Array(muscleCh + wheelN);
  for (let i = 0; i < muscleCh; i++) {
    out[i] = paddedDrives[i] ?? 0;
  }
  for (let i = 0; i < wheelN; i++) {
    out[muscleCh + i] = paddedDrives[maxMuscleChannels + i] ?? 0;
  }
  return out;
}

export function cloneTopology(design: CreatureDesign): CreatureDesign {
  return cloneDesign(design);
}

/** Soft morph genes sized to a topology (reset scales, keep aero/wheels seeds). */
export function morphForTopology(
  topology: CreatureDesign,
  rng: () => number,
  sigma = 0.12,
  mutate = true,
): MorphGenes {
  const base = zeroMorphGenes(topology);
  return mutate ? mutateMorphGenes(base, rng, sigma) : base;
}

function boneKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function muscleKey(a: number, b: number): string {
  return boneKey(a, b);
}

function jointDegree(design: CreatureDesign, jointId: number): number {
  let n = 0;
  for (const b of design.bones) {
    if (b.startJointId === jointId || b.endJointId === jointId) n++;
  }
  return n;
}

function canGrow(design: CreatureDesign, base: CreatureDesign): boolean {
  return (
    design.joints.length < base.joints.length + STRUCT_MAX_EXTRA_JOINTS &&
    design.bones.length < base.bones.length + STRUCT_MAX_EXTRA_BONES
  );
}

function canAddMuscle(design: CreatureDesign, base: CreatureDesign): boolean {
  return design.muscles.length < base.muscles.length + STRUCT_MAX_EXTRA_MUSCLES;
}

function canPrune(design: CreatureDesign, base: CreatureDesign): boolean {
  return (
    design.joints.length > base.joints.length &&
    design.bones.length > base.bones.length
  );
}

function footCount(design: CreatureDesign): number {
  return design.joints.filter((j) => j.isFoot).length;
}

function pickIndex(length: number, rng: () => number): number {
  return Math.floor(rng() * length);
}

/** Grow a distal joint + bone from a random existing joint; optional muscle. */
export function growDistal(
  design: CreatureDesign,
  base: CreatureDesign,
  rng: () => number,
): CreatureDesign | null {
  if (!canGrow(design, base) || design.joints.length === 0) return null;
  const next = cloneDesign(design);
  const parent = next.joints[pickIndex(next.joints.length, rng)]!;
  // Prefer growing away from centroid.
  let cx = 0;
  let cy = 0;
  for (const j of next.joints) {
    cx += j.x;
    cy += j.y;
  }
  cx /= next.joints.length;
  cy /= next.joints.length;
  let dx = parent.x - cx;
  let dy = parent.y - cy;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) {
    const ang = rng() * Math.PI * 2;
    dx = Math.cos(ang);
    dy = Math.sin(ang);
  } else {
    dx /= len;
    dy /= len;
  }
  // Small angular jitter.
  const jitter = (rng() - 0.5) * 0.7;
  const c = Math.cos(jitter);
  const s = Math.sin(jitter);
  const dirX = dx * c - dy * s;
  const dirY = dx * s + dy * c;

  const newJoint: JointDef = {
    id: nextId(next.joints),
    x: parent.x + dirX * STRUCT_GROW_LENGTH,
    y: Math.max(0.15, parent.y + dirY * STRUCT_GROW_LENGTH),
    mass: parent.mass,
  };
  // Distal tips that grow downward become feet candidates.
  if (dirY < -0.15 || parent.isFoot) {
    newJoint.isFoot = true;
  }
  next.joints.push(newJoint);

  const newBoneId = nextId(next.bones);
  next.bones.push({
    id: newBoneId,
    startJointId: parent.id,
    endJointId: newJoint.id,
    mass: 1,
  });

  if (canAddMuscle(next, base) && next.bones.length >= 2 && rng() < 0.65) {
    // Attach a muscle from the new bone to another hinge bone sharing the parent joint.
    const candidates = next.bones.filter(
      (b) =>
        b.id !== newBoneId &&
        !isRigidBoneDef(b) &&
        (b.startJointId === parent.id || b.endJointId === parent.id),
    );
    if (candidates.length > 0) {
      const other = candidates[pickIndex(candidates.length, rng)]!;
      const existing = new Set(
        next.muscles.map((m) => muscleKey(m.startBoneId, m.endBoneId)),
      );
      const key = muscleKey(newBoneId, other.id);
      if (!existing.has(key)) {
        next.muscles.push({
          id: nextId(next.muscles),
          startBoneId: newBoneId,
          endBoneId: other.id,
        });
      }
    }
  }

  return next;
}

/** Add a muscle between two existing bones that do not already share one. */
export function addMuscleBetweenBones(
  design: CreatureDesign,
  base: CreatureDesign,
  rng: () => number,
): CreatureDesign | null {
  if (!canAddMuscle(design, base) || design.bones.length < 2) return null;
  const existing = new Set(
    design.muscles.map((m) => muscleKey(m.startBoneId, m.endBoneId)),
  );
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < design.bones.length; i++) {
    for (let j = i + 1; j < design.bones.length; j++) {
      const boneA = design.bones[i]!;
      const boneB = design.bones[j]!;
      // Rigid struts cannot host muscles.
      if (isRigidBoneDef(boneA) || isRigidBoneDef(boneB)) continue;
      const a = boneA.id;
      const b = boneB.id;
      if (!existing.has(muscleKey(a, b))) pairs.push([a, b]);
    }
  }
  if (pairs.length === 0) return null;
  const [startBoneId, endBoneId] = pairs[pickIndex(pairs.length, rng)]!;
  const next = cloneDesign(design);
  next.muscles.push({
    id: nextId(next.muscles),
    startBoneId,
    endBoneId,
  });
  return next;
}

/** Remove a leaf joint grown beyond the base floor (cascades bones/muscles). */
export function pruneLeaf(
  design: CreatureDesign,
  base: CreatureDesign,
  rng: () => number,
): CreatureDesign | null {
  if (!canPrune(design, base)) return null;
  const leaves = design.joints.filter((j) => jointDegree(design, j.id) === 1);
  if (leaves.length === 0) return null;

  // Prefer pruning non-authored-looking extras: any leaf is OK if counts stay above floor.
  const shuffled = leaves.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }

  const baseHadFeet = footCount(base) > 0;
  for (const leaf of shuffled) {
    const trial = deleteJoint(design, leaf.id);
    if (trial.joints.length < base.joints.length) continue;
    if (trial.bones.length < base.bones.length) continue;
    if (!designHasActuators(trial, true)) continue;
    if (baseHadFeet && footCount(trial) === 0) continue;
    // Keep muscle count from collapsing below 1 when base had muscles.
    if (base.muscles.length > 0 && trial.muscles.length === 0) continue;
    return trial;
  }
  return null;
}

/**
 * Apply 0–1 structural mutations. Always returns a clone.
 * Caps are relative to `base` (authored design for the run).
 */
export function mutateStructure(
  topology: CreatureDesign,
  base: CreatureDesign,
  rng: () => number,
): CreatureDesign {
  let next = cloneDesign(topology);
  if (rng() >= STRUCT_MUTATION_CHANCE) return next;

  const ops: Array<() => CreatureDesign | null> = [];
  if (canGrow(next, base)) ops.push(() => growDistal(next, base, rng));
  if (canAddMuscle(next, base)) ops.push(() => addMuscleBetweenBones(next, base, rng));
  if (canPrune(next, base)) ops.push(() => pruneLeaf(next, base, rng));
  if (ops.length === 0) return next;

  const op = ops[pickIndex(ops.length, rng)]!;
  const result = op();
  if (result) next = result;

  // Enforce channel budget (unlikely, but keep spawn/brain safe).
  const budget = structureChannelBudget(base, true);
  let guard = 0;
  while (
    countBrainActuatorChannels(next.muscles) > budget.maxMuscleChannels &&
    guard++ < 8
  ) {
    const pruned = pruneLeaf(next, base, rng);
    if (!pruned) break;
    next = pruned;
  }
  return next;
}

/** Uniform pick of parent topology (no graph-merge). */
export function crossoverStructure(
  a: CreatureDesign,
  b: CreatureDesign,
  rng: () => number,
): CreatureDesign {
  return cloneDesign(rng() < 0.5 ? a : b);
}

export function topologyFingerprint(design: CreatureDesign): string {
  const parts = [
    `j${design.joints.length}`,
    `b${design.bones.length}`,
    `m${design.muscles.length}`,
    design.bones.map((b) => boneKey(b.startJointId, b.endJointId)).join(','),
    design.muscles.map((m) => muscleKey(m.startBoneId, m.endBoneId)).join(','),
  ];
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function summarizeTopology(design: CreatureDesign | null | undefined): {
  joints: number;
  bones: number;
  muscles: number;
  fingerprint: string;
} {
  if (!design) {
    return { joints: 0, bones: 0, muscles: 0, fingerprint: 'notopo' };
  }
  return {
    joints: design.joints.length,
    bones: design.bones.length,
    muscles: design.muscles.length,
    fingerprint: topologyFingerprint(design),
  };
}
