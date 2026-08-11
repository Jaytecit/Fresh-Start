/** Product skill metadata (B1). No physics — UI / task routing only. */

export type SkillId =
  | 'flying'
  | 'motor'
  | 'walking'
  | 'jumping'
  | 'free'
  | 'disco';

export interface SkillDef {
  id: SkillId;
  title: string;
  shortLabel: string;
  description: string;
  accent: string;
  /** Default evolve task when this skill is active. */
  defaultTask: import('../brain/types').TaskId;
}

export const SKILL_ORDER: SkillId[] = [
  'walking',
  'jumping',
  'flying',
  'motor',
  'free',
  'disco',
];

export const SKILLS: Record<SkillId, SkillDef> = {
  walking: {
    id: 'walking',
    title: 'Walking',
    shortLabel: 'Walk',
    description: 'Locomotion — flat run or rough hills.',
    accent: '#3d9a6a',
    defaultTask: 'run',
  },
  jumping: {
    id: 'jumping',
    title: 'Jumping',
    shortLabel: 'Jump',
    description: 'Peak height and hang time.',
    accent: '#d48a3a',
    defaultTask: 'jump',
  },
  flying: {
    id: 'flying',
    title: 'Flying',
    shortLabel: 'Fly',
    description: 'Airtime with aero-like lift/drag on tagged bones.',
    accent: '#4a8fd4',
    defaultTask: 'flight',
  },
  motor: {
    id: 'motor',
    title: 'Motor',
    shortLabel: 'Motor',
    description: 'Wheeled forward drive via motor torque.',
    accent: '#d4a04a',
    defaultTask: 'motor',
  },
  free: {
    id: 'free',
    title: 'Free',
    shortLabel: 'Free',
    description: 'Sandbox — pick any task; no equipment gates yet.',
    accent: '#9a7ad4',
    defaultTask: 'run',
  },
  disco: {
    id: 'disco',
    title: 'Disco',
    shortLabel: 'Disco',
    description:
      'Audio-reactive dance floor — lighting FX, side walls, frequency → muscle routing.',
    accent: '#e05aad',
    /** Placeholder; disco skill does not evolve against a task. */
    defaultTask: 'run',
  },
};

const SKILL_STORAGE_KEY = 'freshstart_active_skill_v1';
const LEGACY_ZONE_STORAGE_KEY = 'freshstart_active_zone_v1';

export function loadActiveSkill(): SkillId {
  try {
    const raw =
      localStorage.getItem(SKILL_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_ZONE_STORAGE_KEY);
    if (raw && raw in SKILLS) {
      if (!localStorage.getItem(SKILL_STORAGE_KEY)) {
        localStorage.setItem(SKILL_STORAGE_KEY, raw);
      }
      return raw as SkillId;
    }
  } catch {
    /* ignore */
  }
  return 'walking';
}

export function saveActiveSkill(skill: SkillId): void {
  try {
    localStorage.setItem(SKILL_STORAGE_KEY, skill);
  } catch {
    /* ignore */
  }
}
