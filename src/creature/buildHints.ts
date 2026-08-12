/**
 * Skill-first build guidance shown in Creature builder / Skill tab.
 * Soft tips only — does not gate editing.
 */
import type { SkillId } from '../skills/skills';

export interface SkillBuildHints {
  essentials: string[];
  tip: string;
}

export const SKILL_BUILD_HINTS: Record<SkillId, SkillBuildHints> = {
  walking: {
    essentials: [
      'Mark at least one joint as a foot for ground scoring.',
      'Add muscles between bones so the brain can drive gait.',
    ],
    tip: 'Bias the body toward +X — run goals reward forward travel.',
  },
  jumping: {
    essentials: [
      'Mark feet so lift and landing rewards can fire.',
      'Use strong hip/leg muscles; keep mass off the head.',
    ],
    tip: 'A compact stance with clear foot marks trains jumps more cleanly.',
  },
  flying: {
    essentials: [
      'Author wing / glider / parachute aero on bones (Flight tools).',
      'Launch tower or pads help — aero alone will not invent height.',
    ],
    tip: 'Pair aero area with enough muscles to pitch and stall-recover.',
  },
  motor: {
    essentials: [
      'Mark joints as wheels and set motor strength.',
      'Keep at least one driven wheel touching the ground.',
    ],
    tip: 'Wheeled goals ignore foot marks — focus on wheel mass and grip.',
  },
  free: {
    essentials: [
      'Pick any morphology; goals still expect actuators (muscle or wheel).',
      'Use the strip Goal picker after the body feels ready.',
    ],
    tip: 'Free is for experiments — switch to a focused skill when you want tighter tips.',
  },
  boxing: {
    essentials: [
      'Mark 2 gloves and 1–4 hit targets (division rules apply).',
      'Mark feet as required by the division; no wheels or aero.',
      'Build facing right (+X). The far corner is mirrored automatically.',
    ],
    tip: 'Train from the Train tab once the fighter meets the selected division rules. Start against the Dummy, then switch to BoxoBot V2T when you want a live sparring partner.',
  },
  disco: {
    essentials: [
      'Any actuated body works; dance brains are learned in Disco, not GA Train.',
      'Mark a head if you want look-at / expressiveness later.',
    ],
    tip: 'Record motion on the Skill → Disco panel, then learn a dance brain.',
  },
};

export function buildHintsForSkill(skill: SkillId): SkillBuildHints {
  return SKILL_BUILD_HINTS[skill];
}
