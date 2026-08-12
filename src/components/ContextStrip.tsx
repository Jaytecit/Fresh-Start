import type { EnvironmentPackage } from '../library/environmentPackages';
import type { GoalDef, GoalId } from '../goals/catalog';
import type { SkillId } from '../skills/skills';
import { SKILL_ORDER, SKILLS } from '../skills/skills';
import { EnvPicker } from './EnvPicker';
import { GoalPicker } from './GoalPicker';
import { HelpTip } from './HelpTip';

interface Props {
  skill: SkillId;
  onSelectSkill: (id: SkillId) => void;
  showSkillTabs: boolean;
  showDiscoSkill: boolean;
  showBoxingSkill: boolean;
  showJoustingSkill: boolean;
  goals: GoalDef[];
  goalId: GoalId;
  onSelectGoal: (id: GoalId) => void;
  showGoals: boolean;
  envPackages: EnvironmentPackage[];
  selectedPackageId: string | null;
  activeEnvName: string;
  onSelectEnv: (pkg: EnvironmentPackage) => void;
  showEnv: boolean;
  envDisabled?: boolean;
}

/** Full-width Skill / Goal / Env band above the sandbox body. */
export function ContextStrip({
  skill,
  onSelectSkill,
  showSkillTabs,
  showDiscoSkill,
  showBoxingSkill,
  showJoustingSkill,
  goals,
  goalId,
  onSelectGoal,
  showGoals,
  envPackages,
  selectedPackageId,
  activeEnvName,
  onSelectEnv,
  showEnv,
  envDisabled,
}: Props) {
  if (!showSkillTabs && !showGoals && !showEnv) return null;

  const skillIds = SKILL_ORDER.filter(
    (id) =>
      (id !== 'disco' || showDiscoSkill) &&
      (id !== 'boxing' || showBoxingSkill) &&
      (id !== 'jousting' || showJoustingSkill),
  );

  return (
    <div className="context-strip" aria-label="Training context">
      {showSkillTabs && (
        <div className="context-strip-skills">
          <HelpTip
            tip="Skill picks the family of challenges — walk, jump, fly, motor, boxing, jousting, free play, or disco. Goals below change to match."
          >
            <span className="context-strip-label">Skill</span>
          </HelpTip>
          <div className="skill-tabs context-strip-skill-tabs" role="tablist">
            {skillIds.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={skill === id}
                className={skill === id ? 'active' : ''}
                style={
                  skill === id
                    ? {
                        borderColor: SKILLS[id].accent,
                        color: SKILLS[id].accent,
                      }
                    : undefined
                }
                onClick={() => onSelectSkill(id)}
              >
                {SKILLS[id].shortLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="context-strip-goals">
        {showGoals && skill !== 'disco' ? (
          <>
            <HelpTip tip="Goal is what training scores for — distance, height, finish time, soft landing, and so on.">
              <span className="context-strip-label">Goal</span>
            </HelpTip>
            <GoalPicker
              goals={goals}
              selectedId={goalId}
              onSelect={onSelectGoal}
              compact
            />
          </>
        ) : showSkillTabs && skill === 'disco' ? (
          <p className="hint muted context-strip-disco-hint">
            Disco — track &amp; learn live in the Skill panel
          </p>
        ) : null}
      </div>

      {showEnv && (
        <div className="context-strip-env">
          <HelpTip tip="Env is the course or ground your creature trains on. Flat is easiest; custom courses live in Environment builder.">
            <span className="context-strip-label">Env</span>
          </HelpTip>
          <EnvPicker
            packages={envPackages}
            selectedPackageId={selectedPackageId}
            activeName={activeEnvName}
            disabled={envDisabled}
            onSelect={onSelectEnv}
            compact
            hideLabel
          />
        </div>
      )}
    </div>
  );
}
