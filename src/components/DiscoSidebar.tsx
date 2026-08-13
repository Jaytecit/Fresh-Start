import { designHasActuators } from "../brain/driveGroups";
import type { CreatureDesign } from "../creature/types";
import { isFeatureEnabled } from "../port/featureFlags";

interface Props {
  hasCreature: boolean;
  design: CreatureDesign;
}

/** Disco mode sidebar — dance help. Track/learn controls live in the Disco dock. */
export function DiscoSidebar({ hasCreature, design }: Props) {
  return (
    <div className="panel-stack">
      <section>
        <h2>Disco</h2>
        <p className="hint muted">
          Music-reactive dance. This is not Evolve — pick another Skill on
          the strip to return to Train.
        </p>
        <div className="train-help-strip disco-help-strip">
          <strong>How to dance</strong>
          <ol>
            <li>Load a track in the Disco dock under the canvas</li>
            <li>Press Play, then Start dancing</li>
            <li>Route frequency bands to muscles (or drive groups)</li>
            {isFeatureEnabled("discoDanceLearn") && (
              <li>Record a buffer, then Learn a dancer</li>
            )}
            <li>Save dancer / setups from the dock Files</li>
          </ol>
        </div>
        {!hasCreature && (
          <p className="hint muted">
            Need a body with muscles. Draw or load one in Build, then come
            back.
          </p>
        )}
        {hasCreature &&
          !designHasActuators(
            design,
            isFeatureEnabled("motorWheels"),
          ) && (
            <p className="hint muted">
              Add at least one muscle or wheel in Build so the track can
              drive the body.
            </p>
          )}
        <p className="hint muted">
          Track, routing, slots, and learn live in the Disco dock — not in
          this sidebar.
        </p>
      </section>
    </div>
  );
}
