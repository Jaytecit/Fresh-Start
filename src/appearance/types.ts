/** Cosmetic appearance attached to a creature design (never affects Rapier). */

export interface GooglyEyeDef {
  /** Anchor joint id. */
  jointId: number;
  /** Dome radius in world units. */
  domeRadius?: number;
  /** Horizontal offset from joint center. */
  offsetX?: number;
  offsetY?: number;
}

export interface BodyPartAttachment {
  /** Catalog asset id (see bodyPartCatalog). */
  assetId: string;
  /** Prefer bone anchor when set. */
  boneId?: number;
  /** Joint anchor (when not bone-anchored). */
  jointId?: number;
  /** 0..1 along bone start→end (default 0.5). */
  along?: number;
  /** Lateral offset in design/world units from the anchor. */
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  /** Extra rotation in radians, added on top of bone angle (if any). */
  rotation?: number;
  mirror?: boolean;
  tint?: string;
}

/** Pin a cloth particle to a joint or bone (H9). */
export interface ClothPinDef {
  /** Grid index = row * cols + col. */
  particleIndex: number;
  jointId?: number;
  boneId?: number;
  /** 0..1 along bone start→end (default 0.5). */
  along?: number;
  offsetX?: number;
  offsetY?: number;
}

/** Rectangular Verlet cloth panel pinned to the skeleton (H9). */
export interface ClothGarmentDef {
  id: string;
  cols: number;
  rows: number;
  /** Rest spacing between neighboring particles (design units). */
  cellSize: number;
  /** Design-space origin of particle (0,0). */
  originX: number;
  originY: number;
  pins: ClothPinDef[];
  color?: string;
  /** Draw under body-part sprites (default) or over. */
  layer?: 'under' | 'over';
  /**
   * Gravity multiplier for free particles (heavier hangs more).
   * Typical range 0.25…3; default ~1.5.
   */
  weight?: number;
  /**
   * Constraint stiffness multiplier (more iterations → less stretch).
   * Typical range 0.5…2.5; default 1.
   */
  stiffness?: number;
}

export interface AppearanceRig {
  version: 1;
  hideSkeleton?: boolean;
  googlyEyes: GooglyEyeDef[];
  bodyParts: BodyPartAttachment[];
  /** Optional cloth garments (H9). */
  cloth?: ClothGarmentDef[];
}

export function emptyAppearance(): AppearanceRig {
  return { version: 1, googlyEyes: [], bodyParts: [], cloth: [] };
}

function cloneCloth(g: ClothGarmentDef): ClothGarmentDef {
  return {
    ...g,
    pins: g.pins.map((p) => ({ ...p })),
  };
}

export function cloneAppearance(a?: AppearanceRig | null): AppearanceRig | undefined {
  if (!a) return undefined;
  return {
    version: 1,
    hideSkeleton: a.hideSkeleton,
    googlyEyes: a.googlyEyes.map((e) => ({ ...e })),
    bodyParts: a.bodyParts.map((p) => ({ ...p })),
    cloth: (a.cloth ?? []).map(cloneCloth),
  };
}
