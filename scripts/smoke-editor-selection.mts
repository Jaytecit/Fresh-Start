/**
 * C1.11 selectionOps invariants — duplicate / mirror / scale / rotate.
 * Also C2.1 ramp two-point draw / flush snap geometry.
 * Run: npm run smoke:editor-selection
 */
import {
  containedBones,
  containedMuscles,
  duplicateSelection,
  mirrorDuplicateSelection,
  rotateSelection,
  scaleSelection,
  selectionCentroid,
  selectionFootprint,
  jointsInRect,
} from '../src/editor/selectionOps.ts';
import type { CreatureDesign } from '../src/creature/types.ts';
import {
  collectRampSnapGeometry,
  rampFromTopEndpoints,
  rampTopEndpoints,
  snapRampEndpoint,
} from '../src/env/rampDraw.ts';
import { flatGroundEnv, type EnvironmentDesign } from '../src/env/types.ts';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function nearly(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

function sampleDesign(): CreatureDesign {
  return {
    name: 'SmokeSel',
    joints: [
      { id: 1, x: 0, y: 1 },
      { id: 2, x: 1, y: 1 },
      { id: 3, x: 1, y: 2 },
    ],
    bones: [
      { id: 1, startJointId: 1, endJointId: 2 },
      { id: 2, startJointId: 2, endJointId: 3 },
    ],
    muscles: [{ id: 1, startBoneId: 1, endBoneId: 2, canExpand: true }],
  };
}

function main(): void {
  const d = sampleDesign();
  const ids = [1, 2, 3];

  assert(containedBones(d, ids).length === 2, 'all bones contained');
  assert(containedMuscles(d, ids).length === 1, 'muscle contained');
  assert(containedBones(d, [1, 2]).length === 1, 'partial bone set');
  assert(containedMuscles(d, [1, 2]).length === 0, 'muscle needs both bones');

  const inBox = jointsInRect(d, -0.1, 0.9, 1.1, 1.1);
  assert(inBox.length === 2 && inBox.includes(1) && inBox.includes(2), 'marquee AABB');

  const fp = selectionFootprint(d, ids);
  assert(fp != null && fp.hw > 0 && fp.hh > 0, 'footprint');

  const dup = duplicateSelection(d, ids, 0.5, 0.5);
  assert(dup.design.joints.length === 6, 'duplicate joints');
  assert(dup.design.bones.length === 4, 'duplicate bones');
  assert(dup.design.muscles.length === 2, 'duplicate muscles');
  assert(dup.newJointIds.length === 3, 'new joint ids');

  const c = selectionCentroid(d, ids)!;
  const mir = mirrorDuplicateSelection(d, ids);
  assert(mir.design.joints.length === 6, 'mirror joints');
  const mirrored = mir.design.joints.filter((j) => mir.newJointIds.includes(j.id));
  const srcJ1 = d.joints.find((j) => j.id === 1)!;
  const m1 = mirrored.find((j) => nearly(j.x, 2 * c.x - srcJ1.x) && nearly(j.y, srcJ1.y));
  assert(m1 != null, 'mirror flips X about centroid');

  const scaled = scaleSelection(d, ids, 2, c);
  const s2 = scaled.joints.find((j) => j.id === 2)!;
  assert(nearly(s2.x, c.x + (1 - c.x) * 2), 'scale X');
  assert(nearly(s2.y, c.y + (1 - c.y) * 2), 'scale Y');

  const rotated = rotateSelection(d, [1, 2], Math.PI / 2, { x: 0.5, y: 1 });
  const r1 = rotated.joints.find((j) => j.id === 1)!;
  const r2 = rotated.joints.find((j) => j.id === 2)!;
  // (0,1) about (0.5,1) → 90° CCW → (0.5, 0.5); (1,1) → (0.5, 1.5)
  assert(nearly(r1.x, 0.5) && nearly(r1.y, 0.5), 'rotate joint 1');
  assert(nearly(r2.x, 0.5) && nearly(r2.y, 1.5), 'rotate joint 2');

  // --- Ramp two-point draw / flush snap ---
  const env: EnvironmentDesign = {
    ...flatGroundEnv(),
    obstacles: [{ id: 'box1', kind: 'box', x: 4, y: 0.5, w: 2, h: 1 }],
  };
  const geom = collectRampSnapGeometry(env);
  // Box top-left / top-right at (3,1) and (5,1)
  const snapTL = snapRampEndpoint(3.1, 0.95, { geometry: geom });
  assert(nearly(snapTL.x, 3) && nearly(snapTL.y, 1), 'snap to box top-left');
  const snapG = snapRampEndpoint(1.25, 0.2, { geometry: geom });
  assert(nearly(snapG.y, 0) && nearly(snapG.x, 1.25), 'snap to ground free-X');

  // LTR up: ground → box top-left
  const up = rampFromTopEndpoints({ x: 0, y: 0 }, { x: 3, y: 1 })!;
  assert(up != null && up.kind === 'ramp', 'LTR up ramp');
  const upEnds = rampTopEndpoints(up);
  assert(nearly(upEnds.a.x, 0) && nearly(upEnds.a.y, 0), 'LTR start top flush');
  assert(nearly(upEnds.b.x, 3) && nearly(upEnds.b.y, 1), 'LTR end top flush');

  // RTL down (draw high→low right-to-left)
  const rtl = rampFromTopEndpoints({ x: 5, y: 1 }, { x: 8, y: 0 })!;
  assert(rtl != null, 'RTL down ramp');
  const rtlEnds = rampTopEndpoints(rtl);
  assert(nearly(rtlEnds.a.x, 5) && nearly(rtlEnds.a.y, 1), 'RTL start flush');
  assert(nearly(rtlEnds.b.x, 8) && nearly(rtlEnds.b.y, 0), 'RTL end flush');

  // Reverse draw order yields same top surface
  const rev = rampFromTopEndpoints({ x: 3, y: 1 }, { x: 0, y: 0 })!;
  const revEnds = rampTopEndpoints(rev);
  assert(nearly(revEnds.a.x, 3) && nearly(revEnds.b.x, 0), 'reverse order ok');

  assert(rampFromTopEndpoints({ x: 0, y: 0 }, { x: 0.1, y: 0 }) == null, 'reject short');

  // Buried top endpoints must clamp to ground (no invisible straddling hump).
  const buried = rampFromTopEndpoints({ x: 53, y: 1.38 }, { x: 37, y: -1.61 })!;
  assert(buried != null, 'buried endpoints still author after clamp');
  const buriedEnds = rampTopEndpoints(buried);
  assert(buriedEnds.a.y >= -1e-9 && buriedEnds.b.y >= -1e-9, 'top surface ≥ ground');
  assert(nearly(Math.min(buriedEnds.a.y, buriedEnds.b.y), 0), 'low end flush to ground');

  // After a ground-flush ramp, bottom corners sit slightly underground — they
  // must not become snap magnets for the next draw.
  const seeded: EnvironmentDesign = {
    ...flatGroundEnv(),
    obstacles: [up],
  };
  const seededGeom = collectRampSnapGeometry(seeded);
  for (const p of seededGeom.points) {
    assert(p.y >= -1e-4, `snap point underground at (${p.x}, ${p.y})`);
  }
  const lure = snapRampEndpoint(upEnds.a.x + 0.05, -0.15, { geometry: seededGeom });
  assert(lure.y >= -1e-9, 'underground lure clamps to ground');

  console.log('smoke-editor-selection OK');
}

main();
