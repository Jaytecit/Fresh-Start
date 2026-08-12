/**
 * Creature Library skill categories — auto-place from body type; Disco is manual.
 */
import type { AeroType, CreatureDesign } from '../creature/types';
import { isFeatureEnabled } from '../port/featureFlags';

export type SkillCategoryId =
  | 'walk_jump'
  | 'flying'
  | 'boxer'
  | 'wheeled'
  | 'joust'
  | 'multi'
  | 'disco';

export type FlyingSubcategory = 'wing' | 'glide' | 'parachute';

export interface SkillPlacement {
  category: SkillCategoryId;
  flyingSub?: FlyingSubcategory;
}

export interface SkillCategoryDef {
  id: SkillCategoryId;
  label: string;
  hint: string;
}

export const SKILL_CATEGORIES: readonly SkillCategoryDef[] = [
  {
    id: 'walk_jump',
    label: 'Walking / Jumping',
    hint: 'Legs, hoppers, and general ground locomotion.',
  },
  {
    id: 'flying',
    label: 'Flying',
    hint: 'Aero parts — wing, glide, or parachute.',
  },
  {
    id: 'boxer',
    label: 'Boxer',
    hint: 'Marked gloves (and boxing targets without a lance).',
  },
  {
    id: 'wheeled',
    label: 'Wheeled',
    hint: 'Motor wheels.',
  },
  {
    id: 'joust',
    label: 'Joust',
    hint: 'Marked lance.',
  },
  {
    id: 'multi',
    label: 'Multi',
    hint: 'Free mixed bucket — more than one skill type, or a manual mix.',
  },
  {
    id: 'disco',
    label: 'Disco',
    hint: 'Dance bodies. Never auto-placed; move here by hand.',
  },
];

export const FLYING_SUBCATEGORIES: readonly {
  id: FlyingSubcategory;
  label: string;
}[] = [
  { id: 'wing', label: 'Wing' },
  { id: 'glide', label: 'Glide' },
  { id: 'parachute', label: 'Parachute' },
];

const PRESET_OVERRIDE_KEY = 'freshstart_preset_skill_categories_v1';

export interface SkillTypeFlags {
  walkJump: boolean;
  flying: boolean;
  flyingSubs: ReadonlySet<FlyingSubcategory>;
  boxer: boolean;
  wheeled: boolean;
  joust: boolean;
}

function aeroSubForBone(type: AeroType | undefined): FlyingSubcategory {
  if (type === 'wing') return 'wing';
  if (type === 'parachute') return 'parachute';
  return 'glide';
}

/** Body-type flags used for auto-place and valid moves. Disco is never inferred. */
export function skillTypeFlags(design: CreatureDesign): SkillTypeFlags {
  let wheeled = 0;
  let gloves = 0;
  let hitTargets = 0;
  let lances = 0;
  const flyingSubs = new Set<FlyingSubcategory>();
  let aeroArea = 0;
  for (const j of design.joints) {
    if (j.isWheel) wheeled++;
    if (j.isGlove) gloves++;
    if (j.isHitTarget) hitTargets++;
    if (j.isLance) lances++;
  }
  for (const b of design.bones) {
    const area = b.aeroArea ?? 0;
    if (area <= 0) continue;
    aeroArea += area;
    flyingSubs.add(aeroSubForBone(b.aeroType));
  }
  const flying = aeroArea > 0.05;
  const joust = lances > 0;
  const boxer = gloves > 0 || (hitTargets > 0 && !joust);
  return {
    walkJump: true,
    flying,
    flyingSubs,
    boxer,
    wheeled: wheeled > 0,
    joust,
  };
}

function dominantFlyingSub(
  flags: SkillTypeFlags,
): FlyingSubcategory | undefined {
  if (!flags.flying || flags.flyingSubs.size === 0) return undefined;
  if (flags.flyingSubs.has('wing')) return 'wing';
  if (flags.flyingSubs.has('parachute')) return 'parachute';
  return 'glide';
}

function specializedCount(flags: SkillTypeFlags): number {
  return (
    (flags.flying ? 1 : 0) +
    (flags.boxer ? 1 : 0) +
    (flags.wheeled ? 1 : 0) +
    (flags.joust ? 1 : 0)
  );
}

