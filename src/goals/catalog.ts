/**
 * E1 — Goal catalog framework (thin wrappers over TaskId + skill membership).
 * E2 — Skill routing without eligibility gates.
 * E6 — Expanded skill goals (Rapier-native scoring in taskScore.ts).
 */
import type { TaskId } from '../brain/types';
import type { SkillId } from '../skills/skills';

export type GoalId = TaskId;

export interface GoalDef {
  id: GoalId;
  task: TaskId;
  title: string;
  blurb: string;
  /** Skills that list this goal. `free` always includes every evolve goal. */
  skills: SkillId[];
}

export const GOAL_CATALOG: GoalDef[] = [
  {
    id: 'run',
    task: 'run',
    title: 'Run',
    blurb: 'Forward locomotion with foot-lift quality.',
    skills: ['walking', 'free'],
  },
  {
    id: 'speed',
    task: 'speed',
    title: 'Max Speed',
    blurb: 'Peak burst plus travel on flat ground.',
    skills: ['walking', 'free'],
  },
  {
    id: 'sprint',
    task: 'sprint',
    title: 'Sprint Finish',
    blurb:
      'Race checkpoints to the finish — faster finish scores more. Place start/finish markers in Course.',
    skills: ['walking', 'free'],
  },
  {
    id: 'stay',
    task: 'stay',
    title: 'Stay Tall',
    blurb: 'Sustain a tall, supported posture.',
    skills: ['walking', 'free'],
  },
  {
    id: 'rough',
    task: 'rough',
    title: 'Rough terrain',
    blurb: 'Forward locomotion over hills with foot-lift quality.',
    skills: ['walking', 'free'],
  },
  {
    id: 'jump',
    task: 'jump',
    title: 'Jump Height',
    blurb: 'Peak height and hang time.',
    skills: ['jumping', 'free'],
  },
  {
    id: 'hang',
    task: 'hang',
    title: 'Hang Time',
    blurb: 'Maximize airborne time in one jump.',
    skills: ['jumping', 'free'],
  },
  {
    id: 'longjump',
    task: 'longjump',
    title: 'Long Jump',
    blurb: 'Jump as far right as you can.',
    skills: ['jumping', 'free'],
  },
  {
    id: 'clear_bar',
    task: 'clear_bar',
    title: 'Clear the Bar',
    blurb: 'Reach a target peak height — clear the bar for a bonus.',
    skills: ['jumping', 'free'],
  },
  {
    id: 'hop',
    task: 'hop',
    title: 'Hop Series',
    blurb: 'Many short bounces beat one mega-jump. Foot-lifts and air time score.',
    skills: ['jumping', 'free'],
  },
  {
    id: 'climb',
    task: 'climb',
    title: 'Climb',
    blurb: 'Ascend the step course.',
    skills: ['free'],
  },
  {
    id: 'motor',
    task: 'motor',
    title: 'Motor',
    blurb: 'Wheeled forward drive.',
    skills: ['motor', 'free'],
  },
  {
    id: 'motor_ramp',
    task: 'motor_ramp',
    title: 'Ramp Jump',
    blurb: 'Drive a wheeled body up a ramp and score air + forward progress.',
    skills: ['motor', 'free'],
  },
  {
    id: 'motor_gap',
    task: 'motor_gap',
    title: 'Gap Cross',
    blurb: 'Clear a pit gap on wheels — distance past the gap scores most.',
    skills: ['motor', 'free'],
  },
  {
    id: 'motor_hurdles',
    task: 'motor_hurdles',
    title: 'Hurdles',
    blurb: 'Roll through a sequence of low obstacles; forward progress wins.',
    skills: ['motor', 'free'],
  },
  {
    id: 'motor_sprint',
    task: 'motor_sprint',
    title: 'Motor Sprint',
    blurb:
      'Wheeled race — checkpoints and finish time when markers are placed in Course.',
    skills: ['motor', 'free'],
  },
  {
    id: 'flight',
    task: 'flight',
    title: 'Flight',
    blurb:
      'Sustain altitude with aero parts — mean height beats one-flap coasts.',
    skills: ['flying', 'free'],
  },
  {
    id: 'flight_height',
    task: 'flight_height',
    title: 'Flight Height',
    blurb:
      'Chase peak and mean altitude (any aero type — or none). Complements wing/glider/chute specialists.',
    skills: ['flying', 'free'],
  },
  {
    id: 'flight_distance',
    task: 'flight_distance',
    title: 'Flight Distance',
    blurb:
      'Cover airborne range (any aero type — or none). Complements wing/glider/chute specialists.',
    skills: ['flying', 'free'],
  },
  {
    id: 'flight_wing',
    task: 'flight_wing',
    title: 'Wing Flight',
    blurb:
      'Climb and sustain with wings. Place a launch pad + landing zone in Course for the pad→fly→land loop.',
    skills: ['flying', 'free'],
  },
  {
    id: 'flight_glider',
    task: 'flight_glider',
    title: 'Glider Range',
    blurb:
      'Cover distance while airborne with a glider. Launch pad + landing zone recommended.',
    skills: ['flying', 'free'],
  },
  {
    id: 'flight_para',
    task: 'flight_para',
    title: 'Parachute Drop',
    blurb:
      'Soft descent under a parachute and stick the landing zone. Launch pad + landing zone recommended.',
    skills: ['flying', 'free'],
  },
  {
    id: 'boxing',
    task: 'boxing',
    title: 'Boxing Points',
    blurb:
      'Land accurate, controlled glove hits on division-matched opponent targets.',
    skills: ['boxing'],
  },
  {
    id: 'jousting',
    task: 'jousting',
    title: 'Jousting Pass',
    blurb:
      'Charge from opposite ends of a long lane. Winner is the higher scorecard: lance hit, stay up, unhorse, knockback.',
    skills: ['jousting'],
  },
  {
    id: 'dance',
    task: 'dance',
    title: 'Dance',
    blurb:
      'Multi-track curriculum: imitate reactive disco, then refine freestyle for upright + beat sync (solo, Disco only).',
    skills: ['disco'],
  },
];

export function getGoal(id: GoalId): GoalDef {
  const g = GOAL_CATALOG.find((x) => x.id === id);
  if (!g) throw new Error(`Unknown goal ${id}`);
  return g;
}

/** Goals visible for a skill (`free` shows evolve goals; `disco` is audio-only). */
export function goalsForSkill(skill: SkillId): GoalDef[] {
  // H6 dance is imitation-trained in Disco, not GA-evolved.
  if (skill === 'free') {
    return GOAL_CATALOG.filter((g) => g.id !== 'dance' && g.id !== 'boxing' && g.id !== 'jousting');
  }
  if (skill === 'disco') return [];
  return GOAL_CATALOG.filter((g) => g.skills.includes(skill));
}

/** Default goal when entering a skill. */
export function defaultGoalForSkill(skill: SkillId): GoalDef {
  const list = goalsForSkill(skill);
  return list[0] ?? GOAL_CATALOG[0];
}

/** @deprecated Use goalsForSkill */
export const goalsForZone = goalsForSkill;
/** @deprecated Use defaultGoalForSkill */
export const defaultGoalForZone = defaultGoalForSkill;

const GOAL_STORAGE_KEY = 'freshstart_active_goal_v1';

export function loadActiveGoalId(fallback: GoalId = 'run'): GoalId {
  try {
    const raw = localStorage.getItem(GOAL_STORAGE_KEY);
    if (raw && GOAL_CATALOG.some((g) => g.id === raw)) return raw as GoalId;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function saveActiveGoalId(id: GoalId): void {
  try {
    localStorage.setItem(GOAL_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
