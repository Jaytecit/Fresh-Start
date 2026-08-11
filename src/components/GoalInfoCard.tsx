import { scoringLegendForTask } from '../brain/taskScore';
import type { GoalDef } from '../goals/catalog';
import { SECRET_GOALS } from '../secrets/definitions';
import type { SkillId } from '../skills/skills';
import { SKILLS } from '../skills/skills';

interface Props {
  goal: GoalDef;
  skill: SkillId;
}

/** B4 — goal info card with scoring legend. */
export function GoalInfoCard({ goal, skill }: Props) {
  const accent = SKILLS[skill].accent;
  const blockedSecrets = SECRET_GOALS.filter((s) =>
    s.blockedTasks.includes(goal.task),
  );
  return (
    <div className="goal-info-card" style={{ borderColor: accent }}>
      <div className="goal-info-header">
        <h3 className="subhead" style={{ margin: 0, color: accent }}>
          {goal.title}
        </h3>
        <span className="hint muted">task · {goal.task}</span>
      </div>
      <p className="hint" style={{ margin: '0.35rem 0 0' }}>
        {goal.blurb}
      </p>
      <p className="hint muted" style={{ margin: '0.35rem 0 0' }}>
        {scoringLegendForTask(goal.task)}
      </p>
      {blockedSecrets.length > 0 && (
        <p className="hint muted" style={{ margin: '0.3rem 0 0' }}>
          Secret discoveries paused while training this goal:{' '}
          {blockedSecrets.map((s) => s.title).join(', ')}
        </p>
      )}
    </div>
  );
}