/** Auto category from morphology. Disco is never chosen here. */
export function inferSkillPlacement(design: CreatureDesign): SkillPlacement {
  const flags = skillTypeFlags(design);
  const n = specializedCount(flags);
  if (n >= 2) return { category: 'multi' };
  if (flags.flying) {
    return { category: 'flying', flyingSub: dominantFlyingSub(flags) };
  }
  if (flags.boxer) return { category: 'boxer' };
  if (flags.wheeled) return { category: 'wheeled' };
  if (flags.joust) return { category: 'joust' };
  return { category: 'walk_jump' };
}

export function isValidSkillPlacement(
  design: CreatureDesign,
  placement: SkillPlacement,
): boolean {
  if (placement.category === 'disco' || placement.category === 'multi') {
    return true;
  }
  if (placement.category === 'walk_jump') return true;
  const flags = skillTypeFlags(design);
  if (placement.category === 'boxer') return flags.boxer;
  if (placement.category === 'wheeled') return flags.wheeled;
  if (placement.category === 'joust') return flags.joust;
  if (placement.category === 'flying') {
    if (!flags.flying) return false;
    if (!placement.flyingSub) return true;
    return flags.flyingSubs.has(placement.flyingSub);
  }
  return false;
}

export function resolveSkillPlacement(
  design: CreatureDesign,
  override?: SkillPlacement | null,
): SkillPlacement {
  if (override && isValidSkillPlacement(design, override)) {
    if (override.category === 'flying' && !override.flyingSub) {
      return {
        category: 'flying',
        flyingSub: dominantFlyingSub(skillTypeFlags(design)),
      };
    }
    return { ...override };
  }
  return inferSkillPlacement(design);
}

export function skillCategoryLabel(id: SkillCategoryId): string {
  return SKILL_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function flyingSubLabel(id: FlyingSubcategory): string {
  return FLYING_SUBCATEGORIES.find((s) => s.id === id)?.label ?? id;
}

export function placementKey(p: SkillPlacement): string {
  if (p.category === 'flying') return `flying:${p.flyingSub ?? 'glide'}`;
  return p.category;
}

export function parsePlacementKey(key: string): SkillPlacement | null {
  if (key.startsWith('flying:')) {
    const sub = key.slice('flying:'.length);
    if (sub === 'wing' || sub === 'glide' || sub === 'parachute') {
      return { category: 'flying', flyingSub: sub };
    }
    return { category: 'flying' };
  }
  if (
    key === 'walk_jump' ||
    key === 'boxer' ||
    key === 'wheeled' ||
    key === 'joust' ||
    key === 'multi' ||
    key === 'disco'
  ) {
    return { category: key };
  }
  return null;
}

export function validPlacementOptions(design: CreatureDesign): SkillPlacement[] {
  const flags = skillTypeFlags(design);
  const out: SkillPlacement[] = [{ category: 'walk_jump' }];
  if (flags.flying) {
    for (const sub of FLYING_SUBCATEGORIES) {
      if (flags.flyingSubs.has(sub.id)) {
        out.push({ category: 'flying', flyingSub: sub.id });
      }
    }
  }
  if (flags.boxer) out.push({ category: 'boxer' });
  if (flags.wheeled) out.push({ category: 'wheeled' });
  if (flags.joust) out.push({ category: 'joust' });
  out.push({ category: 'multi' });
  out.push({ category: 'disco' });
  return out;
}

export function optionLabel(p: SkillPlacement): string {
  if (p.category === 'flying') {
    return p.flyingSub
      ? `Flying · ${flyingSubLabel(p.flyingSub)}`
      : 'Flying';
  }
  return skillCategoryLabel(p.category);
}

function readPresetOverrides(): Record<string, SkillPlacement> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PRESET_OVERRIDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SkillPlacement>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePresetOverrides(map: Record<string, SkillPlacement>): void {
  localStorage.setItem(PRESET_OVERRIDE_KEY, JSON.stringify(map));
}

export function loadAllPresetSkillOverrides(): Record<string, SkillPlacement> {
  return readPresetOverrides();
}

export function loadPresetSkillOverride(
  presetName: string,
): SkillPlacement | null {
  const p = readPresetOverrides()[presetName];
  return p?.category ? p : null;
}

export function savePresetSkillOverride(
  presetName: string,
  placement: SkillPlacement | null,
): void {
  const map = readPresetOverrides();
  if (!placement) delete map[presetName];
  else map[presetName] = placement;
  writePresetOverrides(map);
}

export function libraryCategoriesEnabled(): boolean {
  return isFeatureEnabled('librarySkillCategories');
}
