import { boxingEligibility, type BoxingDivisionId } from "../boxing/divisions";
import { buildHintsForSkill } from "../creature/buildHints";
import type { CreatureDesign } from "../creature/types";
import { GoalInfoCard } from "./GoalInfoCard";
import { getGoal, type GoalId } from "../goals/catalog";
import { joustingEligibility } from "../jousting/eligibility";
import { isFeatureEnabled } from "../port/featureFlags";
import { SKILLS, type SkillId } from "../skills/skills";
import { CollapsiblePanel } from "./CollapsiblePanel";

interface Props {
  skill: SkillId;
  design: CreatureDesign;
  goalId: GoalId;
  boxingDivisionId: BoxingDivisionId;
  feelNotesOpen: boolean;
  onFeelNotesToggle: () => void;
}

/** Build mode sidebar — skill essentials and feel notes. Dock holds tools. */
export function CreatureBuilderPanel({
  skill,
  design,
  goalId,
  boxingDivisionId,
  feelNotesOpen,
  onFeelNotesToggle,
}: Props) {
  const hints = buildHintsForSkill(skill);
  const boxingLine =
    skill === "boxing" && isFeatureEnabled("boxingMode")
      ? boxingEligibility(design, boxingDivisionId)
      : null;
  const joustLine =
    skill === "jousting" && isFeatureEnabled("joustingMode")
      ? joustingEligibility(design)
      : null;

  return (
    <div className="panel-stack">
      <section>
        <h2>Build</h2>
        <div
          className="hint"
          style={{
            marginBottom: "0.65rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid rgba(120,140,170,0.2)",
          }}
        >
          <p>
            Building for: <strong>{SKILLS[skill].title}</strong>
          </p>
          <p className="hint muted">{SKILLS[skill].description}</p>
          <p className="subhead" style={{ margin: "0.45rem 0 0.25rem" }}>
            Build essentials
          </p>
          <ul className="stats">
            {hints.essentials.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="hint muted">{hints.tip}</p>
          {boxingLine && (
            <p className="hint">
              {boxingLine.eligible
                ? `Division ready · ${boxingLine.metrics.gloves} gloves · ${boxingLine.metrics.targets} targets`
                : `Division gaps: ${boxingLine.reasons[0] ?? "check marks"}`}
            </p>
          )}
          {joustLine && (
            <p className="hint">
              {joustLine.eligible
                ? `Joust ready · ${joustLine.metrics.lances} lance · ${joustLine.metrics.targets} targets`
                : `Joust gaps: ${joustLine.reasons[0] ?? "check marks"}`}
            </p>
          )}
        </div>
        {skill === "boxing" && isFeatureEnabled("boxingMode") ? (
          <p className="hint muted">
            Train this body in Train. Play a match in Combat.
          </p>
        ) : skill === "jousting" && isFeatureEnabled("joustingMode") ? (
          <p className="hint muted">
            Train this body in Train. Play a pass in Combat.
          </p>
        ) : skill === "disco" && isFeatureEnabled("discoMode") ? (
          <p className="hint muted">
            Record, learn, and dance from the Disco dock under the canvas.
          </p>
        ) : (
          isFeatureEnabled("goalCatalog") && (
            <GoalInfoCard goal={getGoal(goalId)} skill={skill} />
          )
        )}
        <p className="hint muted" style={{ marginTop: "0.45rem" }}>
          Load, name, and save this body from the Build dock. Save trained
          lives on the Train dock.
        </p>
      </section>
      <CollapsiblePanel
        title="Feel notes"
        open={feelNotesOpen}
        onToggle={onFeelNotesToggle}
      >
        <p className="hint muted">
          Muscles are always-on springs toward rest length, plus active
          contract / expand forces. Brace with triangles; serial chains
          flop. Parent soft-body physics is never imported.
        </p>
      </CollapsiblePanel>
    </div>
  );
}
