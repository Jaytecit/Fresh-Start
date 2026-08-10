import type { EnvironmentPackage } from '../library/environmentPackages';
import type { GoalDef, GoalId } from '../goals/catalog';
import type { ZoneId } from '../zones/zones';
import { ZONE_ORDER, ZONES } from '../zones/zones';
import { EnvPicker } from './EnvPicker';
import { GoalPicker } from './GoalPicker';

interface Props {
  zone: ZoneId;
  onSelectZone: (id: ZoneId) => void;
  showZoneTabs: boolean;
  showDiscoZone: boolean;
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

/** Full-width Zone / Goal / Env band above the sandbox body. */
export function ContextStrip({
  zone,
  onSelectZone,
  showZoneTabs,
  showDiscoZone,
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
  if (!showZoneTabs && !showGoals && !showEnv) return null;

  const zoneIds = ZONE_ORDER.filter(
    (id) => id !== 'disco' || showDiscoZone,
  );

  return (
    <div className="context-strip" aria-label="Training context">
      {showZoneTabs && (
        <div className="context-strip-zones">
          <span className="context-strip-label">Zone</span>
          <div className="zone-tabs context-strip-zone-tabs" role="tablist">
            {zoneIds.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={zone === id}
                className={zone === id ? 'active' : ''}
                style={
                  zone === id
                    ? {
                        borderColor: ZONES[id].accent,
                        color: ZONES[id].accent,
                      }
                    : undefined
                }
                onClick={() => onSelectZone(id)}
                title={ZONES[id].description}
              >
                {ZONES[id].shortLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="context-strip-goals">
        {showGoals && zone !== 'disco' ? (
          <>
            <span className="context-strip-label">Goal</span>
            <GoalPicker
              goals={goals}
              selectedId={goalId}
              onSelect={onSelectGoal}
              compact
            />
          </>
        ) : showZoneTabs && zone === 'disco' ? (
          <p className="hint muted context-strip-disco-hint">
            Disco — track &amp; learn live in the Zone panel
          </p>
        ) : null}
      </div>

      {showEnv && (
        <div className="context-strip-env">
          <EnvPicker
            packages={envPackages}
            selectedPackageId={selectedPackageId}
            activeName={activeEnvName}
            disabled={envDisabled}
            onSelect={onSelectEnv}
            compact
          />
        </div>
      )}
    </div>
  );
}
