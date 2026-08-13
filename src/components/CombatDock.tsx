import {
  BOXING_DIVISIONS,
  type BoxingDivisionId,
} from '../boxing/divisions';
import {
  BOXOBOT_V2T_FITNESS,
  sparringOpponentLabel,
  sparringOpponentsForDivision,
} from '../boxing/sparringOpponents';
import {
  JOUST_SPARRING_OPPONENTS,
  joustSparringOpponentLabel,
} from '../jousting/sparringOpponents';
import { GOAL_CATALOG, type GoalId } from '../goals/catalog';
import type { SavedModel } from '../library/savedModels';
import {
  combatCornerKey,
  parseCombatCornerKey,
  type CombatCornerValue,
  type CombatMode,
} from '../combat/types';
import type { BoxingMatchResult, HeadToHeadResult, JoustMatchResult } from '../sim/simulation';

interface Props {
  mode: CombatMode;
  onModeChange: (mode: CombatMode) => void;
  cornerA: CombatCornerValue;
  cornerB: CombatCornerValue;
  onCornerAChange: (value: CombatCornerValue) => void;
  onCornerBChange: (value: CombatCornerValue) => void;
  workspaceReady: boolean;
  workspaceLabel: string;
  boxingModels: SavedModel[];
  joustingModels: SavedModel[];
  raceModels: SavedModel[];
  divisionId: BoxingDivisionId;
  onDivisionChange: (id: BoxingDivisionId) => void;
  raceGoalId: GoalId;
  onRaceGoalChange: (id: GoalId) => void;
  useCurrentEnv: boolean;
  onUseCurrentEnvChange: (on: boolean) => void;
  envName: string;
  busy: boolean;
  boxingRunning: boolean;
  joustingRunning: boolean;
  raceRunning: boolean;
  boxingProgress: {
    episodeT: number;
    episodeDuration: number;
    points: [number, number];
  } | null;
  joustingProgress: {
    episodeT: number;
    episodeDuration: number;
    totals: [number, number];
    phase: string;
  } | null;
  raceProgress: { episodeT: number; episodeDuration: number } | null;
  lastBoxing: BoxingMatchResult | null;
  lastJoust: JoustMatchResult | null;
  lastRace: HeadToHeadResult | null;
  onStart: () => void;
  onStop: () => void;
  collapsed?: boolean;
}

