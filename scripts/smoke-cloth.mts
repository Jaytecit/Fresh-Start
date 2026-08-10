/**
 * H9 cosmetic cloth — Verlet cape + multi-pin covering.
 * Run: npx tsx scripts/smoke-cloth.mts
 */
import { stepClothGarment, resetClothStates } from '../src/appearance/cloth.ts';
import {
  makeCapeGarment,
  makeCoveringGarment,
} from '../src/appearance/clothOps.ts';
import type { CreatureDesign } from '../src/creature/types.ts';
import { featureFlags } from '../src/port/featureFlags.ts';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function main(): void {
  assert(featureFlags.cosmeticCloth === true, 'cosmeticCloth flag must be on');

  const design: CreatureDesign = {
    name: 'ClothFixture',
    joints: [
      { id: 1, x: -1, y: 4 },
      { id: 2, x: 1, y: 4 },
      { id: 3, x: -0.8, y: 2.2 },
      { id: 4, x: 0.8, y: 2.2 },
    ],
    bones: [],
    muscles: [],
  };

  const garment = makeCapeGarment(design, 1, 2, {
    fineness: 4,
    weight: 1.8,
    stiffness: 1.4,
  });
  assert(!!garment, 'cape preset should build');
  assert(garment!.pins.length === 2, 'cape needs two pins');
  assert(garment!.cols >= 8, 'finer cape should have more cols');
  assert((garment!.weight ?? 0) >= 1.5, 'cape weight should be heavier');

  const cover = makeCoveringGarment(design, [1, 2, 3, 4], {
    fineness: 3,
    weight: 2,
    stiffness: 1.2,
  });
  assert(!!cover, 'covering should build from 4 pins');
  assert(cover!.pins.length === 4, 'covering should pin all four joints');
  assert(cover!.cols >= 2 && cover!.rows >= 2, 'covering grid too small');

  resetClothStates();
  const key = 'smoke:cloth:cape';
  const dt = 1 / 60;

  let freeMoved = false;
  let lastFreeY = 0;

  for (let step = 0; step < 120; step++) {
    const t = step * dt;
    const pose = {
      joints: [
        { id: 1, x: -1 + 0.35 * Math.sin(t * 8), y: 4 + 0.2 * Math.cos(t * 6) },
        { id: 2, x: 1 + 0.35 * Math.sin(t * 8 + 0.4), y: 4 + 0.2 * Math.cos(t * 6 + 0.3) },
      ],
      bones: [] as {
        id: number;
        x: number;
        y: number;
        angle: number;
        halfLength: number;
      }[],
    };
    const rt = stepClothGarment(key, garment!, pose, dt);

    for (const p of rt.particles) {
      assert(Number.isFinite(p.x) && Number.isFinite(p.y), 'non-finite particle');
    }

    for (const pin of garment!.pins) {
      const joint = pose.joints.find((j) => j.id === pin.jointId)!;
      const p = rt.particles[pin.particleIndex]!;
      const err = Math.hypot(p.x - joint.x, p.y - joint.y);
      assert(err < 1e-6, `pin drift ${err}`);
    }

    const midCol = Math.floor(garment!.cols / 2);
    const freeIdx = (garment!.rows - 1) * garment!.cols + midCol;
    const free = rt.particles[freeIdx]!;
    if (!free.pinned) {
      const pinY = Math.min(pose.joints[0]!.y, pose.joints[1]!.y);
      if (free.y < pinY - garment!.cellSize * 0.5) freeMoved = true;
      lastFreeY = free.y;
    }
  }

  // Settle with static pins, then check structural lengths (gravity allows some sag).
  let maxConstraintErr = 0;
  let sumConstraintErr = 0;
  let constraintCount = 0;
  const settlePose = {
    joints: [
      { id: 1, x: -1, y: 4 },
      { id: 2, x: 1, y: 4 },
    ],
    bones: [] as {
      id: number;
      x: number;
      y: number;
      angle: number;
      halfLength: number;
    }[],
  };
  let settled = null as ReturnType<typeof stepClothGarment> | null;
  for (let step = 0; step < 90; step++) {
    settled = stepClothGarment(key, garment!, settlePose, dt);
  }
  assert(!!settled, 'settle step failed');
  for (const c of settled!.constraints) {
    const a = settled!.particles[c.a]!;
    const b = settled!.particles[c.b]!;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const rel = Math.abs(dist - c.rest) / Math.max(1e-6, c.rest);
    maxConstraintErr = Math.max(maxConstraintErr, rel);
    sumConstraintErr += rel;
    constraintCount += 1;
  }
  const meanConstraintErr = sumConstraintErr / Math.max(1, constraintCount);

  // Covering: pins track while anchors move.
  resetClothStates();
  const coverKey = 'smoke:cloth:cover';
  for (let step = 0; step < 40; step++) {
    const t = step * dt;
    const pose = {
      joints: [
        { id: 1, x: -1 + 0.1 * Math.sin(t * 5), y: 4 },
        { id: 2, x: 1 - 0.1 * Math.sin(t * 5), y: 4 },
        { id: 3, x: -0.8, y: 2.2 + 0.15 * Math.cos(t * 4) },
        { id: 4, x: 0.8, y: 2.2 + 0.15 * Math.cos(t * 4) },
      ],
      bones: [] as {
        id: number;
        x: number;
        y: number;
        angle: number;
        halfLength: number;
      }[],
    };
    const rt = stepClothGarment(coverKey, cover!, pose, dt);
    for (const pin of cover!.pins) {
      const joint = pose.joints.find((j) => j.id === pin.jointId)!;
      const p = rt.particles[pin.particleIndex]!;
      assert(
        Math.hypot(p.x - joint.x, p.y - joint.y) < 1e-6,
        'covering pin drift',
      );
    }
    for (const p of rt.particles) {
      assert(Number.isFinite(p.x) && Number.isFinite(p.y), 'covering non-finite');
    }
  }

  console.log(
    `cloth max-err=${maxConstraintErr.toFixed(4)} mean-err=${meanConstraintErr.toFixed(4)} freeY=${lastFreeY.toFixed(3)} cols=${garment!.cols}`,
  );
  assert(freeMoved, 'free cloth particles should drape below pins');
  assert(
    meanConstraintErr < 0.25,
    `mean constraint error too high (${meanConstraintErr})`,
  );
  assert(
    maxConstraintErr < 0.85,
    `max constraint error too high (${maxConstraintErr})`,
  );
  console.log('smoke-cloth: ok');
}

main();
