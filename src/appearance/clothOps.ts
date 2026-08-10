/**
 * Authortime helpers for H9 cosmetic cloth garments.
 */
import {
  CLOTH_CAPE_DROP_CELLS,
  CLOTH_CAPE_MIN_CELL,
  CLOTH_CAPE_ROWS,
  CLOTH_COVER_CELLS_BY_FINENESS,
  CLOTH_DEFAULT_COLOR,
  CLOTH_DEFAULT_FINENESS,
  CLOTH_DEFAULT_STIFFNESS,
  CLOTH_DEFAULT_WEIGHT,
  CLOTH_MAX_CELL,
  CLOTH_MAX_COLS,
  CLOTH_MAX_ROWS,
  CLOTH_MIN_CELL,
} from './clothConstants';
import {
  emptyAppearance,
  type AppearanceRig,
  type ClothGarmentDef,
  type ClothPinDef,
} from './types';
import type { CreatureDesign } from '../creature/types';

let clothSeq = 0;

function nextClothId(prefix: string): string {
  clothSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${clothSeq}`;
}

export function withCloth(
  design: CreatureDesign,
  cloth: ClothGarmentDef[],
): CreatureDesign {
  const appearance: AppearanceRig = {
    ...(design.appearance ?? emptyAppearance()),
    cloth,
  };
  return {
    ...design,
    name: design.name === 'Custom' ? design.name : 'Custom',
    appearance,
  };
}

/** Rest-pose particle positions in design space (before runtime Verlet). */
export function clothRestPositions(g: ClothGarmentDef): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      out.push({
        x: g.originX + c * g.cellSize,
        y: g.originY - r * g.cellSize,
      });
    }
  }
  return out;
}

export interface ClothAuthorOpts {
  /** 1…5 mesh density. */
  fineness?: number;
  weight?: number;
  stiffness?: number;
  color?: string;
  layer?: 'under' | 'over';
}

function clampFineness(f: number): number {
  return Math.max(1, Math.min(5, Math.round(f)));
}

function cellsForFineness(fineness: number): number {
  const f = clampFineness(fineness);
  return CLOTH_COVER_CELLS_BY_FINENESS[f - 1] ?? 14;
}

/**
 * Two-pin cape between joint A (left-ish) and joint B (right-ish).
 * Top-left / top-right particles pin to the joints; panel hangs downward.
 */
export function makeCapeGarment(
  design: CreatureDesign,
  jointIdA: number,
  jointIdB: number,
  opts: ClothAuthorOpts = {},
): ClothGarmentDef | null {
  const ja = design.joints.find((j) => j.id === jointIdA);
  const jb = design.joints.find((j) => j.id === jointIdB);
  if (!ja || !jb) return null;

  const left = ja.x <= jb.x ? ja : jb;
  const right = ja.x <= jb.x ? jb : ja;

  const fineness = clampFineness(opts.fineness ?? CLOTH_DEFAULT_FINENESS);
  const spanCells = cellsForFineness(fineness);
  const cols = Math.max(2, Math.min(CLOTH_MAX_COLS, spanCells));
  const rows = Math.max(
    2,
    Math.min(
      CLOTH_MAX_ROWS,
      Math.round(CLOTH_CAPE_ROWS * (fineness / CLOTH_DEFAULT_FINENESS)),
    ),
  );
  const drop = Math.max(rows - 1, Math.round(CLOTH_CAPE_DROP_CELLS * (fineness / 3)));
  const useRows = Math.min(CLOTH_MAX_ROWS, drop + 1);

  const span = Math.hypot(right.x - left.x, right.y - left.y);
  const cellSize = Math.max(CLOTH_CAPE_MIN_CELL, span / Math.max(1, cols - 1));
  const originX = left.x;
  const originY = (left.y + right.y) * 0.5;

  const pins: ClothPinDef[] = [
    { particleIndex: 0, jointId: left.id },
    { particleIndex: cols - 1, jointId: right.id },
  ];

  return {
    id: nextClothId('cape'),
    cols,
    rows: useRows,
    cellSize,
    originX,
    originY,
    pins,
    color: opts.color ?? CLOTH_DEFAULT_COLOR,
    layer: opts.layer ?? 'over',
    weight: opts.weight ?? CLOTH_DEFAULT_WEIGHT,
    stiffness: opts.stiffness ?? CLOTH_DEFAULT_STIFFNESS,
  };
}

export function addCapePreset(
  design: CreatureDesign,
  jointIdA: number,
  jointIdB: number,
  opts?: ClothAuthorOpts,
): CreatureDesign {
  const garment = makeCapeGarment(design, jointIdA, jointIdB, opts);
  if (!garment) return design;
  const cloth = [...(design.appearance?.cloth ?? []), garment];
  return withCloth(design, cloth);
}

/**
 * Covering panel over the AABB of the given joints, with each joint pinned
 * to its nearest grid particle (material-draw mode).
 */
export function makeCoveringGarment(
  design: CreatureDesign,
  jointIds: number[],
  opts: ClothAuthorOpts = {},
): ClothGarmentDef | null {
  const unique = [...new Set(jointIds)];
  if (unique.length < 2) return null;
  const joints = unique
    .map((id) => design.joints.find((j) => j.id === id))
    .filter((j): j is NonNullable<typeof j> => !!j);
  if (joints.length < 2) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const j of joints) {
    minX = Math.min(minX, j.x);
    maxX = Math.max(maxX, j.x);
    minY = Math.min(minY, j.y);
    maxY = Math.max(maxY, j.y);
  }

  const fineness = clampFineness(opts.fineness ?? CLOTH_DEFAULT_FINENESS);
  const width = Math.max(CLOTH_MIN_CELL, maxX - minX);
  const height = Math.max(CLOTH_MIN_CELL, maxY - minY);
  const longest = Math.max(width, height);
  const spanCells = cellsForFineness(fineness);
  let cellSize = longest / Math.max(1, spanCells - 1);
  cellSize = Math.max(CLOTH_MIN_CELL, Math.min(CLOTH_MAX_CELL, cellSize));

  // Pad half a cell so edge pins sit inside the mesh.
  const pad = cellSize * 0.35;
  minX -= pad;
  maxX += pad;
  minY -= pad;
  maxY += pad;

  const cols = Math.max(
    2,
    Math.min(CLOTH_MAX_COLS, Math.round((maxX - minX) / cellSize) + 1),
  );
  const rows = Math.max(
    2,
    Math.min(CLOTH_MAX_ROWS, Math.round((maxY - minY) / cellSize) + 1),
  );
  // Recompute cell so the grid exactly spans the padded box.
  const cellW = (maxX - minX) / Math.max(1, cols - 1);
  const cellH = (maxY - minY) / Math.max(1, rows - 1);
  cellSize = Math.max(CLOTH_MIN_CELL, Math.min(cellW, cellH));

  const originX = minX;
  const originY = maxY; // row 0 at top

  const rest: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rest.push({
        x: originX + c * cellSize,
        y: originY - r * cellSize,
      });
    }
  }

  const used = new Set<number>();
  const pins: ClothPinDef[] = [];
  for (const j of joints) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < rest.length; i++) {
      if (used.has(i)) continue;
      const p = rest[i]!;
      const d = Math.hypot(p.x - j.x, p.y - j.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0) continue;
    used.add(best);
    pins.push({ particleIndex: best, jointId: j.id });
  }
  if (pins.length < 2) return null;

  return {
    id: nextClothId('cover'),
    cols,
    rows,
    cellSize,
    originX,
    originY,
    pins,
    color: opts.color ?? CLOTH_DEFAULT_COLOR,
    layer: opts.layer ?? 'over',
    weight: opts.weight ?? CLOTH_DEFAULT_WEIGHT,
    stiffness: opts.stiffness ?? CLOTH_DEFAULT_STIFFNESS,
  };
}

export function addCoveringGarment(
  design: CreatureDesign,
  jointIds: number[],
  opts?: ClothAuthorOpts,
): CreatureDesign {
  const garment = makeCoveringGarment(design, jointIds, opts);
  if (!garment) return design;
  return withCloth(design, [...(design.appearance?.cloth ?? []), garment]);
}

export type ClothGarmentPatch = Partial<
  Pick<
    ClothGarmentDef,
    | 'cols'
    | 'rows'
    | 'cellSize'
    | 'color'
    | 'layer'
    | 'originX'
    | 'originY'
    | 'weight'
    | 'stiffness'
  >
>;

export function updateClothGarment(
  design: CreatureDesign,
  index: number,
  patch: ClothGarmentPatch,
): CreatureDesign {
  const list = design.appearance?.cloth ?? [];
  if (index < 0 || index >= list.length) return design;
  const next = list.map((g, i) => {
    if (i !== index) return g;
    const cols = Math.max(2, Math.min(CLOTH_MAX_COLS, patch.cols ?? g.cols));
    const rows = Math.max(2, Math.min(CLOTH_MAX_ROWS, patch.rows ?? g.rows));
    const cellSize = Math.max(
      CLOTH_MIN_CELL,
      Math.min(CLOTH_MAX_CELL, patch.cellSize ?? g.cellSize),
    );
    const weight =
      patch.weight !== undefined
        ? Math.max(0.25, Math.min(3, patch.weight))
        : g.weight;
    const stiffness =
      patch.stiffness !== undefined
        ? Math.max(0.5, Math.min(2.5, patch.stiffness))
        : g.stiffness;
    const pins = g.pins.map((p) => {
      if (p.particleIndex === g.cols - 1 && cols !== g.cols) {
        return { ...p, particleIndex: cols - 1 };
      }
      if (p.particleIndex >= cols * rows) {
        return {
          ...p,
          particleIndex: Math.min(p.particleIndex, cols * rows - 1),
        };
      }
      return p;
    });
    return {
      ...g,
      ...patch,
      cols,
      rows,
      cellSize,
      weight,
      stiffness,
      pins,
    };
  });
  return withCloth(design, next);
}

export function removeClothGarment(
  design: CreatureDesign,
  index: number,
): CreatureDesign {
  const list = design.appearance?.cloth ?? [];
  if (index < 0 || index >= list.length) return design;
  return withCloth(
    design,
    list.filter((_, i) => i !== index),
  );
}

export function reassignClothPin(
  design: CreatureDesign,
  garmentIndex: number,
  pinIndex: number,
  anchor: { jointId: number } | { boneId: number; along?: number },
): CreatureDesign {
  const list = design.appearance?.cloth ?? [];
  const g = list[garmentIndex];
  if (!g || pinIndex < 0 || pinIndex >= g.pins.length) return design;
  const pins = g.pins.map((p, i) => {
    if (i !== pinIndex) return p;
    if ('jointId' in anchor) {
      return {
        particleIndex: p.particleIndex,
        jointId: anchor.jointId,
        offsetX: p.offsetX,
        offsetY: p.offsetY,
      };
    }
    return {
      particleIndex: p.particleIndex,
      boneId: anchor.boneId,
      along: anchor.along ?? 0.5,
      offsetX: p.offsetX,
      offsetY: p.offsetY,
    };
  });
  const next = list.map((garment, i) =>
    i === garmentIndex ? { ...garment, pins } : garment,
  );
  return withCloth(design, next);
}

/** Drop pins / garments that referenced a removed joint or bone. */
export function scrubClothAfterDelete(
  appearance: AppearanceRig,
  removedJointIds: Set<number>,
  removedBoneIds: Set<number>,
): AppearanceRig {
  const cloth = (appearance.cloth ?? [])
    .map((g) => ({
      ...g,
      pins: g.pins.filter((p) => {
        if (p.jointId !== undefined && removedJointIds.has(p.jointId)) return false;
        if (p.boneId !== undefined && removedBoneIds.has(p.boneId)) return false;
        return true;
      }),
    }))
    .filter((g) => g.pins.length >= 1);
  return { ...appearance, cloth };
}
