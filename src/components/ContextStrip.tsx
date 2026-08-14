import { Fragment } from 'react';
import type { EnvironmentPackage } from '../library/environmentPackages';
import type { GoalDef, GoalId } from '../goals/catalog';
import type { SkillId } from '../skills/skills';
import { SKILL_ORDER, SKILLS } from '../skills/skills';
import { EnvPicker } from './EnvPicker';
import { GoalPicker } from './GoalPicker';
import { HelpTip } from './HelpTip';

export type StripSelectOption = {
  value: string;
  label: string;
};

export type StripSelectGroup = {
  label?: string;
  options: StripSelectOption[];
};

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
  showBodyBrain?: boolean;
  bodyValue?: string;
  bodyGroups?: StripSelectGroup[];
  onSelectBody?: (key: string) => void;
  brainValue?: string;
  brainOptions?: StripSelectOption[];
  onSelectBrain?: (id: string) => void;
  bodyBrainDisabled?: boolean;
}

function StripSelect({
  label,
  tip,
  value,
  groups,
  disabled,
  onSelect,
  ariaLabel,
}: {
  label: string;
  tip: string;
  value: string;
  groups: StripSelectGroup[];
  disabled?: boolean;
  onSelect: (value: string) => void;
  ariaLabel: string;
}) {
  const flat = groups.flatMap((g) => g.options);
  const resolved =
    flat.some((o) => o.value === value) ? value : (flat[0]?.value ?? '');

  return (
    <div className="context-strip-picker">
      <HelpTip tip={tip}>
        <span className="context-strip-label">{label}</span>
      </HelpTip>
      <div className="env-picker env-picker-compact">
        <label className="field-row">
          <select
            value={resolved}
            disabled={disabled || flat.length === 0}
            onChange={(e) => onSelect(e.target.value)}
            aria-label={ariaLabel}
          >
            {groups.map((group, i) =>
              group.label ? (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <Fragment key={i}>
                  {group.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Fragment>
              ),
            )}
          </select>
        </label>
      </div>
    </div>
  );
}

/** Full-width Skill / Goal / Environment band above the sandbox body. */
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
  showBodyBrain,
  bodyValue = 'custom',
  bodyGroups = [],
  onSelectBody,
  brainValue = '__none__',
  brainOptions = [],
  onSelectBrain,
  bodyBrainDisabled,
}: Props) {
  if (!showSkillTabs && !showGoals && !showEnv && !showBodyBrain) return null;

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
            Disco — you are in Disco. Track &amp; learn live in the dock below
          </p>
        ) : null}
      </div>

      {(showEnv || showBodyBrain) && (
        <div className="context-strip-pickers">
          {showEnv && (
            <div className="context-strip-picker">
              <HelpTip tip="Environment is the course or ground your creature trains on. Flat is easiest; custom courses live in Course.">
                <span className="context-strip-label">Environment</span>
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
          {showBodyBrain && (
            <>
              <StripSelect
                label="Body"
                tip="Body is the creature in the workspace. Presets and saved library bodies appear here."
                value={bodyValue}
                groups={bodyGroups}
                disabled={bodyBrainDisabled}
                onSelect={(key) => onSelectBody?.(key)}
                ariaLabel="Body for training"
              />
              <StripSelect
                label="Brain"
                tip="Brains trained on the selected body. The list stays empty until this creature has a saved brain."
                value={brainValue}
                groups={[{ options: brainOptions }]}
                disabled={bodyBrainDisabled}
                onSelect={(id) => onSelectBrain?.(id)}
                ariaLabel="Brain for the selected body"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
