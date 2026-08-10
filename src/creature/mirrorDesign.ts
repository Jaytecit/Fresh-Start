/**
 * Horizontal design mirror for disco even slots (physical X flip).
 * Topology (bone/muscle IDs) is unchanged; joint X flips about the centroid.
 */
import { cloneAppearance, type AppearanceRig } from '../appearance/types';
import { cloneDesign, type CreatureDesign } from './types';

function designCentroidX(design: CreatureDesign): number {
  if (design.joints.length === 0) return 0;
  let sum = 0;
  for (const j of design.joints) sum += j.x;
  return sum / design.joints.length;
}

function mirrorAppearance(
  a: AppearanceRig | undefined,
  cx: number,
): AppearanceRig | undefined {
  if (!a) return undefined;
  const next = cloneAppearance(a)!;
  next.googlyEyes = next.googlyEyes.map((e) => ({
    ...e,
    offsetX: e.offsetX !== undefined ? -e.offsetX : undefined,
  }));
  next.bodyParts = next.bodyParts.map((p) => ({
    ...p,
    mirror: !p.mirror,
    offsetX: p.offsetX !== undefined ? -p.offsetX : undefined,
    rotation: p.rotation !== undefined ? -p.rotation : undefined,
  }));
  next.cloth = (next.cloth ?? []).map((g) => ({
    ...g,
    originX: 2 * cx - (g.originX + (g.cols - 1) * g.cellSize),
    pins: g.pins.map((p) => ({
      ...p,
      // Mirror column within the grid so left/right pins swap sides.
      particleIndex: (() => {
        const row = Math.floor(p.particleIndex / g.cols);
        const col = p.particleIndex % g.cols;
        return row * g.cols + (g.cols - 1 - col);
      })(),
      offsetX: p.offsetX !== undefined ? -p.offsetX : undefined,
    })),
  }));
  return next;
}

/** Flip joint X about design centroid; flip cosmetic lateral offsets / mirror flags. */
export function mirrorDesignX(design: CreatureDesign): CreatureDesign {
  const src = cloneDesign(design);
  const cx = designCentroidX(src);
  return {
    ...src,
    joints: src.joints.map((j) => ({ ...j, x: 2 * cx - j.x })),
    appearance: mirrorAppearance(src.appearance, cx),
  };
}
