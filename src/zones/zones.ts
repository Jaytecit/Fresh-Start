/** @deprecated Prefer `src/skills/skills`. Thin re-exports for transition. */
export {
  SKILLS as ZONES,
  SKILL_ORDER as ZONE_ORDER,
  loadActiveSkill as loadActiveZone,
  saveActiveSkill as saveActiveZone,
  type SkillId as ZoneId,
  type SkillDef as ZoneDef,
} from '../skills/skills';