function CornerSelect({
  label,
  value,
  onChange,
  workspaceReady,
  workspaceLabel,
  saved,
  house,
  disabled,
}: {
  label: string;
  value: CombatCornerValue;
  onChange: (value: CombatCornerValue) => void;
  workspaceReady: boolean;
  workspaceLabel: string;
  saved: SavedModel[];
  house: { id: string; label: string }[];
  disabled: boolean;
}) {
  return (
    <label className="field-row">
      <span>{label}</span>
      <select
        value={combatCornerKey(value)}
        disabled={disabled}
        onChange={(e) => {
          const next = parseCombatCornerKey(e.target.value);
          if (next) onChange(next);
        }}
      >
        <option value="workspace" disabled={!workspaceReady}>
          {workspaceReady
            ? `This workspace · ${workspaceLabel}`
            : 'This workspace (train a brain first)'}
        </option>
        {house.map((h) => (
          <option key={h.id} value={`house:${h.id}`}>
            {h.label}
          </option>
        ))}
        {saved.map((m) => (
          <option key={m.id} value={`saved:${m.id}`}>
            {m.name} · {m.fitness.toFixed(2)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Bottom-dock match controls for Race / Boxing / Joust. */
export function CombatDock({
  mode,
  onModeChange,
  cornerA,
  cornerB,
  onCornerAChange,
  onCornerBChange,
  workspaceReady,
  workspaceLabel,
  boxingModels,
  joustingModels,
  raceModels,
  divisionId,
  onDivisionChange,
  raceGoalId,
  onRaceGoalChange,
  useCurrentEnv,
  onUseCurrentEnvChange,
  envName,
  busy,
  boxingRunning,
  joustingRunning,
  raceRunning,
  boxingProgress,
  joustingProgress,
  raceProgress,
  lastBoxing,
  lastJoust,
  lastRace,
  onStart,
  onStop,
  collapsed,
}: Props) {
  const running =
    (mode === 'boxing' && boxingRunning) ||
    (mode === 'joust' && joustingRunning) ||
    (mode === 'race' && raceRunning);
  const locked = busy || running;

  const boxingHouse = sparringOpponentsForDivision(divisionId).map((item) => ({
    id: item.id,
    label: `Level ${item.level} · ${sparringOpponentLabel(item.id, divisionId)}${
      item.id === 'boxobot-v2t' ? ` · ${BOXOBOT_V2T_FITNESS.toFixed(0)}` : ''
    }`,
  }));
  const joustHouse = JOUST_SPARRING_OPPONENTS.map((item) => ({
    id: item.id,
    label: `Level ${item.level} · ${joustSparringOpponentLabel(item.id, workspaceLabel)}`,
  }));

  const saved =
    mode === 'boxing' ? boxingModels : mode === 'joust' ? joustingModels : raceModels;
  const house = mode === 'boxing' ? boxingHouse : mode === 'joust' ? joustHouse : [];

  let live = '';
  if (mode === 'boxing' && boxingRunning && boxingProgress) {
    live = `${boxingProgress.episodeT.toFixed(1)} / ${boxingProgress.episodeDuration.toFixed(0)}s · A ${boxingProgress.points[0]}–${boxingProgress.points[1]} B`;
  } else if (mode === 'joust' && joustingRunning && joustingProgress) {
    live = `${joustingProgress.phase} · ${joustingProgress.episodeT.toFixed(1)}s · A ${joustingProgress.totals[0].toFixed(1)} · B ${joustingProgress.totals[1].toFixed(1)}`;
  } else if (mode === 'race' && raceRunning && raceProgress) {
    live = `Heat ${raceProgress.episodeT.toFixed(1)}s / ${raceProgress.episodeDuration.toFixed(0)}s`;
  }

  if (collapsed) {
    return (
      <div className="dock-summary">
        <div className="button-row">
          {running ? (
            <button type="button" onClick={onStop}>
              Stop
            </button>
          ) : (
            <button type="button" className="primary" disabled={busy} onClick={onStart}>
              Start
            </button>
          )}
        </div>
        <span className="dock-summary-stats">
          {live ||
            (mode === 'boxing' ? 'Boxing' : mode === 'joust' ? 'Joust' : 'Race')}
        </span>
      </div>
    );
  }

  return (
    <div className="dock-full combat-dock">
      <div className="combat-dock-grid">
        <div className="combat-dock-mode">
          <h3 className="subhead">Mode</h3>
          <div className="button-row wrap">
            {(
              [
                ['race', 'Race'],
                ['boxing', 'Boxing'],
                ['joust', 'Joust'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={mode === id ? 'active' : ''}
                disabled={locked}
                onClick={() => onModeChange(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'boxing' && (
            <label className="field-row" style={{ marginTop: '0.4rem' }}>
              <span>Division</span>
              <select
                value={divisionId}
                disabled={locked}
                onChange={(e) =>
                  onDivisionChange(e.target.value as BoxingDivisionId)
                }
              >
                {BOXING_DIVISIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === 'race' && (
            <>
              <label className="field-row" style={{ marginTop: '0.4rem' }}>
                <span>Goal</span>
                <select
                  value={raceGoalId}
                  disabled={locked}
                  onChange={(e) => onRaceGoalChange(e.target.value as GoalId)}
                >
                  {GOAL_CATALOG.filter(
                    (g) => g.id !== 'dance' && g.id !== 'boxing' && g.id !== 'jousting',
                  ).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={useCurrentEnv}
                  disabled={locked}
                  onChange={(e) => onUseCurrentEnvChange(e.target.checked)}
                />
                <span>Use current environment ({envName})</span>
              </label>
            </>
          )}
        </div>
        <div className="combat-dock-corners">
          <h3 className="subhead">Corners</h3>
          <CornerSelect
            label="Corner A"
            value={cornerA}
            onChange={onCornerAChange}
            workspaceReady={workspaceReady}
            workspaceLabel={workspaceLabel}
            saved={saved}
            house={house}
            disabled={locked}
          />
          <CornerSelect
            label="Corner B"
            value={cornerB}
            onChange={onCornerBChange}
            workspaceReady={workspaceReady}
            workspaceLabel={workspaceLabel}
            saved={saved}
            house={house}
            disabled={locked}
          />
        </div>
        <div className="combat-dock-run">
          <h3 className="subhead">Match</h3>
          <div className="button-row">
            {running ? (
              <button type="button" onClick={onStop}>
                Stop
              </button>
            ) : (
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={onStart}
              >
                {mode === 'joust' ? 'Start pass' : 'Start match'}
              </button>
            )}
          </div>
          {live && <p className="hint">{live}</p>}
          {mode === 'boxing' && lastBoxing && !boxingRunning && (
            <p className="hint">
              Result · A {lastBoxing.score.fighters[0].points}–
              {lastBoxing.score.fighters[1].points} B ·{' '}
              {lastBoxing.winner === null
                ? 'draw'
                : `corner ${lastBoxing.winner === 0 ? 'A' : 'B'} wins`}
            </p>
          )}
          {mode === 'joust' && lastJoust && !joustingRunning && (
            <p className="hint">
              {lastJoust.winner === null
                ? 'Draw'
                : lastJoust.winner === 0
                  ? 'A wins'
                  : 'B wins'}{' '}
              · {lastJoust.reason}
            </p>
          )}
          {mode === 'race' && lastRace && !raceRunning && (
            <p className="hint">
              A {lastRace.fitness[0].toFixed(3)}
              {lastRace.fitness[0] >= lastRace.fitness[1] ? ' · winner' : ''}
              {' · '}
              B {lastRace.fitness[1].toFixed(3)}
              {lastRace.fitness[1] > lastRace.fitness[0] ? ' · winner' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
