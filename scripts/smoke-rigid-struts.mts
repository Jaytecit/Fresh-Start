/**
 * G8 rigid struts — solid frames without hinge-bone capsules.
 * Run: npx tsx scripts/smoke-rigid-struts.mts
 */
import { cloneDesign, type CreatureDesign } from '../src/creature/types.ts';
import { FIXED_DT, JOINT_RADIUS } from '../src/physics/constants.ts';
import {
  destroyCreature,
  spawnCreature,
} from '../src/physics/spawn.ts';
import { createWorld, initRapier } from '../src/physics/world.ts';
import { featureFlags } from '../src/port/featureFlags.ts';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function edgeLens(
  creature: ReturnType<typeof spawnCreature>,
  edges: Array<[number, number]>,
): number[] {
  const pos = new Map(
    creature.joints.map((j) => {
      const t = j.body.translation();
      return [j.id, { x: t.x, y: t.y }] as const;
    }),
  );
  return edges.map(([a, b]) => {
    const pa = pos.get(a)!;
    const pb = pos.get(b)!;
    return Math.hypot(pb.x - pa.x, pb.y - pa.y);
  });
}

function maxRelDrift(a: number[], b: number[]): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    const denom = Math.max(1e-6, a[i]!);
    m = Math.max(m, Math.abs(b[i]! - a[i]!) / denom);
  }
  return m;
}

async function main(): Promise<void> {
  assert(featureFlags.rigidStruts === true, 'rigidStruts flag must be on');
  await initRapier();
  const world = createWorld();
  world.timestep = FIXED_DT;

  // 1) Equilateral triangle of rigid struts stays rigid under gravity + shove.
  const triangle: CreatureDesign = {
    name: 'StrutTriangle',
    joints: [
      { id: 1, x: 0, y: 2 },
      { id: 2, x: 1, y: 2 },
      { id: 3, x: 0.5, y: 2 + Math.sqrt(3) / 2 },
    ],
    bones: [
      { id: 1, startJointId: 1, endJointId: 2, rigid: true },
      { id: 2, startJointId: 2, endJointId: 3, rigid: true },
      { id: 3, startJointId: 3, endJointId: 1, rigid: true },
    ],
    muscles: [],
  };
  const tri = spawnCreature(world, cloneDesign(triangle));
  assert(tri.bones.length === 0, 'triangle should have no hinge bone bodies');
  assert(tri.struts.length === 3, 'triangle should have 3 struts');
  const triEdges: Array<[number, number]> = [
    [1, 2],
    [2, 3],
    [3, 1],
  ];
  const tri0 = edgeLens(tri, triEdges);
  for (let i = 0; i < 90; i++) world.step();
  tri.joints[0]!.body.applyImpulse({ x: 3, y: 1.5 }, true);
  for (let i = 0; i < 90; i++) world.step();
  const tri1 = edgeLens(tri, triEdges);
  const triDrift = maxRelDrift(tri0, tri1);
  console.log(`triangle edge drift=${triDrift.toFixed(4)}`);
  assert(triDrift < 0.03, `triangle edges drifted too much (${triDrift})`);
  destroyCreature(world, tri);

  // 2) Square frame (4 struts) does not shear into a parallelogram.
  const side = 1.2;
  const square: CreatureDesign = {
    name: 'StrutSquare',
    joints: [
      { id: 1, x: 0, y: 2 },
      { id: 2, x: side, y: 2 },
      { id: 3, x: side, y: 2 + side },
      { id: 4, x: 0, y: 2 + side },
    ],
    bones: [
      { id: 1, startJointId: 1, endJointId: 2, rigid: true },
      { id: 2, startJointId: 2, endJointId: 3, rigid: true },
      { id: 3, startJointId: 3, endJointId: 4, rigid: true },
      { id: 4, startJointId: 4, endJointId: 1, rigid: true },
    ],
    muscles: [],
  };
  const sq = spawnCreature(world, cloneDesign(square));
  assert(sq.struts.length === 4, 'square should have 4 struts');
  const diag = (c: typeof sq) => {
    const p = (id: number) => {
      const j = c.joints.find((x) => x.id === id)!;
      return j.body.translation();
    };
    const a = p(1);
    const b = p(3);
    const c2 = p(2);
    const d = p(4);
    return {
      d13: Math.hypot(b.x - a.x, b.y - a.y),
      d24: Math.hypot(d.x - c2.x, d.y - c2.y),
    };
  };
  const d0 = diag(sq);
  for (let i = 0; i < 60; i++) world.step();
  sq.joints[1]!.body.applyImpulse({ x: 4, y: 0 }, true);
  for (let i = 0; i < 120; i++) world.step();
  const d1 = diag(sq);
  const diagDiff0 = Math.abs(d0.d13 - d0.d24);
  const diagDiff1 = Math.abs(d1.d13 - d1.d24);
  console.log(
    `square diag diff before=${diagDiff0.toFixed(4)} after=${diagDiff1.toFixed(4)}`,
  );
  assert(
    diagDiff1 < 0.08,
    `square sheared (diag mismatch ${diagDiff1.toFixed(4)})`,
  );
  destroyCreature(world, sq);

  // 3) Hinge bone still bends (two joints + one non-rigid bone).
  const hinge: CreatureDesign = {
    name: 'HingePair',
    joints: [
      { id: 1, x: 0, y: JOINT_RADIUS + 0.05, isFoot: true },
      { id: 2, x: 0, y: 1.4 },
    ],
    bones: [{ id: 1, startJointId: 1, endJointId: 2 }],
    muscles: [],
  };
  const hp = spawnCreature(world, cloneDesign(hinge));
  assert(hp.bones.length === 1 && hp.struts.length === 0, 'hinge path intact');
  for (let i = 0; i < 45; i++) world.step();
  const top = hp.joints.find((j) => j.id === 2)!;
  top.body.applyImpulse({ x: 2.5, y: 0 }, true);
  for (let i = 0; i < 45; i++) world.step();
  const foot = hp.joints.find((j) => j.id === 1)!;
  const dx = Math.abs(top.body.translation().x - foot.body.translation().x);
  console.log(`hinge lateral separation=${dx.toFixed(3)}`);
  assert(dx > 0.15, 'hinge bone should allow relative swing');
  destroyCreature(world, hp);

  // 4) Muscle targeting a rigid strut must fail at spawn.
  const bad: CreatureDesign = {
    name: 'BadMuscle',
    joints: [
      { id: 1, x: 0, y: 1 },
      { id: 2, x: 1, y: 1 },
      { id: 3, x: 0.5, y: 2 },
    ],
    bones: [
      { id: 1, startJointId: 1, endJointId: 2, rigid: true },
      { id: 2, startJointId: 2, endJointId: 3 },
    ],
    muscles: [{ id: 1, startBoneId: 1, endBoneId: 2 }],
  };
  let threw = false;
  try {
    spawnCreature(world, cloneDesign(bad));
  } catch {
    threw = true;
  }
  assert(threw, 'muscle on rigid strut should throw at spawn');

  world.free();
  console.log('smoke-rigid-struts: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
